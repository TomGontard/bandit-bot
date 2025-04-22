// src/commands/sync.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getWalletByDiscordId, getUserLink } = require('../services/userLinkService');
const { fetchBalances, aggregate } = require('../services/nftChecker');
const { saveHolding, syncRoles } = require('../services/holdingService');
const { partners } = require('../config/collections');
const checkCooldown = require('../utils/cooldown');
const NFTHolding = require('../services/models/NFTHolding');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Check your NFTs and sync your Discord roles'),

  async execute(interaction) {
    // ⏳ Cooldown check
    const remaining = checkCooldown(interaction.user.id, 'sync');
    if (remaining) {
      return interaction.reply({
        content: `⏳ Please wait **${Math.ceil(remaining / 1000)} seconds** before using \`/sync\` again.`,
        ephemeral: true,
      });
    }

    // Get linked wallet
    const wallet = await getWalletByDiscordId(interaction.user.id);
    if (!wallet)
      return interaction.reply({ content: '❌ No wallet linked yet. Use `/savewallet` first.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const counts = await fetchBalances(wallet);
    const { genesis, bandit } = aggregate(counts);

    // Save updated holdings to database
    await saveHolding(interaction.user.id, wallet, counts, genesis, bandit);

    // Update Discord roles accordingly
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await syncRoles(member, genesis, bandit);

    // Prepare result display
    const lines = partners
      .filter(p => counts[p.address] > 0)
      .map(p => `• **${p.name}**: ${counts[p.address]}`);

    const list = lines.length ? lines.join('\n') : '_No NFTs detected_';
    
    const userLink = await getUserLink(interaction.user.id);
    const holding = await NFTHolding.findOne({ discordId: interaction.user.id });

    const numberText = userLink?.registrationNumber
      ? `\n🔢 You are user **#${userLink.registrationNumber}** to link a wallet.`
      : '';

    const whitelistText = holding?.whitelistCount
      ? `\n🎫 Whitelists earned: **${holding.whitelistCount}**`
      : '';

    await interaction.editReply(
      `🔍 **Sync complete**\n` +
      `Genesis: **${genesis}**\nBandit: **${bandit}**\n\n` +
      `NFTs detected:\n${list}` +
      `${numberText}${whitelistText}`
    );
  },
};
