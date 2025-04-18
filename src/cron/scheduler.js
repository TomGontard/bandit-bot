// src/cron/scheduler.js
const cron = require('node-cron');
const UserLink = require('../services/models/UserLink');
const client = require('../config/client');
const { fetchBalances, aggregate } = require('../services/nftChecker');
const { saveHolding, syncRoles } = require('../services/holdingService');

cron.schedule('0 5 * * *', async () => {         // tous les jours à 05:00 UTC
  console.log('🕓 Cron NFT sync lancé');
  const users = await UserLink.find({});
  for (const u of users) {
    const counts = await fetchBalances(u.wallet);
    const { genesis, bandit } = aggregate(counts);
    await saveHolding(u.discordId, u.wallet, counts, genesis, bandit);

    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(u.discordId);
      await syncRoles(member, genesis, bandit);
    } catch (e) {
      console.error('Cron role sync error', e);
    }
  }
});
