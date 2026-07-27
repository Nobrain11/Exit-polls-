import { Connection } from '@solana/web3.js';
import { env } from '../config/env';
import logger from './logger';

let connection: Connection;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(env.HELIUS_RPC_URL, {
      wsEndpoint: env.HELIUS_WS_URL,
      commitment: 'processed',
    });
    logger.info('Solana connection established');
  }
  return connection;
}
