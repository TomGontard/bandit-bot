const cron = require('node-cron');
const client = require('../config/client');
const UserLink = require('../services/models/UserLink');
const Whitelist = require('../services/models/Whitelist');

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

    // 🏷️ Whitelists in Mongo
    const all = await Whitelist.find({});
          const staff = all.reduce((sum, r) => sum + r.whitelistsGiven, 0);
          const nfts = all.reduce((sum, r) => sum + r.whitelistsNFTs, 0);
          const whitelistCount = staff + nfts;

    // 🎯 Update each channel
    const channelTotal = await guild.channels.fetch(process.env.CHANNEL_TOTAL_ID);
    const channelVerified = await guild.channels.fetch(process.env.CHANNEL_VERIFIED_ID);
    const channelWallets = await guild.channels.fetch(process.env.CHANNEL_WALLETS_ID);
    const channelWhitelists = await guild.channels.fetch(process.env.CHANNEL_WHITELISTS_ID);

    await channelTotal.setName(`👥 Total Members | ${totalCount}`);
    await channelVerified.setName(`✅ Verified Members | ${errandCount}`);
    await channelWallets.setName(`🔐 Verified Wallets | ${walletCount}`);
    await channelWhitelists.setName(`🎫 Whitelists granted | ${whitelistCount}`);

    console.log(`✅ Stats updated: ${totalCount} total, ${errandCount} verified, ${walletCount} wallets, ${whitelistCount} whitelists`);
  } catch (err) {
    console.error('❌ Failed to update stat channels:', err);
  }
});
