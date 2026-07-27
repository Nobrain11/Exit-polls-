import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';
import { truncateAddress } from '../../utils/formatters';

export async function copyTradeScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const targets = await prisma.copyTarget.findMany({ where: { userId } });

  let text = `📡 *Copy Trade*\n\n`;
  if (targets.length === 0) {
    text += `No target wallets added.`;
  } else {
    targets.forEach(t => {
      text += `• ${t.label || truncateAddress(t.targetWallet)} — Buy: ${t.buyEnabled ? '✅' : '❌'} Sell: ${t.sellEnabled ? '✅' : '❌'} (${t.percentage}%)\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('➕ Add Target', 'copytrade_add')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
