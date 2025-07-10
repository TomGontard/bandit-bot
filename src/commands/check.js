// src/commands/check.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserLink } from '../services/userLinkService.js';
import { checkAllPartners } from '../services/partnerService.js';
import Whitelist from '../services/models/Whitelist.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('check')
  .setDescription('Inspect wallet info and whitelist stats')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((o) =>
    o
      .setName('user')
      .setDescription('User to inspect')
      .setRequired(true)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('user');
  const isAdmin = interaction.member.permissions.has(
    PermissionFlagsBits.Administrator
  );

  const link = await getUserLink(target.id);
  if (!link) {
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ No Wallet Linked',
          description: `<@${target.id}> hasn’t linked any wallet yet.`,
          interaction,
        }),
      ],
      flags: 64,
    });
  }

  // Non-admins only get a basic response
  if (!isAdmin) {
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '🔗 Wallet Info',
          description: `<@${target.id}> has linked a wallet.`,
          interaction,
        }),
      ],
      flags: 64,
    });
  }

  // Admins get full breakdown
  await interaction.deferReply({ flags: 64 });

  const partnerCounts = await checkAllPartners(link.wallet);
  const eligibleNFTs = Object.values(partnerCounts).reduce((a, b) => a + b, 0);
  const partnerLines = Object.entries(partnerCounts)
    .map(([n, c]) => `• **${n}**: ${c}`)
    .join('\n') || '_No partner NFTs detected_';

  const wlRec =
    (await Whitelist.findOne({ discordId: target.id })) ?? {
      whitelistsNFTs: 0,
      whitelistsGiven: 0,
    };
  const totalWL = wlRec.whitelistsNFTs + wlRec.whitelistsGiven;

  const description = `
🔗 **Registered wallet:** \`${link.wallet}\`
🔢 **Registration #**: ${link.registrationNumber}

NFTs detected:
${partnerLines}

NFTs eligible for whitelist: **${eligibleNFTs}**

🎫 **Total whitelists:** **${totalWL}**
 • via NFTs: **${wlRec.whitelistsNFTs}**
 • staff-given: **${wlRec.whitelistsGiven}**
  `.trim();

  await interaction.editReply({
    embeds: [
      createEmbed({
        title: `📋 Sync Info for ${target.tag}`,
        description,
        interaction,
      }),
    ],
  });
}