import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { getConnection } from '../../core/solana-client';
import { env } from '../../config/env';
import { TradeExecution } from '../../types/shared';
import logger from '../../core/logger';
import { SearcherClient, searcherClient } from '@jito-labs/jito-ts/dist/sdk/block-engine/searcher';
import { Bundle as JitoBundle } from '@jito-labs/jito-ts/dist/sdk/block-engine/types';

let jitoClient: SearcherClient | null = null;
if (env.JITO_BLOCK_ENGINE_URL) {
  jitoClient = searcherClient(env.JITO_BLOCK_ENGINE_URL);
}

async function sendTransactionWithJito(transaction: VersionedTransaction, wallet: Keypair) {
  if (!jitoClient) {
    const conn = getConnection();
    return conn.sendTransaction(transaction, { skipPreflight: false });
  }
  const bundle = new JitoBundle([transaction], 1);
  const response = await jitoClient.sendBundle(bundle);
  logger.info(`Jito bundle sent: ${response}`);
  return transaction.signatures[0].toString();
}

export async function executeBuy(wallet: Keypair, trade: TradeExecution): Promise<string | null> {
  const inputMint = 'So11111111111111111111111111111111111111112';
  const outputMint = trade.token;
  const amount = Math.floor((trade.amountSol || 0) * 1e9).toString();

  const quoteUrl = `${env.JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${trade.slippage}`;
  const quoteResponse = await (await fetch(quoteUrl)).json();

  const swapResponse = await (
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

  const txid = await sendTransactionWithJito(transaction, wallet);
  logger.info(`Buy transaction sent: ${txid}`);
  return txid;
}

export async function executeSell(wallet: Keypair, trade: TradeExecution): Promise<string | null> {
  const inputMint = trade.token;
  const outputMint = 'So11111111111111111111111111111111111111112';
  const amount = Math.floor(trade.amountToken || 0).toString();

  const quoteUrl = `${env.JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${trade.slippage}`;
  const quoteResponse = await (await fetch(quoteUrl)).json();

  const swapResponse = await (
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

  const txid = await sendTransactionWithJito(transaction, wallet);
  logger.info(`Sell transaction sent: ${txid}`);
  return txid;
}
