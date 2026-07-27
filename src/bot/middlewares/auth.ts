import { MiddlewareFn } from 'telegraf';
import { BotContext } from '../core/types';
import prisma from '../../db/prisma';
import { env } from '../../config/env';

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from) return;
  const telegramId = ctx.from.id;
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        languageCode: ctx.from.language_code,
      },
    });

    // Admin notification
    if (env.ADMIN_CHAT_ID) {
      const displayName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'No name';
      await ctx.telegram.sendMessage(
        env.ADMIN_CHAT_ID,
        `🆕 *New user*: ${displayName} (@${ctx.from.username || 'no_username'}, ID: \`${telegramId}\`)`,
        { parse_mode: 'Markdown' },
      );
    }

    ctx.session.firstTime = true;
  } else {
    const [walletCount, strategyCount] = await Promise.all([
      prisma.wallet.count({ where: { userId: user.id } }),
      prisma.strategy.count({ where: { userId: user.id } }),
    ]);
    ctx.session.firstTime = walletCount === 0 && strategyCount === 0;
  }

  ctx.session.userId = user.id;
  return next();
};
