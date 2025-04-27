// src/commands/walletmessage.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('walletmessage')
    .setDescription('Broadcast the “link your wallet” onboarding message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    /* ---------- EMBED ---------- */
    const embed = createEmbed({
      interaction,
      title: '🔐 Link your wallet — unlock the Bandit life',
      color: 0xff7133,
      description:
`**Wallet = Identity.**  
No wallet linked ? No perks. It’s that simple.

### Why you MUST link your Monad wallet
• 🎫 **Whitelists** — eligible NFTs & community raffles are checked on-chain  
• 🎁 **Giveaways & airdrops** — only verified wallets are picked  
• 🏆 **Roles & access** — Some roles are synced automatically  
• 📅 **Events** — tournaments, quizzes, drops…

### Quick commands to type in <#${process.env.CHANNEL_GENERAL_ID}>
🪙 \`/savewallet <address>\` — link your address  
👁️ \`/checkwallet\` — see what’s linked  
🔄 \`/sync\` — refresh roles + WL balance

> _“Bandits talk, wallets prove.”_
`
    });

    /* ---------- BUTTONS ---------- */
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('savewallet')
        .setLabel('/savewallet')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setCustomId('checkwallet')
        .setLabel('/checkwallet')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👁️'),
      new ButtonBuilder()
        .setCustomId('sync')
        .setLabel('/sync')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄'),
    );

    /* ---------- SINGLE PUBLIC MESSAGE ---------- */
    // répond publiquement dans le salon courant
    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
