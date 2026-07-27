import { Telegraf } from 'telegraf';
import { env } from './config/env';
import logger from './core/logger';
import { sessionMiddleware } from './bot/middlewares/session';
import { authMiddleware } from './bot/middlewares/auth';
import { rateLimitMiddleware } from './bot/middlewares/rate-limit';
import { setupBotRoutes } from './bot';
import { scanner } from './services/scanner/engine';
import { SellEngine } from './services/trading/sell-engine';
import { CopyTradeEngine } from './services/copytrade/engine';
import { getRedis } from './core/redis-client';
import prisma from './db/prisma';
import { NotificationEngine } from './services/notifications/engine';
import { BotContext } from './bot/core/types';

const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

bot.use(sessionMiddleware);
bot.use(authMiddleware);
bot.use(rateLimitMiddleware);

setupBotRoutes(bot);

const sellEngine = new SellEngine();
const copyEngine = new CopyTradeEngine();
const notifier = new NotificationEngine(bot);

(async () => {
  await getRedis().connect();
  await prisma.$connect();

  await bot.launch();
  logger.info('Quite bot launched');

  scanner.start();
  sellEngine.start();
  copyEngine.start();

  sellEngine.on('sell', async (positionId, reason) => {
    const pos = await prisma.position.findUnique({ where: { id: positionId } });
    if (pos) notifier.send(pos.userId, 'sell_executed', `Position closed: ${reason}`);
  });

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    scanner.stop();
    sellEngine.stop();
    copyEngine.stop();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
  });
})().catch(err => logger.error('Startup error', err));
