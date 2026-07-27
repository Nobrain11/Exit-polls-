import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import { getRedis } from '../../core/redis-client';
import { backButton, refreshButton } from '../core/navigation';
import { editOrReply } from '../utils/message';
import { TokenInfo } from '../../types/shared';

export async function scannerScreen(ctx: BotContext) {
  const redis = getRedis();
  const cached = await redis.get('latest_tokens');
  const tokens: TokenInfo[] = cached ? JSON.parse(cached) : [];

  let text = `📈 *Scanner – New Launches*\n\n`;
  if (tokens.length === 0) {
    text += `No recent launches found.`;
  } else {
    tokens.slice(0, 10).forEach((t, i) => {
      text += `${i+1}. *${t.symbol || t.address.slice(0,6)}* — MC: $${t.marketCap.toFixed(0)}\n   Bonding: ${t.bondingCurve.toFixed(0)}% | Age: ${Math.floor((Date.now()-t.createdAt)/1000)}s\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [refreshButton()],
    [Markup.button.callback('🔍 Filter', 'scanner_filter')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
