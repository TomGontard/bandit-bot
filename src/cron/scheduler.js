// src/cron/scheduler.js
const cron     = require('node-cron');
const UserLink = require('../services/models/UserLink');
const {
  fetchBalances,
  aggregate,
} = require('../services/nftChecker');
const {
  saveHolding,
  syncRoles,
} = require('../services/holdingService');
const client   = require('../config/client');

// ⏰ 05:00 AM UTC every day (can be configured via .env)
const CRON_EXPR = process.env.NFT_CRON || '0 5 * * *';

cron.schedule(CRON_EXPR, async () => {
  console.log('🕓  NFT cron sync started');

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const links = await UserLink.find({});

    for (const u of links) {
      const counts = await fetchBalances(u.wallet);
      const { genesis, bandit } = aggregate(counts);

      await saveHolding(u.discordId, u.wallet, counts, genesis, bandit);

      try {
        const member = await guild.members.fetch(u.discordId);
        await syncRoles(member, genesis, bandit);
      } catch (e) {
        console.warn(`Member ${u.discordId} not found in the guild`);
      }
    }

    console.log(`✅  Cron completed: ${links.length} users synced`);
  } catch (err) {
    console.error('Global cron error', err);
  }
});
