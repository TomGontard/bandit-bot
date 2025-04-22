// src/commands/checkwallet.js
const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId } = require('../services/userLinkService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkwallet')
    .setDescription("Display the EVM address linked to your Discord account (ephemeral)"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const wallet = await getWalletByDiscordId(discordId);

    if (!wallet) {
      return interaction.reply({
        content: "❌ You haven't linked **any** EVM address to your account yet.",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `✅ Your linked address is:\n\`${wallet}\``,
      ephemeral: true,
    });
  },
};
