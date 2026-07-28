import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../../core/solana-client';
import { BondingCurveState, PUMPFUN_PROGRAM_ID } from '../../types/pumpfun';
import * as borsh from 'borsh';
import logger from '../../core/logger';

// Define the schema as a plain object, not a Map/class
const bondingCurveSchema: borsh.Schema = {
  struct: {
    virtualTokenReserves: 'u64',
    virtualSolReserves: 'u64',
    realTokenReserves: 'u64',
    realSolReserves: 'u64',
    tokenTotalSupply: 'u64',
  },
};

export async function getPumpFunBondingCurve(mint: PublicKey): Promise<BondingCurveState | null> {
  const conn = getConnection();
  const [bondingCurveAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    new PublicKey(PUMPFUN_PROGRAM_ID),
  );
  try {
    const accountInfo = await conn.getAccountInfo(bondingCurveAddress);
    if (!accountInfo) return null;
    // Deserialise using the plain schema – returns a plain object
    const data = borsh.deserialize(bondingCurveSchema, accountInfo.data) as BondingCurveState;
    // Convert bigint values from string (borsh may return them as BigInt, but we ensure)
    return {
      virtualTokenReserves: BigInt(data.virtualTokenReserves),
      virtualSolReserves: BigInt(data.virtualSolReserves),
      realTokenReserves: BigInt(data.realTokenReserves),
      realSolReserves: BigInt(data.realSolReserves),
      tokenTotalSupply: BigInt(data.tokenTotalSupply),
    };
  } catch (e) {
    logger.warn(`Failed to fetch bonding curve for ${mint.toBase58()}: ${e}`);
    return null;
  }
}

export function calculatePumpPrice(state: BondingCurveState): number {
  if (Number(state.virtualTokenReserves) === 0) return 0;
  return Number(state.virtualSolReserves) / Number(state.virtualTokenReserves);
}
