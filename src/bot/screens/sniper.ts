import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function sniperScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const sniperStrategies = await prisma.strategy.findMany({
    where: { userId, type: 'sniper' },
  });

  let text = `🎯 *Sniper*\n\nConfigure launch sniping strategies.\n\n`;
  if (sniperStrategies.length === 0) {
    text += `No sniper configs yet.`;
  } else {
    sniperStrategies.forEach(s => {
      text += `• ${s.name} (${s.isActive ? 'active' : 'paused'})\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('➕ New Sniper Config', 'sniper_new')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
