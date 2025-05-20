// src/commands/mint.js – avec lien vers la page de mint
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const UserLink = require('../services/models/UserLink');
const Whitelist = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');

const BATCHS = [
  { name: 'Whitelist', roles: [], range: null, order: 1 },
  { name: '#201–#300', roles: [], range: [201, 300], order: 2 },
  { name: '#301–#400', roles: [], range: [301, 400], order: 3 },
  { name: '#401–#500', roles: [], range: [401, 500], order: 4 },
  { name: '#501–#600', roles: [], range: [501, 600], order: 5 },
  { name: '#601–#700', roles: [], range: [601, 700], order: 6 },
  { name: '#701–#800', roles: [], range: [701, 800], order: 7 },
  { name: '#801–#900', roles: [], range: [801, 900], order: 8 },
  { name: '#901–#1000', roles: [], range: [901, 1000], order: 9 },
  { name: '#1001–#1100', roles: [], range: [1001, 1100], order: 10 },
  { name: '#1101–#1200', roles: [], range: [1101, 1200], order: 11 },
  { name: '#1201–#1300', roles: [], range: [1201, 1300], order: 12 },
  { name: '#1301–#1400', roles: [], range: [1301, 1400], order: 13 },
  { name: '#1401–#1500', roles: [], range: [1401, 1500], order: 14 },
  { name: '#1501–#1600', roles: [], range: [1501, 1600], order: 15 },
];

function getBatch(member, registrationNumber) {
  for (const batch of BATCHS) {
    const hasRole = batch.roles.some(roleId => member.roles.cache.has(process.env[roleId]));
    const inRange = batch.range && registrationNumber >= batch.range[0] && registrationNumber <= batch.range[1];
    if (hasRole || inRange) return batch;
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mint')
    .setDescription('Get minting instructions and your batch allocation')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Check mint for another user (admin only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const selected = interaction.options.getUser('user');
    const userId = selected ? selected.id : interaction.user.id;

    if (selected && !isAdmin) {
      return interaction.editReply({ content: '❌ You do not have permission to check mint for others.', ephemeral: true });
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(userId);

    const link = await UserLink.findOne({ discordId: userId });
    if (!link) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '❌ No Wallet Linked',
          description: 'Use `/savewallet <your-address>` to link your wallet before the mint.',
          interaction
        })]
      });
    }

    const wl = await Whitelist.findOne({ discordId: userId });
    const wlCount = (wl?.whitelistsGiven || 0) + (wl?.whitelistsNFTs || 0);

    const batch = getBatch(member, link.registrationNumber);
    const batchText = batch
      ? [
          `⏳ Given your wallet registration number, you are in **Batch #${batch.order - 1}**`,
          `which will allow you to mint an additional NFT, ${batch.order - 1} hours after launch.`,
          `🕒 This is a FCFS whitelist; it only allows you to mint if the supply isn't sold out.`
        ].join('\n')
      : '⏳ As an Early Gang, you are already whitelisted on launch.';

    const embed = createEmbed({
      title: '🧪 Bandit Mint Info',
      description: [
        '**🗓️ Date:** TBA',
        '**💰 Price:** 5 $MON',
        '',
        'The mint will occur in hourly **batches**. At first, only whitelisted users can mint.',
        '',
        'Then, every hour a new batch opens:',
        '• **Batch 1**: Wallet registration number between #201–#300',
        '• **Batch 2**: Wallet registration number between #301–#400',
        '• **Batch 3**: Wallet registration number between #401–#500',
        '• **Batch 4**: Wallet registration number between #501–#600',
        '• **Next batches**: registration #601+, by hundreds...',
        '-# First 200 wallets are already whitelisted and can therefore mint on launch.',
        '',
        `🎫 You currently have **${wlCount}** GTD whitelist${wlCount === 1 ? '' : 's'} – and will therefore be able to mint **${wlCount}** NFT${wlCount === 1 ? '' : 's'} on launch.`,
        '',
        `${batchText}`,
        '',
        '🔍 Use `/sync` to check your registration number',
        '',
        '-# Your address which you will be able to mint from is the one you saved, check with `/sync`.',
        '',
        '👉 **Mint page:** https://www.monadbandit.xyz/genesismint'
      ].join('\n'),
      interaction
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
