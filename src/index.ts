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
import { NotificationEngine } from './services/notifications/engine';
import { BotContext } from './bot/core/types';
import prisma from './db/prisma';

const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

// Global error handlers so the bot never dies silently
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

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
  logger.info('Redis and Database connected');

  // FIX: delete any old webhook, then start long polling
  await bot.telegram.deleteWebhook();
  await bot.launch({ dropPendingUpdates: true });
  logger.info('Quite bot launched (long polling)');

  scanner.start();
  sellEngine.start();
  copyEngine.start();

  sellEngine.on('sell', async (positionId: string, reason: string) => {
    const pos = await prisma.position.findUnique({ where: { id: positionId } });
    if (pos) {
      notifier.send(pos.userId, 'sell_executed', `Position closed: ${reason}`);
    }
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
