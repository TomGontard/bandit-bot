const cron = require('node-cron');
const client = require('../config/client');
const UserLink = require('../services/models/UserLink');

cron.schedule('*/10 * * * *', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    // 🔢 Total members
    const totalCount = guild.memberCount;

    // 🧠 Members with ERRAND role
    const members = await guild.members.fetch();
    const errandCount = members.filter(m => m.roles.cache.has(process.env.ROLE_ERRAND_ID)).size;

    // 🧾 Wallets in Mongo
    const walletCount = await UserLink.countDocuments();

    // 🎯 Update each channel
    const channelTotal = await guild.channels.fetch(process.env.CHANNEL_TOTAL_ID);
    const channelVerified = await guild.channels.fetch(process.env.CHANNEL_VERIFIED_ID);
    const channelWallets = await guild.channels.fetch(process.env.CHANNEL_WALLETS_ID);

    await channelTotal.setName(`👥 Total Members | ${totalCount}`);
    await channelVerified.setName(`✅ Verified Members | ${errandCount}`);
    await channelWallets.setName(`🔐 Verified Wallets | ${walletCount}`);

    console.log(`✅ Stats updated: ${totalCount} total, ${errandCount} verified, ${walletCount} wallets`);
  } catch (err) {
    console.error('❌ Failed to update stat channels:', err);
  }
});
