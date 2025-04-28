// src/commands/savewallet.js
const { SlashCommandBuilder } = require('discord.js');
const { isAddress } = require('ethers');
const { createOrUpdateUserLink, isWalletLinked, getWalletByDiscordId } = require('../services/userLinkService');
const { createEmbed } = require('../utils/createEmbed');

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

    // ❌ Invalid address
    if (!isAddress(wallet)) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ Invalid Address',
          description: 'The address you provided is not a valid EVM address.',
          color: 0xFF0000,
          interaction,
        })],
        flags: 64
      });
    }

    // 🔍 Already registered by the same user?
    const currentWallet = await getWalletByDiscordId(discordId);
    if (currentWallet?.toLowerCase() === wallet.toLowerCase()) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '✅ Already Linked',
          description: 'This wallet is already linked to your account.\nYou’re all set for raffles, giveaways, and whitelists!',
          color: 0x00CC66,
          interaction,
        })],
        flags: 64
      });
    }

    // ❌ Already registered by another user?
    const alreadyLinked = await isWalletLinked(wallet);
    if (alreadyLinked) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ Wallet Already Linked',
          description: 'This wallet is already associated with another Discord account.',
          interaction,
        })],
        flags: 64
      });
    }

    // ✅ Link new wallet
    const user = await createOrUpdateUserLink(discordId, wallet);
    return interaction.reply({
      embeds: [createEmbed({
        title: '✅ Wallet Linked',
        description: `Your wallet \`${wallet}\` has been successfully linked.\nYou are user **#${user.registrationNumber}** to link a wallet.`,
        color: 0x00FF00,
        interaction,
      })],
      flags: 64
    });
  },
};
