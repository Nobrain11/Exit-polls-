import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function strategiesScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const strategies = await prisma.strategy.findMany({ where: { userId } });

  let text = `🧠 *Strategies*\n\n`;
  if (strategies.length === 0) {
    text += `No strategies yet. Create one to start auto‑trading.`;
  } else {
    strategies.forEach(s => {
      text += `• ${s.name} (${s.type}) — ${s.isActive ? 'Active' : 'Paused'}\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('➕ New Strategy', 'strategy_new')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
