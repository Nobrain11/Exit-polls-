import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function helpScreen(ctx: BotContext) {
  const text = `❓ *Help*\n\n` +
    `• Create/import a wallet to get started.\n` +
    `• Set up a strategy to auto‑trade.\n` +
    `• Use the scanner to find new coins.\n` +
    `• Copy trade profitable wallets.\n\n` +
    `For support, contact @quite_support.`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('📖 Docs', 'https://docs.quite.io')],
    [Markup.button.url('💬 Community', 'https://t.me/quite_community')],
    [backButton()],
  ]);
  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
