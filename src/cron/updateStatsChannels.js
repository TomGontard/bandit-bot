import cron from 'node-cron';
import { ethers } from 'ethers';
import client from '../config/client.js';
import UserLink from '../services/models/UserLink.js';
import { getProvider } from '../utils/providerPool.js';

// --- Blockchain set‑up --------------------------------------------------Add commentMore actions
const GENESIS_ADDRESS  = process.env.NFT_GENESIS_CONTRACT;
const provider         = getProvider();
const abi = [
  'function nextTokenId() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];
const contract = new ethers.Contract(GENESIS_ADDRESS, abi, provider);

// Helper to count unique holders (<= 999 tokens → OK for per‑token ownerOf)
async function countGenesisHolders() {
  // ethers v6 renvoie un BigInt, v5 un BigNumber
const rawNextId = await contract.nextTokenId();
const nextId    = typeof rawNextId === 'bigint' ? Number(rawNextId) : rawNextId.toNumber(); // 1‑based, next unminted
  const totalMinted = nextId - 1;
  if (totalMinted <= 0) return 0;

  const BATCH = 25; // RPC calls in parallel
  const owners = new Set();

  for (let i = 1; i <= totalMinted; i += BATCH) {
    const ids = Array.from({ length: Math.min(BATCH, totalMinted - i + 1) }, (_, k) => i + k);
    const batchOwners = await Promise.allSettled(ids.map(id => contract.ownerOf(id)));
    batchOwners.forEach(r => {
      if (r.status === 'fulfilled') owners.add(r.value.toLowerCase());
    });
  }
  return owners.size;
}

cron.schedule('2 * * * *', async () => {
  try {
    console.log(`🕓 Updating stat channels...`);
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    // 🔢 Total members
    const totalCount = guild.memberCount;

    // 🧠 Members with ERRAND role
    const members = await guild.members.fetch();
    const errandCount = members.filter(m => m.roles.cache.has(process.env.ROLE_ERRAND_ID)).size;

    // 🔐 Wallets in Mongo
    const walletCount = await UserLink.countDocuments();

    // 🏷️ Holders of NFT (on‑chain)
    const holdersCount = await countGenesisHolders();

    // 🎯 Update each channel
    const channelTotal    = await guild.channels.fetch(process.env.CHANNEL_TOTAL_ID);
    const channelVerified = await guild.channels.fetch(process.env.CHANNEL_VERIFIED_ID);
    const channelWallets  = await guild.channels.fetch(process.env.CHANNEL_WALLETS_ID);
    const channelHolders  = await guild.channels.fetch(process.env.CHANNEL_HOLDERS_ID);

    await channelTotal.setName(`👥 Total Members | ${totalCount}`);
    await channelVerified.setName(`✅ Verified Members | ${errandCount}`);
    await channelWallets.setName(`🔐 Verified Wallets | ${walletCount}`);
    await channelHolders.setName(`🥷 Genesis Holders | ${holdersCount}`);
    
    console.log(`✅ Stats updated: ${totalCount} total, ${errandCount} verified, ${walletCount} wallets, ${holdersCount} holders`);
  } catch (err) {
    console.error('❌ Failed to update stat channels:', err);
  }
});
