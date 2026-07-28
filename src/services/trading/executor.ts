import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { getConnection } from '../../core/solana-client';
import { env } from '../../config/env';
import { TradeExecution } from '../../types/shared';
import logger from '../../core/logger';

async function sendTransaction(transaction: VersionedTransaction, wallet: Keypair) {
  const conn = getConnection();
  const txid = await conn.sendTransaction(transaction, {
    skipPreflight: false,
    preflightCommitment: 'processed',
  });
  logger.info(`Transaction sent: ${txid}`);
  return txid;
}

export async function executeBuy(wallet: Keypair, trade: TradeExecution): Promise<string | null> {
  const inputMint = 'So11111111111111111111111111111111111111112';
  const outputMint = trade.token;
  const amount = Math.floor((trade.amountSol || 0) * 1e9).toString();

  const quoteUrl = `${env.JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${trade.slippage}`;
  const quoteResponse: any = await (await fetch(quoteUrl)).json();

  const swapResponse: any = await (
    await fetch(`${env.JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: trade.priorityFee,
      }),
    })
  ).json();

  const txBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(txBuf);
  transaction.sign([wallet]);

  return sendTransaction(transaction, wallet);
}

export async function executeSell(wallet: Keypair, trade: TradeExecution): Promise<string | null> {
  const inputMint = trade.token;
  const outputMint = 'So11111111111111111111111111111111111111112';
  const amount = Math.floor(trade.amountToken || 0).toString();

  const quoteUrl = `${env.JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${trade.slippage}`;
  const quoteResponse: any = await (await fetch(quoteUrl)).json();

  const swapResponse: any = await (
    await fetch(`${env.JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: trade.priorityFee,
      }),
    })
  ).json();

  const txBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(txBuf);
  transaction.sign([wallet]);

  return sendTransaction(transaction, wallet);
}
