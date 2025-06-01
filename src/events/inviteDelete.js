// src/events/inviteDelete.js
export default {
  name: 'inviteDelete',
  async execute(invite) {
    const client = invite.client;
    const cached = client.cachedInvites ?? new Map();

    cached.delete(invite.code);
    client.cachedInvites = cached;

    console.log(`❌ Invite deleted: ${invite.code}`);
  },
};
