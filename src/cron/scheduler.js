// src/cron/scheduler.js
import cron from 'node-cron';
import UserLink from '../services/models/UserLink.js';
import { fetchBalances, aggregate } from '../services/nftChecker.js';
import { saveHolding, syncRoles } from '../services/holdingService.js';
import client from '../config/client.js';

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
