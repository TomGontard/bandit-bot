// src/commands/help.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Display the list of available commands"),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    let helpText = `📘 **Available Commands**\n\n`;

    // 🟢 Public commands
    helpText += `### 👥 For all users:\n`;
    helpText += `
- \`/savewallet <address>\`  
 🔗 Link your Discord account to your Monad wallet.

- \`/checkwallet\`  
 👁️ Show the currently linked EVM address.

- \`/sync\`  
 🔍 Check your NFT holdings (Genesis, Bandit, partners), update your Discord roles, and save your stats.
`;

    // 🔐 Admin-only commands
    if (isAdmin) {
      helpText += `\n### 🛠️ Admin-only commands:\n`;
      helpText += `
- \`/latesttweet\`  
 📡 Manually relay the latest tweet from the official account into the channel.

- \`/whitelist <discord_id>\`  
 🎫 Add a whitelist entry to a Discord user (stored in the database).

- \`/check <@user>\`  
 🧾 Display all Web3 data for a member (wallet, NFTs, whitelist count, registration order).
`;
    }

    return interaction.reply({ content: helpText, ephemeral: true });
  },
};
