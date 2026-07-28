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

// Catch all errors so the bot never dies
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
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

async function start() {
  try {
    // Connect services
    const redis = getRedis();
    if (!['connect', 'ready'].includes(redis.status)) {
      await redis.connect();
    }
    logger.info('Redis connected');

    await prisma.$connect();
    logger.info('Database connected');

    // Delete any existing webhook to ensure long polling works
    await bot.telegram.deleteWebhook();
    logger.info('Webhook deleted, starting long polling...');

    // Launch the bot
    await bot.launch({ dropPendingUpdates: true });
    logger.info('✅ Quite bot launched (long polling)');

    // Start background engines
    scanner.start();
    sellEngine.start();
    copyEngine.start();
    logger.info('Background engines started');

    // Sell notification
    sellEngine.on('sell', async (positionId: string, reason: string) => {
      try {
        const pos = await prisma.position.findUnique({ where: { id: positionId } });
        if (pos) {
          await notifier.send(pos.userId, 'sell_executed', `Position closed: ${reason}`);
        }
      } catch (err) {
        logger.error('Sell notification error:', err);
      }
    });

  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', async () => {
  logger.info('Shutting down...');
  bot.stop('SIGINT');
  scanner.stop();
  sellEngine.stop();
  copyEngine.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Shutting down...');
  bot.stop('SIGTERM');
  scanner.stop();
  sellEngine.stop();
  copyEngine.stop();
  await prisma.$disconnect();
  process.exit(0);
});

start();
