import { BotContext } from '../core/types';
import { Markup } from 'telegraf';
import prisma from '../../db/prisma';
import { getBalance } from '../../services/wallet/manager';
import { editOrReply } from '../utils/message';

export async function mainMenu(ctx: BotContext) {
  const userId = ctx.session.userId!;

  // First time onboarding
  if (ctx.session.firstTime) {
    const welcomeText =
      `👋 *Welcome to Quite – Your Pump.fun Auto Trader!*\n\n` +
      `Let's get you started in a few easy steps:\n` +
      `1️⃣ Create or import a wallet\n` +
      `2️⃣ Set up a trading strategy (or use a preset)\n` +
      `3️⃣ Watch the bot auto‑trade trending tokens!\n\n` +
      `Shall we begin with your wallet?`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👉 Set Up Wallet', 'menu_wallet')],
      [Markup.button.callback('⏭ Skip for now', 'menu_skip_onboarding')],
    ]);
    await editOrReply(ctx, welcomeText, { parse_mode: 'Markdown', ...keyboard });
    return;
  }

  // Normal main menu
  const activeWallet = await prisma.wallet.findFirst({ where: { userId, isActive: true } });
  const balance = activeWallet ? await getBalance(activeWallet) : 0;
  const activeStrategies = await prisma.strategy.count({ where: { userId, isActive: true } });
  const openPositions = await prisma.position.count({ where: { userId, status: 'open' } });

  const text =
    `🏠 *Quite – Main Menu*\n\n` +
    `👛 Wallet: ${activeWallet ? activeWallet.label : 'None'} (${balance.toFixed(3)} SOL)\n` +
    `📊 Open Positions: ${openPositions}\n` +
    `🧠 Active Strategies: ${activeStrategies}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👛 Wallet', 'menu_wallet'), Markup.button.callback('📊 Portfolio', 'menu_portfolio')],
    [Markup.button.callback('🚀 Auto Trade', 'menu_autotrade'), Markup.button.callback('🔥 Trending', 'menu_trending')],
    [Markup.button.callback('🎯 Sniper', 'menu_sniper'), Markup.button.callback('📈 Scanner', 'menu_scanner')],
    [Markup.button.callback('📡 Copy Trade', 'menu_copytrade'), Markup.button.callback('📜 History', 'menu_history')],
    [Markup.button.callback('📈 Analytics', 'menu_analytics'), Markup.button.callback('🧠 Strategies', 'menu_strategies')],
    [Markup.button.callback('⚙ Settings', 'menu_settings'), Markup.button.callback('🔔 Alerts', 'menu_alerts')],
    [Markup.button.callback('❓ Help', 'menu_help')],
  ]);

  await editOrReply(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}
