// src/cron/checkMuleEligibility.js
const cron = require('node-cron');
const client = require('../config/client');
const InviteTrack = require('../services/models/InviteTrack');

cron.schedule('*/1 * * * *', async () => {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const errandId = process.env.ROLE_ERRAND_ID;
  const muleId = process.env.ROLE_MULE_ID;

  const tracks = await InviteTrack.find({});
  const map = new Map();

  for (const track of tracks) {
    const invited = await guild.members.fetch(track.invitedId).catch(() => null);
    if (invited?.roles.cache.has(errandId)) {
      const count = map.get(track.inviterId) || 0;
      map.set(track.inviterId, count + 1);
    }
  }

  for (const [inviterId, count] of map.entries()) {
    if (count >= 3) {
      const inviter = await guild.members.fetch(inviterId).catch(() => null);
      if (inviter && !inviter.roles.cache.has(muleId)) {
        await inviter.roles.add(muleId, 'Invited 3 Errand members');
        console.log(`✅ ${inviter.user.tag} has earned the Mule role`);
      }
    }
  }
});
