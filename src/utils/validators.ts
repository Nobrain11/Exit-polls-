import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function isValidPrivateKey(key: string): boolean {
  try {
    const decoded = bs58.decode(key);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

export function isValidAmount(amount: number, min = 0, max = Infinity): boolean {
  return !isNaN(amount) && amount >= min && amount <= max;
}
