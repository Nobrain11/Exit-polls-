import { MiddlewareFn } from 'telegraf';
import { BotContext } from '../core/types';
import { getRedis } from '../../core/redis-client';

export const rateLimitMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const redis = getRedis();
  const key = `rl:${ctx.from!.id}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, 60);
  if (current > 30) {
    return ctx.reply('⚠️ Too many requests. Please slow down.');
  }
  return next();
};
