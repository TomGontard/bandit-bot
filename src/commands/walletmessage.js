// src/commands/walletmessage.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('walletmessage')
    .setDescription("Send the wallet onboarding message")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = createEmbed({
      title: "🔐 Join the Bandit Gang",
      description: `
To access secret roles and unlock hidden perks, you need to **link your Monad wallet** to your Discord account.

🪙 **/savewallet** → link your EVM address  
👁️ **/checkwallet** → verify your linked address  
🎭 **/sync** → sync your roles based on your NFT holdings

⚠️ Only linked members are eligible for rewards, airdrops, and exclusive events.

Welcome to the streets, rookie.
      `,
      interaction
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('/savewallet')
          .setCustomId('savewallet')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel('/checkwallet')
          .setCustomId('checkwallet')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('/sync')
          .setCustomId('sync')
          .setStyle(ButtonStyle.Success),
      );

    await interaction.reply({ content: '🧵', embeds: [embed], components: [row], ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};
