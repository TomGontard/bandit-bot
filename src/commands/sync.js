// src/commands/sync.js
import { SlashCommandBuilder } from 'discord.js';
import { getWalletByDiscordId, getUserLink } from '../services/userLinkService.js';
import { checkAllPartners } from '../services/partnerService.js';
import Whitelist from '../services/models/Whitelist.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('sync')
  .setDescription('Sync partner-NFT holdings and whitelist stats');

export async function execute(interaction) {
  // Wallet check
  const wallet = await getWalletByDiscordId(interaction.user.id);
  if (!wallet) {
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ No Wallet Linked',
          description: 'Use `/savewallet` to link a wallet first.',
          interaction,
        }),
      ],
      flags: 64, // Ephemeral
    });
  }

  await interaction.deferReply({ flags: 64 });

  // Partner NFTs
  const partnerCounts = await checkAllPartners(wallet);
  const eligibleNFTs = Object.values(partnerCounts).reduce((a, b) => a + b, 0);

  // Update whitelist NFT count
  let wlRec =
    (await Whitelist.findOne({ discordId: interaction.user.id })) ??
    (await Whitelist.create({ discordId: interaction.user.id }));
  wlRec.whitelistsNFTs = eligibleNFTs;
  await wlRec.save();

  // Format NFTs detected
  const partnerLines =
    Object.entries(partnerCounts)
      .map(([name, cnt]) => `• **${name}**: ${cnt}`)
      .join('\n') || '_No partner NFTs detected_';

  // Registration info
  const link = await getUserLink(interaction.user.id);
  const regNumber = link?.registrationNumber ?? '–';

  // Discord role weight
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const weights = {
    [process.env.ROLE_ERRAND_ID]: 1.0,
    [process.env.ROLE_MULE_ID]: 1.25,
    [process.env.ROLE_GANGSTER_ID]: 1.5,
    [process.env.ROLE_UNDERBOSS_ID]: 1.75,
    [process.env.ROLE_BOSS_ID]: 2.0,
  };

  let roleMultiplier = 1.0;
  for (const [roleId, weight] of Object.entries(weights)) {
    if (member.roles.cache.has(roleId)) {
      roleMultiplier = Math.max(roleMultiplier, weight);
    }
  }

  // Bonus multiplier based on registration number (earlier users get better odds)
  let regMultiplier = 1.0;
  if (typeof regNumber === 'number') {
    if (regNumber <= 100) regMultiplier = 1.5;
    else if (regNumber <= 250) regMultiplier = 1.25;
    else if (regNumber <= 500) regMultiplier = 1.1;
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
    embeds: [
      createEmbed({
        title: '🔍 Sync Complete',
        description,
        interaction,
      }),
    ],
  });
}
