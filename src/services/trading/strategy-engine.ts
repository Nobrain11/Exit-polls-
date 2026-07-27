import { StrategyConfig, TokenInfo } from '../../types/shared';

export function evaluateEntry(token: TokenInfo, config: StrategyConfig): boolean {
  if (config.marketCapMin !== undefined && token.marketCap < config.marketCapMin) return false;
  if (config.marketCapMax !== undefined && token.marketCap > config.marketCapMax) return false;
  if (config.liquidityMin !== undefined && token.liquidity < config.liquidityMin) return false;
  if (config.trendingScoreMin !== undefined && (token as any).score < config.trendingScoreMin) return false;
  if (config.blacklist && config.blacklist.includes(token.address)) return false;
  if (config.whitelist && config.whitelist.length > 0 && !config.whitelist.includes(token.address)) return false;
  return true;
}

export function evaluateExit(
  currentPrice: number,
  entryPrice: number,
  stopLoss?: number,
  takeProfit?: number,
): 'sl' | 'tp' | null {
  if (stopLoss && currentPrice <= stopLoss) return 'sl';
  if (takeProfit && currentPrice >= takeProfit) return 'tp';
  return null;
}
