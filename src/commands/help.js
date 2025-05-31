// src/commands/help.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Display the list of available commands');

export async function execute(interaction) {
  const isAdmin = interaction.member.permissions.has(
    PermissionFlagsBits.Administrator
  );

  let description = `📘 **Available Commands**\n\n`;

  // 🟢 Public commands
  description += `### 👥 For all users:\n`;
  description +=
    `- \`/savewallet <address>\`  \n` +
    ` 🔗 Link your Discord account to your Monad wallet.\n` +
    `- \`/checkwallet\`  \n` +
    ` 👁️ Show the currently linked EVM address.\n` +
    `- \`/sync\`  \n` +
    ` 🔍 Check your NFT holdings (Genesis, Bandit, partners), update your Discord roles, and save your stats.\n` +
    `- \`/mule\`  \n` +
    ` <:MULE:1364560650487074858> Show your invite progress toward the Mule role.\n`;

  // 🔐 Admin-only commands
  if (isAdmin) {
    description += `\n### 🛠️ Admin-only commands:\n`;
    description +=
      `- \`/walletmessage\`  \n` +
      ` 📨 Send the wallet onboarding message in the channel.\n` +
      `- \`/check <@user>\`  \n` +
      ` 🧾 Display all Web3 data for a member (wallet, NFTs, whitelists, etc).\n` +
      `- \`/whitelist <discord_id>\`  \n` +
      ` 🎫 Add a whitelist entry to a user.\n` +
      `- \`/invited <@user>\`  \n` +
      ` 📬 Show how many users a member has invited and their invite links.\n` +
      `- \`/latesttweet\`  \n` +
      ` 📡 Manually relay the latest tweet into the channel.\n`;
  }

  const embed = createEmbed({
    title: '❓ Help Menu',
    description,
    interaction,
  });

  return interaction.reply({
    embeds: [embed],
    flags: 64, // Ephemeral
  });
}
