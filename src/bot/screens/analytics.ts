import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import { getPnLStats } from '../../services/analytics/engine';
import { backButton, refreshButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function analyticsScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const stats = await getPnLStats(userId, 'all');

  let text = `📈 *Analytics*\n\n`;
  text += `Total PnL: ${stats.totalPnl.toFixed(3)} SOL\n`;
  text += `Win Rate: ${stats.winRate.toFixed(1)}%\n`;
  text += `Trades: ${stats.tradesCount}\n`;
  text += `ROI: ${stats.roi.toFixed(2)}%\n`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Today', 'analytics_daily'), Markup.button.callback('Week', 'analytics_weekly')],
    [Markup.button.callback('Month', 'analytics_monthly'), Markup.button.callback('All Time', 'analytics_all')],
    [refreshButton()],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
