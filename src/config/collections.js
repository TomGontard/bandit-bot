// src/config/collections.js
import 'dotenv/config';

const partners = [];

// --- Genesis (obligatoire si tu veux la variable Genesis) ---
if (process.env.NFT_GENESIS_CONTRACT) {
  partners.push({
    name: 'Genesis',
    address: process.env.NFT_GENESIS_CONTRACT,
    category: 'genesis',
  });
}

// --- Bandit (0, 1 ou plusieurs) ---
if (process.env.NFT_BANDIT_CONTRACTS) {
  process.env.NFT_BANDIT_CONTRACTS
    .split(',')
    .filter(Boolean)
    .forEach((addr, i) =>
      partners.push({
        name: `Bandit #${i + 1}`,
        address: addr.trim(),
        category: 'bandit',
      })
    );
}

// --- Collections partenaires optionnelles ---
if (process.env.NFT_PARTNER_CONTRACTS) {
  process.env.NFT_PARTNER_CONTRACTS.split(',').forEach((item) => {
    const [label, addr] = item.split(':');
    if (label && addr) {
      partners.push({
        name: label.trim(),
        address: addr.trim(),
        category: 'other',
      });
    }
  });
}

// --- Rôles importés de .env ---
const roleIds = {
  genesis: process.env.ROLE_GENESIS_ID,
  bandit: process.env.ROLE_BANDIT_ID,
};

export { partners, roleIds };
