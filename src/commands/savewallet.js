const { SlashCommandBuilder } = require('discord.js');
const { isAddress } = require('ethers');
const { createOrUpdateUserLink, isWalletLinked } = require('../services/userLinkService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('savewallet')
    .setDescription("Link your EVM wallet to your Discord account")
    .addStringOption(option =>
      option.setName('address')
        .setDescription('Your EVM address (Monad)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const wallet = interaction.options.getString('address');

    if (!isAddress(wallet)) {
      return interaction.reply({ content: "❌ Invalid address.", ephemeral: true });
    }

    const alreadyLinked = await isWalletLinked(wallet);
    if (alreadyLinked) {
      return interaction.reply({ content: "❌ This address is already linked to another account.", ephemeral: true });
    }

    const user = await createOrUpdateUserLink(discordId, wallet);

    await interaction.reply({
      content: `✅ Your wallet ${wallet} has been successfully linked.\nYou are user **#${user.number}** to link an address.`,
      ephemeral: true
    });
  },
};
