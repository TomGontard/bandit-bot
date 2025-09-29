// src/services/banditService.js
import { Contract, isAddress } from 'ethers';
import { getProvider } from '../utils/providerPool.js';

const ABI = ['function balanceOf(address) view returns (uint256)'];
const LIST = (process.env.NFT_BANDIT_CONTRACTS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(isAddress);

export async function getBanditCount(wallet) {
  if (!LIST.length) return 0;
  for (let i = 0; i < 6; i++) {
    try {
      const p = getProvider(i);
      let sum = 0;
      for (const addr of LIST) {
        const c = new Contract(addr, ABI, p);
        sum += Number(await c.balanceOf(wallet));
      }
      return sum;
    } catch {}
  }
  throw new Error('BanditService: ALL_RPC_FAILED');
}
