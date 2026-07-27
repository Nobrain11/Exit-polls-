import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../../core/solana-client';
import { BondingCurveState, PUMPFUN_PROGRAM_ID } from '../../types/pumpfun';
import * as borsh from 'borsh';
import logger from '../../core/logger';

class BondingCurveLayout {
  virtualTokenReserves: bigint = 0n;
  virtualSolReserves: bigint = 0n;
  realTokenReserves: bigint = 0n;
  realSolReserves: bigint = 0n;
  tokenTotalSupply: bigint = 0n;

  static schema = new Map([
    [
      BondingCurveLayout,
      {
        kind: 'struct',
        fields: [
          ['virtualTokenReserves', 'u64'],
          ['virtualSolReserves', 'u64'],
          ['realTokenReserves', 'u64'],
          ['realSolReserves', 'u64'],
          ['tokenTotalSupply', 'u64'],
        ],
      },
    ],
  ]);
}

export async function getPumpFunBondingCurve(mint: PublicKey): Promise<BondingCurveState | null> {
  const conn = getConnection();
  const [bondingCurveAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    new PublicKey(PUMPFUN_PROGRAM_ID),
  );
  try {
    const accountInfo = await conn.getAccountInfo(bondingCurveAddress);
    if (!accountInfo) return null;
    const data = borsh.deserialize(BondingCurveLayout.schema, BondingCurveLayout, accountInfo.data);
    return data as BondingCurveState;
  } catch (e) {
    logger.warn(`Failed to fetch bonding curve for ${mint.toBase58()}: ${e}`);
    return null;
  }
}

export function calculatePumpPrice(state: BondingCurveState): number {
  if (Number(state.virtualTokenReserves) === 0) return 0;
  return Number(state.virtualSolReserves) / Number(state.virtualTokenReserves);
}
