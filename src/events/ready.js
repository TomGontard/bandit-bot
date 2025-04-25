// src/events/ready.js
const { saveInviteSnapshot, loadCachedInvites } = require('../utils/inviteUtils');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId);

    try {
      // 🧠 Try fetching invites from Discord
      const invites = await guild.invites.fetch();
      const mapped = invites.reduce((acc, invite) => {
        acc.set(invite.code, invite.uses || 0);
        return acc;
      }, new Map());

      client.cachedInvites = mapped;

      // 💾 Backup to DB
      await saveInviteSnapshot(guild);
      console.log('📦 Invite cache loaded and snapshot saved from Discord');

    } catch (err) {
      console.warn('⚠️ Failed to fetch invites from Discord. Falling back to DB…');

      // 🧱 Fallback to Mongo cache
      const fallback = await loadCachedInvites(guild.id);
      client.cachedInvites = fallback;

      console.log('📦 Cached invites loaded from database fallback');
    }

    console.log(`✅ Logged in as ${client.user.tag}`);
  }
};
