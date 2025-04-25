// src/cron/checkMuleEligibility.js
const cron   = require('node-cron');
const client = require('../config/client');
const Invite = require('../services/models/Invite');

cron.schedule('*/30 * * * *', async () => { // Every 30 minutes
  const guild     = await client.guilds.fetch(process.env.GUILD_ID);
  const errandId  = process.env.ROLE_ERRAND_ID;
  const muleId    = process.env.ROLE_MULE_ID;

  const docs = await Invite.find({});
  console.log(`🕓 Checking Mule eligibility for ${docs.length} inviters`);

  for (const doc of docs) {
    const { inviterId, invitedIds } = doc;

    // How many of the invited users are now Errand?
    let confirmed = 0;
    for (const id of invitedIds) {
      const m = await guild.members.fetch(id).catch(() => null);
      if (m?.roles.cache.has(errandId)) confirmed++;
    }

    if (confirmed >= 3) {
      const inviter = await guild.members.fetch(inviterId).catch(() => null);
      if (inviter && !inviter.roles.cache.has(muleId)) {
        await inviter.roles.add(muleId, 'Invited 3 Errand members');
        console.log(`✅ ${inviter.user.tag} earned the Mule role`);
      }
    }
  }
});
