// src/events/guildMemberAdd.js
import Invite from '../services/models/Invite.js';

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    // 1️⃣ Detect which invite link was used
    const latestInvites = await member.guild.invites.fetch();
    const cache = member.client.cachedInvites || new Map();

    let used = null;
    for (const inv of latestInvites.values()) {
      const prevUses = cache.get(inv.code) || 0;
      if (inv.uses > prevUses) {
        used = inv;
        break;
      }
    }

    // Refresh cache
    member.client.cachedInvites = latestInvites.reduce(
      (m, i) => m.set(i.code, i.uses),
      new Map()
    );

    // 2️⃣ Persist in DB (avoids duplicates thanks to $addToSet)
    const inviter = used?.inviter;
    if (inviter) {
      await Invite.findOneAndUpdate(
        { inviterId: inviter.id },
        { $addToSet: { invitedIds: member.user.id } },
        { upsert: true, new: true }
      );
      console.log(`📥 ${inviter.tag} invited ${member.user.tag}`);
    }
  },
};
