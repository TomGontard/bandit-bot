import cron from 'node-cron';
import client from '../config/client.js';
import UserLink from '../services/models/UserLink.js';

cron.schedule('*/10 * * * *', async () => { 
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
