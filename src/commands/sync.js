const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId, getUserLink } = require('../services/userLinkService');
const { checkAllPartners } = require('../services/partnerService');
const Whitelist = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');
const { roles: roleWeights, registrationMultipliers } = require('../config/giveawayWeights');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync partner-NFT holdings and whitelist stats'),

  async execute(interaction) {
    // Wallet check
    const wallet = await getWalletByDiscordId(interaction.user.id);
    if (!wallet) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ No Wallet Linked',
          description: 'Use `/savewallet` to link a wallet first.',
          interaction
        })],
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    // Partner NFTs
    const partnerCounts = await checkAllPartners(wallet);
    const eligibleNFTs = Object.values(partnerCounts).reduce((a, b) => a + b, 0);

    // Update whitelist NFT count
    let wlRec = await Whitelist.findOne({ discordId: interaction.user.id }) ??
                await Whitelist.create({ discordId: interaction.user.id });
    wlRec.whitelistsNFTs = eligibleNFTs;
    await wlRec.save();

    // Format NFTs detected
    const partnerLines = Object.entries(partnerCounts)
      .map(([name, cnt]) => `• **${name}**: ${cnt}`)
      .join('\n') || '_No partner NFTs detected_';

    // Registration info
    const link = await getUserLink(interaction.user.id);
    const regNumber = link?.registrationNumber ?? '–';

    // Discord role weight
    const member = await interaction.guild.members.fetch(interaction.user.id);
    let roleMultiplier = 1.0;
    for (const [roleId, weight] of Object.entries(roleWeights)) {
      if (member.roles.cache.has(roleId)) {
        roleMultiplier = Math.max(roleMultiplier, weight);
      }
    }

    // Bonus multiplier based on registration number (earlier users get better odds)
    let regMultiplier = 1.0;
    if (typeof regNumber === 'number') {
      for (const { min, max, weight } of registrationMultipliers) {
        if (regNumber >= min && regNumber <= max) {
          regMultiplier = weight;
          break;
        }
      }
    }

    const finalChances = Math.round(roleMultiplier * regMultiplier * 100);

    // Build embed
    const totalWL = wlRec.whitelistsNFTs + wlRec.whitelistsGiven;
    const description = `
🔗 **Registered wallet:** \`${wallet}\`
🔢 **Registration number:** #${regNumber}

NFTs detected:
${partnerLines}
NFTs eligible for whitelist: **${eligibleNFTs}**
> Selling eligible NFTs removes those whitelist slots.

🎰 **Giveaway chances:** **${finalChances} tickets**
🎫 **Total whitelists:** **${totalWL}**
`.trim();

    await interaction.editReply({
      embeds: [createEmbed({
        title: '🔍 Sync Complete',
        description,
        interaction
      })]
    });
  }
};
