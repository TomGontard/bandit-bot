// src/utils/createEmbed.js
const { EmbedBuilder } = require('discord.js');

function createEmbed({ title, description, color = 0x8B00FF }) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "Made by CrypTom",
      iconURL: "https://cdn.discordapp.com/emojis/1364924729907085332.webp?size=96&quality=lossless"
    });
}


module.exports = { createEmbed };
