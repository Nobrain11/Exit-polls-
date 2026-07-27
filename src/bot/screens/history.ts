import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton, refreshButton } from '../core/navigation';
import { editOrReply } from '../utils/message';
import { formatSol, truncateAddress } from '../../utils/formatters';

export async function historyScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { executedAt: 'desc' },
    take: 20,
  });

  let text = `📜 *Trade History*\n\n`;
  if (trades.length === 0) {
    text += `No trades yet.`;
  } else {
    trades.forEach(t => {
      const emoji = t.type === 'buy' ? '🟢' : '🔴';
      text += `${emoji} ${t.tokenSymbol || truncateAddress(t.tokenAddress)} — ${formatSol(Number(t.solAmount))} SOL @ ${Number(t.price).toFixed(6)}\n`;
    });
  }

  const keyboard = Markup.inlineKeyboard([
    [refreshButton()],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
