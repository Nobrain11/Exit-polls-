import prisma from '../../db/prisma';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export async function getPnLStats(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all') {
  let since: Date | undefined;
  const now = new Date();
  if (period === 'daily') since = startOfDay(now);
  else if (period === 'weekly') since = startOfWeek(now);
  else if (period === 'monthly') since = startOfMonth(now);

  const where: any = { userId, type: 'sell' };
  if (since) where.executedAt = { gte: since };

  const trades = await prisma.trade.findMany({ where, orderBy: { executedAt: 'desc' } });
  let totalPnl = 0;
  let wins = 0;
  for (const t of trades) {
    totalPnl += Number(t.solAmount) * 0.1; // simplified
    if (Number(t.solAmount) > 0) wins++;
  }
  const roi = trades.length ? (totalPnl / trades.reduce((s, t) => s + Number(t.solAmount), 0)) * 100 : 0;
  return {
    totalPnl,
    tradesCount: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    roi,
    trades,
  };
}
