// src/utils/inviteUtils.js
import InviteCache from '../services/models/InviteCache.js';

export async function saveInviteSnapshot(guild) {
  const invites = await guild.invites.fetch();
  for (const invite of invites.values()) {
    await InviteCache.findOneAndUpdate(
      { guildId: guild.id, code: invite.code },
      {
        guildId: guild.id,
        code: invite.code,
        uses: invite.uses || 0,
        inviterId: invite.inviter.id,
      },
      { upsert: true, new: true }
    );
  }
}

export async function loadCachedInvites(guildId) {
  const records = await InviteCache.find({ guildId });
  const map = new Map();
  for (const r of records) {
    map.set(r.code, r.uses);
  }
  return map;
}

export async function deleteExpiredInvites(guild) {
  const current = await guild.invites.fetch();
  const allCodes = new Set([...current.keys()]);
  await InviteCache.deleteMany({
    guildId: guild.id,
    code: { $nin: Array.from(allCodes) },
  });
  console.log('🧹 Removed expired invites from cache');
}
