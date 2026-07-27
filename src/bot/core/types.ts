import { Context } from 'telegraf';

export interface SessionData {
  userId?: string;
  activeWalletId?: string;
  navigationHistory: string[];
  tempData?: Record<string, any>;
  firstTime?: boolean;
}

export interface BotContext extends Context {
  session: SessionData;
}
