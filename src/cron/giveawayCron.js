// src/cron/giveawayCron.js
// ──────────────────────────────────────────────────────────────
// Automatic whitelist giveaway
//  • Runs every X hours (CRON from .env or default “0 */6 * * *” → every 6 h)
//  • Same eligibility & weighting rules as /giveaway
//  • Posts winners in #announcements with an @Errand ping
// ──────────────────────────────────────────────────────────────
const cron           = require('node-cron');
const client         = require('../config/client');
const UserLink       = require('../services/models/UserLink');
const Whitelist      = require('../services/models/Whitelist');
const { createEmbed }= require('../utils/createEmbed');

// ───── configuration via ENV ─────
const CRON_EXPR   = process.env.GIVEAWAY_CRON; 
const PRIZE_COUNT = parseInt(process.env.GIVEAWAY_AUTO_AMOUNT ?? '1', 10);

// Bandit-role weights (same as /giveaway)
const weights = {
  [process.env.ROLE_ERRAND_ID]    : 1.00,
  [process.env.ROLE_MULE_ID]      : 1.25,
  [process.env.ROLE_GANGSTER_ID]  : 1.50,
  [process.env.ROLE_UNDERBOSS_ID] : 1.75,
  [process.env.ROLE_BOSS_ID]      : 2.00,
};

// helper: pick N unique winners from weighted pool
function pickWinners(pool, n) {
  const winners = new Set();
  while (winners.size < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.add(pool.splice(idx, 1)[0]);
  }
  return [...winners];
}

cron.schedule(CRON_EXPR, async () => {
  console.log('🕓  Auto-giveaway cron started');

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    /* ────── build weighted pool ────── */
    const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
    if (!errandRole) {
      console.warn('⚠️  Errand role missing – aborting raffle.');
      return;
    }

    const members = await guild.members.fetch({ withPresences:false });
    const pool    = [];

    for (const member of members.values()) {

      if (!member.roles.cache.has(errandRole.id)) continue;          // not Errand
      const linked = await UserLink.exists({ discordId: member.id });
      if (!linked) continue;                                        // no wallet

      // highest multiplier
      let mult = 1;
      for (const [rid, w] of Object.entries(weights)) {
        if (member.roles.cache.has(rid)) mult = Math.max(mult, w);
      }

      for (let i = 0; i < mult * 100; i++) pool.push(member.id);    // weight
    }

    if (pool.length === 0) {
      console.log('⚠️  No eligible users; raffle skipped.');
      return;
    }

    const winners = pickWinners(pool, PRIZE_COUNT);
    if (winners.length === 0) {
      console.log('⚠️  Pool too small; raffle skipped.');
      return;
    }

    /* ────── DB update ────── */
    for (const id of winners) {
      await Whitelist.findOneAndUpdate(
        { discordId: id },
        { $inc: { whitelistsGiven: 1 },
          $push: { whitelistsLogs: {
            type   : 'manual',
            amount : 1,
            reason : 'Automatic giveaway',
            staffId: 'SYSTEM',
          } } },
        { upsert: true, new: true }
      );
    }
  
    /* ────── post announcement ────── */
    const annChannel = await guild.channels.fetch(process.env.CHANNEL_ANNOUNCEMENTS_ID);
    const ping       = process.env.ROLE_ERRAND_ID ? `<@&${process.env.ROLE_ERRAND_ID}> ` : '';

    const embed = createEmbed({
      title: `A GiveAway just took place and ${winners.length} whitelist${winners.length>1?'s':''} got distributed! 🎉`,
      description: winners
        .map((id,i)=>`**${i+1}.** <@${id}> — +1 WL`)
        .join('\n')
        + '\n\n> Use `/savewallet <address>` to enter future raffles!',
      interaction: { client, guild },
    });

    await annChannel.send({
      content: `${ping}New whitelist giveaway! 🤘🔥`,
      embeds: [embed],
        allowed_mentions: {
            parse: ['roles'],   // autorise le ping du rôle @Errand
            users: winners      // autorise uniquement le ping des gagnants
        }
    });

    console.log(`✅ Raffle complete – ${winners.length} winner(s) posted`);

  } catch (err) {
    console.error('❌ Auto-giveaway error', err);
  }
});
