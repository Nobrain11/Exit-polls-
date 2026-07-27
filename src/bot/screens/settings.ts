import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function settingsScreen(ctx: BotContext) {
  const text = `⚙ *Settings*\n\nSelect a category:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💹 Trading', 'settings_trading'), Markup.button.callback('👛 Wallet', 'settings_wallet')],
    [Markup.button.callback('🔗 RPC', 'settings_rpc'), Markup.button.callback('🧠 Strategies', 'settings_strategies')],
    [Markup.button.callback('🔔 Notifications', 'settings_notifications'), Markup.button.callback('🔒 Security', 'settings_security')],
    [Markup.button.callback('🎨 Appearance', 'settings_appearance'), Markup.button.callback('⚡ Advanced', 'settings_advanced')],
    [backButton()],
  ]);

  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
