import { BotContext } from './types';
import { Markup } from 'telegraf';

export const screenRegistry: Record<string, (ctx: BotContext) => Promise<void>> = {};

export async function goTo(ctx: BotContext, screen: string) {
  ctx.session.navigationHistory.push(screen);
  const handler = screenRegistry[screen];
  if (handler) {
    await ctx.answerCbQuery();
    await handler(ctx);
  } else {
    await ctx.reply('Screen not found');
  }
}

export async function goBack(ctx: BotContext) {
  const history = ctx.session.navigationHistory;
  history.pop();
  const previous = history[history.length - 1] || 'mainMenu';
  await goTo(ctx, previous);
}

export function backButton() {
  return Markup.button.callback('⬅ Back', 'nav_back');
}

export function cancelButton() {
  return Markup.button.callback('❌ Cancel', 'nav_cancel');
}

export function saveButton() {
  return Markup.button.callback('✅ Save', 'nav_save');
}

export function confirmButton() {
  return Markup.button.callback('✅ Confirm', 'nav_confirm');
}

export function refreshButton() {
  return Markup.button.callback('🔄 Refresh', 'nav_refresh');
}
