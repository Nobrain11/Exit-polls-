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

// Safety nets
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

const bot = new Telegraf<BotContext>(env.BOT_TOKEN);
bot.use(sessionMiddleware);
bot.use(authMiddleware);
bot.use(rateLimitMiddleware);
setupBotRoutes(bot);

const sellEngine = new SellEngine();
const copyEngine = new CopyTradeEngine();
const notifier = new NotificationEngine(bot);

async function start() {
  console.log('🚀 Starting Quite bot...');

  try {
    // Connect services
    const redis = getRedis();
    await redis.connect();
    console.log('✅ Redis connected');

    await prisma.$connect();
    console.log('✅ Database connected');

    // Delete webhook
    await bot.telegram.deleteWebhook();
    console.log('✅ Webhook deleted');

    // IMPORTANT: Wait 2 seconds to ensure old instances are dead
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Waiting for old instances to die...');

    // Launch bot
    await bot.launch({ dropPendingUpdates: true });
    console.log('✅ Quite bot launched');

    // Start engines
    scanner.start();
    sellEngine.start();
    copyEngine.start();
    console.log('✅ Background engines started');

    // Sell notifications
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

    console.log('🎉 Quite bot is fully operational!');

  } catch (err: any) {
    console.error('❌ STARTUP ERROR:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  bot.stop(signal);
  scanner.stop();
  sellEngine.stop();
  copyEngine.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start();
