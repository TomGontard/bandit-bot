// src/services/nftChecker.js
import { JsonRpcProvider, Contract } from 'ethers';
import { partners } from '../config/collections.js';

const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL);

const ERC721_ABI = ['function balanceOf(address) view returns (uint256)'];

export async function fetchBalances(wallet) {
  const counts = {};

  for (const col of partners) {
    const contract = new Contract(col.address, ERC721_ABI, provider);
    try {
      const bal = await contract.balanceOf(wallet);      // bigint ou BigNumber
      const n   = typeof bal === 'bigint' ? Number(bal)   // v6
                  : bal.toNumber();                       // v5
      counts[col.address] = n;
    } catch (e) {
      console.error(`NFT check error for ${col.name}`, e);
      counts[col.address] = 0;
    }
  }
  return counts;
}

export function aggregate(counts) {
  let genesis = 0, bandit = 0;
  for (const { address, category } of partners) {
    const c = counts[address] || 0;
    if (category === 'genesis') genesis += c;
    if (category === 'bandit') bandit  += c;
  }
  return { genesis, bandit };
}
