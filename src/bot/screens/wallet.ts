import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { getBalance } from '../../services/wallet/manager';
import { backButton } from '../core/navigation';
import { editOrReply } from '../utils/message';

export async function walletScreen(ctx: BotContext) {
  const userId = ctx.session.userId!;
  const wallets = await prisma.wallet.findMany({ where: { userId } });
  if (!wallets.length) {
    await editOrReply(ctx, 'No wallets yet.', {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('➕ Create', 'wallet_create'), Markup.button.callback('📥 Import', 'wallet_import')],
          [backButton()],
        ],
      },
    });
    return;
  }

  const active = wallets.find(w => w.isActive);
  const balance = active ? await getBalance(active) : 0;
  let text = `*Wallet Management*\n\nActive: ${active?.label || 'None'} (${balance.toFixed(3)} SOL)\n\nSelect wallet:`;

  const buttons = wallets.map(w => [Markup.button.callback(`${w.isActive ? '✅' : '⬜'} ${w.label}`, `wallet_select_${w.id}`)]);
  buttons.push([Markup.button.callback('➕ Create', 'wallet_create'), Markup.button.callback('📥 Import', 'wallet_import')]);
  buttons.push([backButton()]);

  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
}
