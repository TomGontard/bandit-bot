// src/commands/help.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Display the list of available commands"),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    let description = `📘 **Available Commands**\n\n`;

    // 🟢 Public commands
    description += `### 👥 For all users:\n`;
    description += `
` +
      `- \`/savewallet <address>\`  
 🔗 Link your Discord account to your Monad wallet.
` +
      `- \`/checkwallet\`  
 👁️ Show the currently linked EVM address.
` +
      `- \`/sync\`  
 🔍 Check your NFT holdings (Genesis, Bandit, partners), update your Discord roles, and save your stats.
` +
      `- \`/mule\`  
 <:MULE:1364560650487074858> Show your invite progress toward the Mule role.
`;

    // 🔐 Admin-only commands
    if (isAdmin) {
      description += `\n### 🛠️ Admin-only commands:\n`;
      description += `
` +
        `- \`/walletmessage\`  
 📨 Send the wallet onboarding message in the channel.
` +
        `- \`/check <@user>\`  
 🧾 Display all Web3 data for a member (wallet, NFTs, whitelists, etc).
` +
        `- \`/whitelist <discord_id>\`  
 🎫 Add a whitelist entry to a user.
` +
        `- \`/invited <@user>\`  
 📬 Show how many users a member has invited and their invite links.
` +
        `- \`/latesttweet\`  
 📡 Manually relay the latest tweet into the channel.
`;
    }

    const embed = createEmbed({
      title: '❓ Help Menu',
      description,
      interaction,
    });

    return interaction.reply({
      embeds: [embed],
      flags: 64,
    });
  },
};
