// src/commands/walletmessage.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('walletmessage')
    .setDescription("Envoie le message d'onboarding wallet")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // admin only

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x8B00FF)
      .setTitle("🔐 Rejoins le gang des Bandits")
      .setDescription(`
Pour accéder aux rôles secrets, tu dois **lier ton wallet Monad** à ton compte Discord.

🪙 **/savewallet** → associe ton adresse EVM  
👁️ **/checkwallet** → vérifie ton lien actuel  
🎭 **/sync** → synchronise tes rôles avec tes NFTs

⚠️ Seuls les membres liés peuvent prétendre aux récompenses et events.

Bienvenue dans la rue, rookie.
      `)
      .setFooter({ text: 'BanditBot • Monad powered', iconURL: interaction.client.user.displayAvatarURL() });

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
