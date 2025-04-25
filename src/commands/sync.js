// src/commands/sync.js
const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId, getUserLink } = require('../services/userLinkService');
const { fetchBalances, aggregate } = require('../services/nftChecker');
const { saveHolding, syncRoles } = require('../services/holdingService');
const { partners } = require('../config/collections');
const checkCooldown = require('../utils/cooldown');
const NFTHolding = require('../services/models/NFTHolding');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Check your NFTs and sync your Discord roles'),

  async execute(interaction) {
    const remaining = checkCooldown(interaction.user.id, 'sync');
    if (remaining) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '⏳ Cooldown Active',
          description: `Please wait **${Math.ceil(remaining / 1000)} seconds** before using \`/sync\` again.`
        })],
        flags: 64,
      });
    }

    const wallet = await getWalletByDiscordId(interaction.user.id);
    if (!wallet) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ No Wallet Linked',
          description: 'Use `/savewallet` first to link your address.'
        })],
        flags: 64,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const counts = await fetchBalances(wallet);
    const { genesis, bandit } = aggregate(counts);

    await saveHolding(interaction.user.id, wallet, counts, genesis, bandit);

    const member = await interaction.guild.members.fetch(interaction.user.id);
    await syncRoles(member, genesis, bandit);

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

    await interaction.editReply({
      embeds: [createEmbed({
        title: '🔍 Sync Complete',
        description: `Genesis: **${genesis}**\nBandit: **${bandit}**\n\nNFTs detected:\n${list}${numberText}${whitelistText}`,
        interaction
      })],
    });
  },
};
