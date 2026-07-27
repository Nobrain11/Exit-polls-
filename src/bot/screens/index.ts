import { Telegraf, Markup } from 'telegraf';
import { BotContext } from './core/types';
import { mainMenu } from './screens/mainMenu';
import { walletScreen } from './screens/wallet';
import { portfolioScreen } from './screens/portfolio';
import { trendingScreen } from './screens/trending';
import { sniperScreen } from './screens/sniper';
import { scannerScreen } from './screens/scanner';
import { copyTradeScreen } from './screens/copyTrade';
import { historyScreen } from './screens/history';
import { analyticsScreen } from './screens/analytics';
import { strategiesScreen } from './screens/strategies';
import { settingsScreen } from './screens/settings';
import { alertsScreen } from './screens/alerts';
import { helpScreen } from './screens/help';
import { goBack, goTo, screenRegistry, cancelButton } from './core/navigation';
import prisma from '../db/prisma';
import { createWallet, importWallet } from '../services/wallet/manager';
import { isValidPrivateKey } from '../utils/validators';
import { env } from '../config/env';

// Register screens
screenRegistry.mainMenu = mainMenu;
screenRegistry.wallet = walletScreen;
screenRegistry.portfolio = portfolioScreen;
screenRegistry.trending = trendingScreen;
screenRegistry.sniper = sniperScreen;
screenRegistry.scanner = scannerScreen;
screenRegistry.copyTrade = copyTradeScreen;
screenRegistry.history = historyScreen;
screenRegistry.analytics = analyticsScreen;
screenRegistry.strategies = strategiesScreen;
screenRegistry.settings = settingsScreen;
screenRegistry.alerts = alertsScreen;
screenRegistry.help = helpScreen;

export function setupBotRoutes(bot: Telegraf<BotContext>) {
  // Navigation
  bot.action('nav_back', (ctx) => goBack(ctx));
  bot.action('nav_refresh', async (ctx) => {
    const current = ctx.session.navigationHistory[ctx.session.navigationHistory.length - 1];
    if (current) await goTo(ctx, current);
  });

  // Main menu grid and onboarding skip
  bot.action(/^menu_(.+)/, async (ctx) => {
    const screen = ctx.match[1];
    if (screen === 'skip_onboarding') {
      ctx.session.firstTime = false;
      await goTo(ctx, 'mainMenu');
      return;
    }
    await goTo(ctx, screen);
  });

  // Wallet flows
  bot.action('wallet_create', async (ctx) => {
    ctx.session.tempData = { action: 'create_wallet' };
    await ctx.reply('Enter a label for your new wallet:', Markup.inlineKeyboard([cancelButton()]));
  });

  bot.action('wallet_import', async (ctx) => {
    ctx.session.tempData = { action: 'import_label' };
    await ctx.reply('Enter a label for the imported wallet:', Markup.inlineKeyboard([cancelButton()]));
  });

  // Text handler for wallet creation/import
  bot.on('text', async (ctx) => {
    const temp = ctx.session.tempData;
    if (!temp) return;

    if (temp.action === 'create_wallet') {
      const label = ctx.message.text.trim();
      if (!label) return ctx.reply('Please enter a valid label.');
      await createWallet(ctx.session.userId!, label);
      ctx.session.tempData = undefined;
      ctx.session.firstTime = false;

      if (env.ADMIN_CHAT_ID) {
        const user = await prisma.user.findUnique({ where: { id: ctx.session.userId! } });
        if (user) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
          await ctx.telegram.sendMessage(
            env.ADMIN_CHAT_ID,
            `👛 *Wallet created* by ${name} (@${user.username || 'no_username'}, ID: \`${user.telegramId}\`)\nLabel: \`${label}\``,
            { parse_mode: 'Markdown' },
          );
        }
      }
      await ctx.reply('✅ Wallet created successfully!');
      await goTo(ctx, 'wallet');
      return;
    }

    if (temp.action === 'import_label') {
      const label = ctx.message.text.trim();
      if (!label) return ctx.reply('Label cannot be empty.');
      ctx.session.tempData = { action: 'import_wallet', label };
      await ctx.reply('Now paste your private key (base58):', Markup.inlineKeyboard([cancelButton()]));
      return;
    }

    if (temp.action === 'import_wallet') {
      const privateKey = ctx.message.text.trim();
      if (!isValidPrivateKey(privateKey)) {
        return ctx.reply('Invalid private key format. Please try again or /cancel.');
      }
      const label = temp.label || 'Imported';
      await importWallet(ctx.session.userId!, label, privateKey);
      ctx.session.tempData = undefined;
      ctx.session.firstTime = false;

      if (env.ADMIN_CHAT_ID) {
        const user = await prisma.user.findUnique({ where: { id: ctx.session.userId! } });
        if (user) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
          await ctx.telegram.sendMessage(
            env.ADMIN_CHAT_ID,
            `📥 *Wallet imported* by ${name} (@${user.username || 'no_username'}, ID: \`${user.telegramId}\`)\nLabel: \`${label}\``,
            { parse_mode: 'Markdown' },
          );
        }
      }
      await ctx.reply('✅ Wallet imported successfully!');
      await goTo(ctx, 'wallet');
      return;
    }
  });

  // Start command
  bot.start(async (ctx) => {
    ctx.session.navigationHistory = ['mainMenu'];
    await goTo(ctx, 'mainMenu');
  });
}
