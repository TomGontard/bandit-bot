// src/commands/walletmessage.js
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType,
} from 'discord.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('walletmessage')
  .setDescription('Broadcast the “link your wallet” onboarding message')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  /* ---------- EMBED ---------- */
  const embed = createEmbed({
    interaction,
    title: '🔐 Link your wallet — unlock the Bandit life',
    color: 0xff7133,
    description: [
      '**Wallet = Identity.**  No wallet linked ? No perks. It’s that simple.',
      '',
      '### Why you NEED to link & verify',
      '• 🎫 **Giveaways / Airdrops** are on-chain-checked',
      '• 🏆 **Roles & access** auto-synced',
      '• 📅 **Events** — tournaments, quizzes, drops…',
      '',
      '---',
      'Click **Link Wallet** to enter your address — you’ll then verify by sending **0.1 MON to yourself**.\nIt proves you control the private key.',
    ].join('\n'),
  });

  /* ---------- BUTTONS ---------- */
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('link_wallet')
      .setLabel('Link Wallet')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔗'),
    new ButtonBuilder()
      .setCustomId('your_wallet')
      .setLabel('Your EVM Wallet')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👁️')
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
