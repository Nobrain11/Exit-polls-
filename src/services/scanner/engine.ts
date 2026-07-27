import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../../core/solana-client';
import { getRedis } from '../../core/redis-client';
import { getPumpFunBondingCurve, calculatePumpPrice } from '../solana/pumpfun-client';
import { TokenInfo, TrendingToken } from '../../types/shared';
import logger from '../../core/logger';
import { EventEmitter } from 'events';
import { PUMPFUN_PROGRAM_ID } from '../../types/pumpfun';

export class ScannerEngine extends EventEmitter {
  private watchedTokens: Map<string, TokenInfo> = new Map();
  private redis = getRedis();
  private conn = getConnection();
  private subId: number | null = null;

  async start() {
    // Subscribe to Pump.fun program logs
    this.subId = this.conn.onLogs(
      new PublicKey(PUMPFUN_PROGRAM_ID),
      async (logs) => {
        if (logs.err) return;
        // Extract new token mints from logs (simplified – real parsing required)
        const mints = this.extractMintsFromLogs(logs);
        for (const mintStr of mints) {
          if (!this.watchedTokens.has(mintStr)) {
            const mint = new PublicKey(mintStr);
            const bc = await getPumpFunBondingCurve(mint);
            if (bc) {
              const price = calculatePumpPrice(bc);
              const token: TokenInfo = {
                address: mintStr,
                symbol: '???',
                name: 'Unknown',
                marketCap: Number(bc.virtualSolReserves) / 1e9 * 30,
                liquidity: Number(bc.realSolReserves) / 1e9,
                price,
                holders: 0,
                bondingCurve: (Number(bc.realTokenReserves) / Number(bc.tokenTotalSupply)) * 100,
                migrationStatus: 'pumpfun',
                createdAt: Date.now(),
              };
              this.watchedTokens.set(mintStr, token);
              this.emit('newToken', token);
            }
          }
        }
      },
      'processed',
    );
    logger.info('Scanner engine subscribed to Pump.fun logs');

    // Regularly update holders, volume, prices via Jupiter API and Helius
    setInterval(() => this.updateMetrics(), 5000);
  }

  private extractMintsFromLogs(logs: any): string[] {
    // Production: parse instructions to get mint addresses
    return [];
  }

  private async updateMetrics() {
    for (const [mint, token] of this.watchedTokens) {
      try {
        const quote = await (
          await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${mint}&amount=1000000000&slippageBps=50`,
          )
        ).json();
        if (quote?.outAmount) {
          token.price = 1e9 / Number(quote.outAmount);
          token.marketCap = token.price * (token.marketCap / (token.price || 1));
        }
      } catch (e) {
        // ignore
      }
    }

    // Calculate trending scores
    const trending: TrendingToken[] = [];
    for (const token of this.watchedTokens.values()) {
      const score = Math.min(100, token.marketCap * 0.1 + (token.liquidity || 0) * 5);
      trending.push({ ...token, score, buyPressure: 0, sellPressure: 0, holderGrowth: 0, volume24h: 0 });
    }
    trending.sort((a, b) => b.score - a.score);
    await this.redis.set('trending_tokens', JSON.stringify(trending.slice(0, 10)), 'EX', 5);
    await this.redis.set('latest_tokens', JSON.stringify(Array.from(this.watchedTokens.values()).sort((a,b) => b.createdAt - a.createdAt).slice(0, 10)), 'EX', 5);
    this.emit('trending', trending.slice(0, 10));
  }

  stop() {
    if (this.subId !== null) {
      this.conn.removeOnLogsListener(this.subId);
    }
  }
}

export const scanner = new ScannerEngine();
