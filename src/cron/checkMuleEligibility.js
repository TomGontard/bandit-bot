// src/cron/checkMuleEligibility.js
const cron = require('node-cron');
const client = require('../config/client');
const InviteTrack = require('../services/models/InviteTrack');

cron.schedule('*/15 * * * *', async () => {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const members = await guild.members.fetch();
  const errandRoleId = process.env.ROLE_ERRAND_ID;
  const muleRoleId = process.env.ROLE_MULE_ID;

  const allTracks = await InviteTrack.find({});

  const inviterMap = new Map();

  for (const track of allTracks) {
    const invited = await guild.members.fetch(track.invitedId).catch(() => null);
    if (invited?.roles.cache.has(errandRoleId)) {
      const current = inviterMap.get(track.inviterId) || 0;
      inviterMap.set(track.inviterId, current + 1);
    }
  }

  for (const [inviterId, count] of inviterMap.entries()) {
    if (count >= 3) {
      const inviter = await guild.members.fetch(inviterId).catch(() => null);
      if (inviter && !inviter.roles.cache.has(muleRoleId)) {
        await inviter.roles.add(muleRoleId, 'Invited 3 Errand members');
        console.log(`✅ ${inviter.user.tag} received the Mule role`);
      }
    }
  }
});
