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

// ⏰ 05 h 00 UTC tous les jours (modifiable via .env)
const CRON_EXPR = process.env.NFT_CRON || '0 5 * * *';

cron.schedule(CRON_EXPR, async () => {
  console.log('🕓  Cron NFT sync lancé');

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const links = await UserLink.find({});

    for (const u of links) {
      const counts             = await fetchBalances(u.wallet);
      const { genesis, bandit } = aggregate(counts);

      await saveHolding(u.discordId, u.wallet, counts, genesis, bandit);

      try {
        const member = await guild.members.fetch(u.discordId);
        await syncRoles(member, genesis, bandit);
      } catch (e) {
        console.warn(`Member ${u.discordId} introuvable`);
      }
    }

    console.log(`✅  Cron terminé : ${links.length} users vérifiés`);
  } catch (err) {
    console.error('Cron global error', err);
  }
});
