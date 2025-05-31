// src/commands/help.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show the list of all available commands');

export async function execute(interaction) {
  const isAdmin = interaction.member.permissions.has(
    PermissionFlagsBits.Administrator
  );

  let description = `📘 **Available commands**\n\n`;

  // 🔓 Commandes publiques
  description += `### 👥 For all users:\n`;
  description +=
    `- \`/wallet\`\n` +
    ` 🔗 Show your Monad wallet : roles (Genesis, Mule…), your giveaway's tickets and your progression.\n`;

  // 🔐 Commandes admin
  if (isAdmin) {
    description += `\n### 🛠️ Réservé aux admins:\n`;
    description +=
      `- \`/walletmessage\`\n` +
      ` 📨 Envoie le message d'onboarding wallet dans le salon.\n` +
      `- \`/whitelist <discord_id>\`\n` +
      ` 🎫 Ajoute un utilisateur à la whitelist manuellement.\n`;
  }

  const embed = createEmbed({
    title: '❓ Help menu',
    description,
    interaction,
  });

  return interaction.reply({
    embeds: [embed],
    flags: 64, // Message éphémère
  });
}
