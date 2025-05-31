// src/commands/mint.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import UserLink from '../services/models/UserLink.js';
import Whitelist from '../services/models/Whitelist.js';
import { createEmbed } from '../utils/createEmbed.js';

const BATCHS = [
  { name: 'Whitelist', roles: [], range: null, order: 1 },
  { name: 'Bosses or #201–#300', roles: ['ROLE_BOSS_ID'], range: [201, 300], order: 2 },
  { name: 'Underboss or #301–#400', roles: ['ROLE_UNDERBOSS_ID'], range: [301, 400], order: 3 },
  { name: 'Gangster or #401–#500', roles: ['ROLE_GANGSTER_ID'], range: [401, 500], order: 4 },
  { name: '#501–#600', roles: [], range: [501, 600], order: 5 },
  { name: '#601–#700', roles: [], range: [601, 700], order: 6 },
  { name: '#701–#800', roles: [], range: [701, 800], order: 7 },
  { name: '#801–#900', roles: [], range: [801, 900], order: 8 },
  { name: '#901–#1000', roles: [], range: [901, 1000], order: 9 },
  { name: '#1001–#1100', roles: [], range: [1001, 1100], order: 10 },
  { name: '#1101–#1200', roles: [], range: [1101, 1200], order: 11 },
  { name: '#1201–#1300', roles: [], range: [1201, 1300], order: 12 },
];

function getBatch(member, registrationNumber) {
  for (const batch of BATCHS) {
    const hasRole = batch.roles.some((roleId) =>
      member.roles.cache.has(process.env[roleId])
    );
    const inRange =
      batch.range &&
      registrationNumber >= batch.range[0] &&
      registrationNumber <= batch.range[1];
    if (hasRole || inRange) return batch;
  }
  return null; // fallback if outside range
}

export const data = new SlashCommandBuilder()
  .setName('mint')
  .setDescription('Get minting instructions and your batch allocation')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const guild = interaction.guild;
  const member = await guild.members.fetch(userId);

  const link = await UserLink.findOne({ discordId: userId });
  if (!link) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ No Wallet Linked',
          description:
            'Use `/savewallet <your-address>` to link your wallet before the mint.',
          interaction,
        }),
      ],
    });
  }

  const wlRecord = await Whitelist.findOne({ discordId: userId });
  const wlCount =
    (wlRecord?.whitelistsGiven || 0) + (wlRecord?.whitelistsNFTs || 0);

  const batch = getBatch(member, link.registrationNumber);
  const batchText = batch
    ? `⏳ You are in **Batch #${batch.order} – ${batch.name}**`
    : '🕒 You will mint in the later public batches.';

  const embed = createEmbed({
    title: '🧪 Bandit Mint Info',
    description: [
      '**🗓️ Date:** TBA',
      '**💰 Price:** 2.5 $MON',
      '',
      'The mint will occur in hourly **batches**. The first batch is for whitelisted users only.',
      '',
      '**📜 How to get whitelisted:** Twitter giveaways, Discord raffles, contests, activity & contribution.',
      '',
      'Then, every hour a new batch opens:',
      '• **Batch 2**: Boss role or registration #201–#300',
      '• **Batch 3**: Underboss or #301–#400',
      '• **Batch 4**: Gangster or #401–#500',
      '• **Batch 5**: Mule or #501–#600',
      '• **Next batches**: registration #601+, by hundreds...',
      '',
      `🎫 You currently have **${wlCount}** whitelist${
        wlCount === 1 ? '' : 's'
      } – eligible for Batch 1 minting.`,
      batchText,
      '',
      '🔍 Use `/sync` to verify your wallet is linked',
      '[🔗 Open the Mint page](https://example.com/mint)',
      '[🧾 Check the whitelist & registration](https://example.com/checker)',
    ].join('\n'),
    interaction,
  });

  await interaction.editReply({ embeds: [embed] });
}
