import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import { getRedis } from '../../core/redis-client';
import { backButton, refreshButton } from '../core/navigation';
import { editOrReply } from '../utils/message';
import { formatSol } from '../../utils/formatters';
import { TrendingToken } from '../../types/shared';

export async function trendingScreen(ctx: BotContext) {
  const redis = getRedis();
  const cached = await redis.get('trending_tokens');
  const trending: TrendingToken[] = cached ? JSON.parse(cached) : [];

  let text = `🔥 *Trending Coins*\n\n`;
  if (trending.length === 0) {
    text += `No data yet. Waiting for scanner…`;
  } else {
    trending.forEach((t, i) => {
      text += `${i+1}. *${t.symbol || t.address.slice(0,6)}* — Score: ${t.score.toFixed(0)}\n   MC: $${t.marketCap.toFixed(0)} | Liq: ${formatSol(t.liquidity)} SOL\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [refreshButton()],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
