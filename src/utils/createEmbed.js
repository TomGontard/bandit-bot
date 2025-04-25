// src/utils/createEmbed.js
const { EmbedBuilder } = require('discord.js');

function createEmbed({ title, description, color = 0xFF7133, footer = true, interaction }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);

  if (footer && interaction?.guild) {
    embed.setFooter({
      text: 'BanditBot • Made by CrypTom',
      iconURL: interaction.client.user.displayAvatarURL() || undefined
    });
  }

  return embed;
}

module.exports = { createEmbed };
