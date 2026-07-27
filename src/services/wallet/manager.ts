import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { encrypt, decrypt } from '../../core/crypto';
import { getConnection } from '../../core/solana-client';
import prisma from '../../db/prisma';
import logger from '../../core/logger';
import { Wallet } from '@prisma/client';

export async function createWallet(userId: string, label: string): Promise<Wallet> {
  const kp = Keypair.generate();
  const publicKey = kp.publicKey.toBase58();
  const encryptedKey = encrypt(bs58.encode(kp.secretKey));

  const wallet = await prisma.wallet.create({
    data: { userId, label, publicKey, encryptedKey },
  });
  const active = await prisma.wallet.findFirst({ where: { userId, isActive: true } });
  if (!active) {
    await prisma.wallet.update({ where: { id: wallet.id }, data: { isActive: true } });
  }
  return wallet;
}

export async function importWallet(
  userId: string,
  label: string,
  privateKeyBase58: string,
): Promise<Wallet> {
  const secretKey = bs58.decode(privateKeyBase58);
  const kp = Keypair.fromSecretKey(secretKey);
  const publicKey = kp.publicKey.toBase58();
  const encryptedKey = encrypt(privateKeyBase58);
  return prisma.wallet.create({
    data: { userId, label, publicKey, encryptedKey },
  });
}

export function getKeypair(wallet: Wallet): Keypair {
  const privateKey = decrypt(wallet.encryptedKey);
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

export async function getBalance(wallet: Wallet): Promise<number> {
  const conn = getConnection();
  const lamports = await conn.getBalance(new PublicKey(wallet.publicKey));
  return lamports / 1e9;
}

export async function switchActiveWallet(userId: string, walletId: string): Promise<void> {
  await prisma.$transaction([
    prisma.wallet.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
    prisma.wallet.update({ where: { id: walletId }, data: { isActive: true } }),
  ]);
}

export async function deleteWallet(walletId: string): Promise<void> {
  await prisma.wallet.delete({ where: { id: walletId } });
}
