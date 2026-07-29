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

// ---------------------------------------------------------------------------
// Safety nets – catch anything that would kill the process
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

// ---------------------------------------------------------------------------
// Bot setup
// ---------------------------------------------------------------------------
const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

bot.use(sessionMiddleware);
bot.use(authMiddleware);
bot.use(rateLimitMiddleware);

setupBotRoutes(bot);

// ---------------------------------------------------------------------------
// Background engines
// ---------------------------------------------------------------------------
const sellEngine = new SellEngine();
const copyEngine = new CopyTradeEngine();
const notifier = new NotificationEngine(bot);

// ---------------------------------------------------------------------------
// Start everything
// ---------------------------------------------------------------------------
(async () => {
  try {
    // 1) Connect services
    const redis = getRedis();
    if (!['connect', 'ready'].includes(redis.status)) {
      await redis.connect();
    }
    logger.info('Redis connected');

    await prisma.$connect();
    logger.info('Database connected');

    // 2) Remove any leftover webhook (crucial for Railway)
    const webhookInfo = await bot.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      await bot.telegram.deleteWebhook();
      logger.info('Old webhook removed');
    }

    // 3) Launch with EXPLICIT polling – NO webhook, NO port
    await bot.launch({ dropPendingUpdates: true });
    logger.info('✅ Quite bot launched (polling mode)');

    // 4) Start background engines
    scanner.start();
    sellEngine.start();
    copyEngine.start();
    logger.info('Background engines started');

    // 5) Wire sell events -> notifications
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
})();

// ---------------------------------------------------------------------------
// Graceful shutdown (Railway sends SIGTERM)
// ---------------------------------------------------------------------------
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down…`);
  bot.stop(signal);
  scanner.stop();
  sellEngine.stop();
  copyEngine.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
