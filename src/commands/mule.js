// src/commands/mule.js
const { SlashCommandBuilder } = require('discord.js');
const InviteTrack = require('../services/models/InviteTrack');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mule')
    .setDescription('Check your invite progress toward the Mule role'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const errandId = process.env.ROLE_ERRAND_ID;

    const invites = await InviteTrack.find({ inviterId: userId });
    const total = invites.length;

    let confirmed = 0;
    for (const invite of invites) {
      const member = await guild.members.fetch(invite.invitedId).catch(() => null);
      if (member?.roles.cache.has(errandId)) confirmed++;
    }

    const remaining = Math.max(0, 3 - confirmed);
    const eligible = confirmed >= 3;

    const embed = createEmbed({
      title: '<:MULE:1364560650487074858> Mule Progress',
      interaction,
      description:
        `📨 You have invited **${total}** member(s)\n` +
        `✅ Of those, **${confirmed}** have reached the **Errand** role\n\n` +
        (eligible
          ? '🎉 You are eligible for the **Mule** role — or you already have it!'
          : `🏃 Invite **${remaining}** more to unlock **Mule**.`)
    });

    await interaction.reply({
      embeds: [embed],
      flags: 64
    });
  }
};
