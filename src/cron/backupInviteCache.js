// src/cron/backupInviteCache.js
import cron from 'node-cron';
import client from '../config/client.js';
import { saveInviteSnapshot, deleteExpiredInvites } from '../utils/inviteUtils.js';

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