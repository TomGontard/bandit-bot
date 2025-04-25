// src/events/ready.js
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    for (const guild of client.guilds.cache.values()) {
      const invites = await guild.invites.fetch();
      client.cachedInvites = invites.reduce((acc, invite) => {
        acc.set(invite.code, invite.uses);
        return acc;
      }, new Map());
    }

    console.log(`✅ Logged in as ${client.user.tag}`);
  }
};
