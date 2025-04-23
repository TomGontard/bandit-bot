// src/events/guildMemberAdd.js
const InviteTrack = require('../services/models/InviteTrack');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = member.client.cachedInvites;
    member.client.cachedInvites = newInvites;

    const used = newInvites.find(inv => oldInvites.get(inv.code)?.uses < inv.uses);
    const inviter = used?.inviter;

    if (inviter) {
      await InviteTrack.create({
        invitedId: member.user.id,
        inviterId: inviter.id
      });
      console.log(`📥 ${inviter.tag} invited ${member.user.tag}`);
    }
  }
};
