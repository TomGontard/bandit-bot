const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserLink }      = require('../services/userLinkService');
const { checkAllPartners } = require('../services/partnerService');
const Whitelist            = require('../services/models/Whitelist');
const { createEmbed }      = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Admin • Inspect partner-NFT holdings and whitelists')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    const link = await getUserLink(target.id);
    if (!link) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ No Wallet Linked',
          description: `<@${target.id}> hasn’t linked any wallet yet.`,
          interaction
        })],
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    const partnerCounts = await checkAllPartners(link.wallet);
    const eligibleNFTs  = Object.values(partnerCounts).reduce((a,b)=>a+b,0);
    const partnerLines  = Object.entries(partnerCounts)
      .map(([n,c]) => `• **${n}**: ${c}`)
      .join('\n') || '_No partner NFTs detected_';

    const wlRec   = await Whitelist.findOne({ discordId: target.id }) ?? { whitelistsNFTs: 0, whitelistsGiven: 0 };
    const totalWL = wlRec.whitelistsNFTs + wlRec.whitelistsGiven;

    const description = `
🔗 **Registered wallet:** \`${link.wallet}\`

NFTs detected:
${partnerLines}

NFTs eligible for whitelist: **${eligibleNFTs}**

🎫 **Total whitelists:** **${totalWL}**
 • via NFTs: **${wlRec.whitelistsNFTs}**
 • staff-given: **${wlRec.whitelistsGiven}**`.trim();

    await interaction.editReply({
      embeds: [createEmbed({
        title: `📋 Sync Info for ${target.tag}`,
        description,
        interaction
      })]
    });
  }
};
