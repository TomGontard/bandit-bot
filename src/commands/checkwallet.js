// src/commands/checkwallet.js
const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId } = require('../services/userLinkService');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkwallet')
    .setDescription("Display the EVM address linked to your Discord account (ephemeral)"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const wallet = await getWalletByDiscordId(discordId);

    if (!wallet) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ No Wallet Linked',
          description: "You haven't linked **any** EVM address to your account yet.",
          interaction,
        })],
        flags: 64,
      });
    }

    return interaction.reply({
      embeds: [createEmbed({
        title: '✅ Linked Wallet',
        description: `Your linked address is:\n\`${wallet}\``,
        interaction,
      })],
      flags: 64,
    });
  },
};
