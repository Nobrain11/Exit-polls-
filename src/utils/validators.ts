import { PublicKey } from '@solana/web3.js';

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
    const buffer = Buffer.from(key, 'base58');
    return buffer.length === 64;
  } catch {
    return false;
  }
}

export function isValidAmount(amount: number, min = 0, max = Infinity): boolean {
  return !isNaN(amount) && amount >= min && amount <= max;
}
