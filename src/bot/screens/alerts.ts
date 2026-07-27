import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function alertsScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const alerts = await prisma.alert.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  let text = `🔔 *Alerts*\n\n`;
  if (alerts.length === 0) {
    text += `No unread alerts.`;
  } else {
    alerts.forEach(a => {
      text += `• ${a.type}: ${a.message}\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Mark all as read', 'alerts_read_all')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
