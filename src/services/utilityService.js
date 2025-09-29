// src/services/utilityService.js
import { Contract, isAddress } from 'ethers';
import { getProvider } from '../utils/providerPool.js';

const ABI = ['function balanceOf(address) view returns (uint256)'];
const ADDR = (process.env.NFT_UTILITY_PASS_CONTRACT || '').toLowerCase();

export async function getUtilityPassCount(wallet) {
  if (!isAddress(ADDR)) return 0;
  for (let i = 0; i < 6; i++) {
    try {
      const c = new Contract(ADDR, ABI, getProvider(i));
      const b = await c.balanceOf(wallet);
      return Number(b);
    } catch {}
  }
  throw new Error('UtilityService: ALL_RPC_FAILED');
}
