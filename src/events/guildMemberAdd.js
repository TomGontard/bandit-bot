// src/events/guildMemberAdd.js
const InviteTrack = require('../services/models/InviteTrack');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const newInvites = await member.guild.invites.fetch();
    const cachedInvites = member.client.cachedInvites || new Map();

    let usedInvite = null;

    for (const invite of newInvites.values()) {
      const prev = cachedInvites.get(invite.code) || 0;
      if (invite.uses > prev) {
        usedInvite = invite;
        break;
      }
    }

    member.client.cachedInvites = newInvites.reduce((acc, invite) => {
      acc.set(invite.code, invite.uses);
      return acc;
    }, new Map());

    const inviter = usedInvite?.inviter;
    if (inviter) {
      await InviteTrack.create({
        invitedId: member.user.id,
        inviterId: inviter.id,
      });
      console.log(`📥 ${inviter.tag} invited ${member.user.tag}`);
    }
  },
};
