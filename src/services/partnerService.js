const { JsonRpcProvider, Contract, isAddress } = require('ethers');
const partners = require('../config/partnerCollections');      // ← NEW

const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL);

const ERC721_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
];

async function ownsAny(contract, wallet, ids) {
  let owned = 0;
  for (const id of ids) {
    try {
      const owner = await contract.ownerOf(id);
      if (owner.toLowerCase() === wallet.toLowerCase()) owned++;
    } catch { /* silently ignore */ }
  }
  return owned;
}

async function checkCollection(wallet, { address, ids }) {
  const contract = new Contract(address, ERC721_ABI, provider);
  try {
    const bal = await contract.balanceOf(wallet);
    if (bal === 0n) return 0;
  } catch { return 0; }
  return await ownsAny(contract, wallet, ids);
}

async function checkAllPartners(wallet) {
  if (!wallet || !isAddress(wallet)) return {};
  const out = {};
  for (const p of partners) {
    out[p.name] = await checkCollection(wallet, p);
  }
  return out;
}

module.exports = { checkAllPartners };
