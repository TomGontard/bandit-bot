// src/services/partnerService.js  –  v2 (providerPool + fallback)
import { ethers, isAddress } from 'ethers';
import partners from '../config/partnerCollections.js';
import { getProvider } from '../utils/providerPool.js'; // ★ nouveau

/* ── ABI minimal ─────────────────────────────────────────────── */
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

/* ── vérifie si `wallet` est propriétaire de l’un des `ids` ──── */
async function ownsAny(contract, wallet, ids) {
  const lower = wallet.toLowerCase();
  for (const id of ids) {
    try {
      const owner = await contract.ownerOf(id);
      if (owner.toLowerCase() === lower) return true;
    } catch {
      /* id inexistant ou RPC err → skip */
    }
  }
  return false;
}

/* ── teste une collection sur un provider donné ─────────────── */
async function checkCollectionWithProvider(wallet, { address, ids }, provider) {
  const contract = new ethers.Contract(address, ERC721_ABI, provider);
  try {
    const bal = await contract.balanceOf(wallet);
    if (bal === 0n) return 0; // aucune chance
  } catch {
    return 0; // balanceOf a échoué
  }
  return (await ownsAny(contract, wallet, ids)) ? 1 : 0;
}

/* ── export principal : renvoie un objet { name: 0/1 } ───────── */
export async function checkAllPartners(wallet) {
  if (!wallet || !isAddress(wallet)) return {};

  const result = {};
  for (const p of partners) {
    result[p.name] = 0;
  }

  // essaie chaque provider du pool jusqu’à succès
  for (let i = 0; i < 6; i++) {
    const provider = getProvider(i);
    try {
      for (const p of partners) {
        if (result[p.name]) continue; // déjà trouvé
        result[p.name] = await checkCollectionWithProvider(wallet, p, provider);
      }
      return result; // toutes les coll. traitées
    } catch (err) {
      console.warn(`PartnerService: provider #${i} failed → ${err.code || err.message}`);
      // passe au provider suivant
    }
  }

  throw new Error('PartnerService: ALL_RPC_FAILED');
}
