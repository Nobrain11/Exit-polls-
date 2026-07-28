import prisma from '../../db/prisma';
import { getKeypair } from '../wallet/manager';
import { executeSell } from './executor';
import { evaluateExit } from './strategy-engine';
import { calculatePumpPrice, getPumpFunBondingCurve } from '../solana/pumpfun-client';
import { PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import logger from '../../core/logger';

export class SellEngine extends EventEmitter {
  private monitorInterval: NodeJS.Timeout | null = null; // <-- fixed type

  start() {
    this.monitorInterval = setInterval(() => this.checkPositions(), 5000);
    logger.info('Sell engine started');
  }

  stop() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);
  }

  private async checkPositions() {
    const positions = await prisma.position.findMany({
      where: { status: 'open' },
      include: { wallet: true },
    });

    for (const pos of positions) {
      const mint = new PublicKey(pos.tokenAddress);
      const bc = await getPumpFunBondingCurve(mint);
      if (!bc) continue;
      const currentPrice = calculatePumpPrice(bc);
      const entryPrice = Number(pos.entryPrice);

      await prisma.position.update({
        where: { id: pos.id },
        data: { currentPrice },
      });

      const exitReason = evaluateExit(
        currentPrice,
        entryPrice,
        pos.stopLoss ? Number(pos.stopLoss) : undefined,
        pos.takeProfit ? Number(pos.takeProfit) : undefined,
      );

      if (exitReason) {
        const wallet = getKeypair(pos.wallet);
        const tx = await executeSell(wallet, {
          type: 'sell',
          token: pos.tokenAddress,
          amountToken: Number(pos.quantity),
          slippage: 200,
          priorityFee: 50000,
        });
        if (tx) {
          await prisma.position.update({
            where: { id: pos.id },
            data: { status: 'closed', closedAt: new Date() },
          });
          await prisma.trade.create({
            data: {
              userId: pos.userId,
              positionId: pos.id,
              walletId: pos.walletId,
              type: 'sell',
              tokenAddress: pos.tokenAddress,
              amount: pos.quantity,
              price: currentPrice,
              solAmount: currentPrice * Number(pos.quantity),
              feeSol: 0.000005,
              txSignature: tx,
              reason: exitReason,
            },
          });
          this.emit('sell', pos.id, exitReason);
        }
      }
    }
  }
}
