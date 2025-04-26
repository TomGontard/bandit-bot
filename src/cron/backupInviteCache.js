// src/cron/backupInviteCache.js
const cron = require('node-cron');
const client = require('../config/client');
const { saveInviteSnapshot, deleteExpiredInvites } = require('../utils/inviteUtils');

cron.schedule('*/15 * * * *', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await saveInviteSnapshot(guild);
    await deleteExpiredInvites(guild);
    console.log('💾 Invite cache snapshot updated');
  } catch (err) {
    console.error('❌ Failed to backup invite cache:', err);
  }
});