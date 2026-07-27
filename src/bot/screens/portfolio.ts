import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { backButton, refreshButton } from '../core/navigation';
import { editOrReply } from '../utils/message';
import { formatSol, truncateAddress } from '../../utils/formatters';

export async function portfolioScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const positions = await prisma.position.findMany({
    where: { userId, status: 'open' },
    orderBy: { openedAt: 'desc' },
  });
  const recentClosed = await prisma.trade.findMany({
    where: { userId, type: 'sell' },
    orderBy: { executedAt: 'desc' },
    take: 5,
  });

  let text = `📊 *Portfolio*\n\n`;
  if (positions.length === 0) {
    text += `No open positions.\n\n`;
  } else {
    text += `*Open Positions* (${positions.length})\n`;
    for (const p of positions) {
      const pnl = (Number(p.currentPrice) - Number(p.entryPrice)) / Number(p.entryPrice) * 100;
      const pnlStr = pnl >= 0 ? `+${pnl.toFixed(1)}%` : `${pnl.toFixed(1)}%`;
      text += `• ${p.tokenSymbol || truncateAddress(p.tokenAddress)} — ${formatSol(Number(p.investedSol))} SOL | ${pnlStr}\n`;
    }
  }

  text += `\n*Recent Sells*\n`;
  for (const t of recentClosed) {
    text += `• ${t.tokenSymbol || truncateAddress(t.tokenAddress)} — ${formatSol(Number(t.solAmount))} SOL\n`;
  }

  const keyboard = Markup.inlineKeyboard([
    [refreshButton()],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
