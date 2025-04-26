const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId, getUserLink } = require('../services/userLinkService');
const { checkAllPartners }   = require('../services/partnerService');
const Whitelist              = require('../services/models/Whitelist');
const { createEmbed }        = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync partner-NFT holdings and whitelist stats'),

  async execute(interaction) {
    /* wallet check */
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

    /* partner NFTs */
    const partnerCounts = await checkAllPartners(wallet);     // e.g. { 'GTG Closed-Eye': 2 }
    const eligibleNFTs  = Object.values(partnerCounts).reduce((a,b)=>a+b,0);

    /* persist whitelist-by-NFT */
    let wlRec = await Whitelist.findOne({ discordId: interaction.user.id }) ??
                await Whitelist.create({ discordId: interaction.user.id });
    wlRec.whitelistsNFTs = eligibleNFTs;
    await wlRec.save();

    const partnerLines = Object.entries(partnerCounts)
      .map(([name,cnt]) => `• **${name}**: ${cnt}`)
      .join('\n') || '_No partner NFTs detected_';

    /* totals */
    const totalWL = wlRec.whitelistsNFTs + wlRec.whitelistsGiven;
    const link    = await getUserLink(interaction.user.id);

    const description = `
🔗 **Registered wallet:** \`${wallet}\`

NFTs detected:
${partnerLines}
NFTs eligible for whitelist: **${eligibleNFTs}**

🎫 **Total whitelists:** **${totalWL}**

> Selling eligible NFTs removes those whitelist slots.`.trim();

    await interaction.editReply({
      embeds: [createEmbed({
        title: '🔍 Sync Complete',
        description,
        interaction
      })]
    });
  }
};
