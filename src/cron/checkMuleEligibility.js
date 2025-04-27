const cron       = require('node-cron');
const client     = require('../config/client');
const Invite     = require('../services/models/Invite');
const UserLink   = require('../services/models/UserLink');

cron.schedule('*/30 * * * *', async () => { // every 30 min
  const guild     = await client.guilds.fetch(process.env.GUILD_ID);
  const errandId  = process.env.ROLE_ERRAND_ID;
  const muleId    = process.env.ROLE_MULE_ID;
  const boosterId = process.env.ROLE_BOOSTER_ID;

  const docs = await Invite.find({});
  console.log(`🕓  Checking Mule eligibility for ${docs.length} inviters`);

  for (const doc of docs) {
    const { inviterId, invitedIds } = doc;

    // fetch inviter
    const inviter = await guild.members.fetch(inviterId).catch(() => null);
    if (!inviter) continue;

    // count valid invites: Errand + wallet
    let confirmed = 0;
    for (const id of invitedIds) {
      const m = await guild.members.fetch(id).catch(() => null);
      if (m?.roles.cache.has(errandId)) {
        const hasWallet = await UserLink.exists({ discordId: id });
        if (hasWallet) confirmed++;
      }
    }

    const hasBoost       = boosterId && inviter.roles.cache.has(boosterId);
    const alreadyHasRole = inviter.roles.cache.has(muleId);
    const eligible        = confirmed >= 3 || hasBoost;

    if (eligible && !alreadyHasRole) {
      await inviter.roles.add(muleId, 'Earned Mule role (cron)');
      console.log(`✅ ${inviter.user.tag} earned the Mule role (${confirmed} Errand+wallets${hasBoost ? ' + Booster' : ''})`);
    }
  }

  console.log('✅ Mule check complete');
});
