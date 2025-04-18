// src/commands/checkwallet.js
const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId } = require('../services/userLinkService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkwallet')
    .setDescription("Affiche l'adresse EVM liée à ton compte Discord (éphemeral)"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const wallet = await getWalletByDiscordId(discordId);

    if (!wallet) {
      return interaction.reply({
        content: "❌ Tu n'as encore lié **aucune** adresse EVM à ton compte.",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `✅ Ton adresse liée est :\n\`${wallet}\``,
      ephemeral: true,
    });
  },
};
