// src/events/inviteCreate.js
export default {
  name: 'inviteCreate',
  async execute(invite) {
    const client = invite.client;
    const cached = client.cachedInvites ?? new Map();

    // Update cache with the new invite
    cached.set(invite.code, invite.uses ?? 0);
    client.cachedInvites = cached;

    console.log(`➕ New invite created: ${invite.code} by ${invite.inviter.tag}`);
  },
};
