import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  HELIUS_RPC_URL: z.string().url(),
  HELIUS_WS_URL: z.string().url(),
  JUPITER_API_URL: z.string().url(),
  JITO_BLOCK_ENGINE_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().length(64),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ADMIN_CHAT_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
