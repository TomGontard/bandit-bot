// src/commands/savewallet.js
const { SlashCommandBuilder } = require('discord.js');
const { isAddress } = require('ethers');
const { createOrUpdateUserLink, isWalletLinked } = require('../services/userLinkService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('savewallet')
    .setDescription("Associe ton wallet à ton compte Discord (test)")
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Ton adresse EVM (Monad)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const wallet = interaction.options.getString('address');

    if (!isAddress(wallet)) {
      return interaction.reply({ content: "❌ Adresse invalide", ephemeral: true });
    }

    const alreadyLinked = await isWalletLinked(wallet);
    if (alreadyLinked) {
      return interaction.reply({ content: "❌ Cette adresse est déjà liée à un autre compte.", ephemeral: true });
    }

    await createOrUpdateUserLink(discordId, wallet);
    await interaction.reply({ content: `✅ Ton wallet ${wallet} a bien été lié à ton compte.`, ephemeral: true });
  },
};
