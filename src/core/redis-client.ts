import Redis from 'ioredis';
import { env } from '../config/env';
import logger from './logger';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => logger.error('Redis error', err));
    redis.on('connect', () => logger.info('Redis connected'));
  }
  return redis;
}
