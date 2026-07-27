export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  marketCap: number;
  liquidity: number;
  price: number;
  holders: number;
  bondingCurve: number; // 0-100
  migrationStatus: 'pumpfun' | 'pumpswap' | 'raydium';
  createdAt: number;
}

export interface TrendingToken extends TokenInfo {
  score: number;
  buyPressure: number;
  sellPressure: number;
  holderGrowth: number;
  volume24h: number;
}

export interface Position {
  id: string;
  token: TokenInfo;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  investedSol: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: boolean;
  status: 'open' | 'closed';
}

export interface StrategyConfig {
  marketCapMin?: number;
  marketCapMax?: number;
  liquidityMin?: number;
  buyRatio?: number;
  sellRatio?: number;
  devHoldPercent?: number;
  topHolderPercent?: number;
  trendingScoreMin?: number;
  riskScoreMax?: number;
  volumeMin?: number;
  slippageBps?: number;
  priorityFee?: number;
  tradeSizeSol: number;
  cooldownMs?: number;
  maxPositions?: number;
  blacklist?: string[];
  whitelist?: string[];
}

export interface TradeExecution {
  type: 'buy' | 'sell';
  token: string;
  amountSol?: number;
  amountToken?: number;
  slippage: number;
  priorityFee: number;
}

export interface CopyTradeConfig {
  targetWallet: string;
  buyEnabled: boolean;
  sellEnabled: boolean;
  percentage: number;
  maxSol?: number;
  minSol?: number;
}
