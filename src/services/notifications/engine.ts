import { Telegraf } from 'telegraf';
import prisma from '../../db/prisma';
import { BotContext } from '../../bot/core/types';

export class NotificationEngine {
  constructor(private bot: Telegraf<BotContext>) {}

  async send(userId: string, type: string, message: string) {
    await prisma.alert.create({ data: { userId, type, message } });
    try {
      await this.bot.telegram.sendMessage(userId, `🔔 ${message}`, { parse_mode: 'HTML' });
    } catch (e) {
      // User may have blocked bot
    }
  }
}
