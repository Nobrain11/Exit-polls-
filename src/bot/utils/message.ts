import { BotContext } from '../core/types';

export async function editOrReply(ctx: BotContext, text: string, extra?: any) {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
    } catch {
      await ctx.reply(text, extra);
    }
  } else {
    await ctx.reply(text, extra);
  }
}
