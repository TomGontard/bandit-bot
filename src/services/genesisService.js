// src/services/genesisService.js
import { Contract } from 'ethers';
import { getProvider } from '../utils/providerPool.js';

const ABI = ['function balanceOf(address) view returns (uint256)'];
const ADDR = process.env.NFT_GENESIS_CONTRACT;

export async function getGenesisCount(wallet) {
  for (let i = 0; i < 6; i++) {
    try {
      const provider = getProvider(i);
      const contract = new Contract(ADDR, ABI, provider);
      const balance = await contract.balanceOf(wallet);
      return Number(balance);
    } catch {
      // Essayer le provider suivant
    }
  }
  throw new Error('GenesisService: ALL_RPC_FAILED');
}
