import { MiddlewareFn } from 'telegraf';
import { BotContext } from '../core/types';
import { getRedis } from '../../core/redis-client';

export const sessionMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const redis = getRedis();
  const key = `session:${ctx.from!.id}`;
  const data = await redis.get(key);
  if (data) {
    ctx.session = JSON.parse(data);
  } else {
    ctx.session = { navigationHistory: ['mainMenu'] };
  }
  await next();
  await redis.setex(key, 7 * 24 * 3600, JSON.stringify(ctx.session));
};
