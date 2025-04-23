// src/commands/mule.js
const { SlashCommandBuilder } = require('discord.js');
const InviteTrack = require('../services/models/InviteTrack');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mule')
    .setDescription("Check how many users you’ve invited and how many became Errand"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guild = interaction.guild;
    const errandRoleId = process.env.ROLE_ERRAND_ID;

    const invites = await InviteTrack.find({ inviterId: discordId });
    const total = invites.length;

    let valid = 0;

    for (const invite of invites) {
      const member = await guild.members.fetch(invite.invitedId).catch(() => null);
      if (member?.roles.cache.has(errandRoleId)) valid++;
    }

    await interaction.reply({
      ephemeral: true,
      content:
        `📨 You have invited **${total}** member(s)\n` +
        `✅ Of those, **${valid}** have reached the rank of **Errand**\n\n` +
        (valid >= 3
          ? "🐴 You are eligible for the **Mule** role — or you already have it!"
          : `🏃 Invite **${3 - valid}** more Errands to get the **Mule** role!`)
    });
  }
};
