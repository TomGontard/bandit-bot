// src/commands/wallet.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getUserLink } from '../services/userLinkService.js';
import { getGenesisCount } from '../services/genesisService.js';
import { getBanditCount } from '../services/banditService.js';
import { getUtilityPassCount } from '../services/utilityService.js';
import buildProfile from '../utils/walletProfileEmbed.js';
import Player from '../services/models/Player.js';
import { getRoleMultiplier, computeTickets } from '../utils/tickets.js';
import WLAddress from '../services/models/WLAddress.js';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('View or link your wallet');

export async function execute(interaction) {
  const link = await getUserLink(interaction.user.id);
  if (!link) {
    const walletMsgCmd = interaction.client.commands.get('walletmessage');
    return walletMsgCmd.execute(interaction);
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const guildMember = await interaction.guild.members.fetch(interaction.user.id);

  // Always compare with lowercased address
  const wallet = (link.wallet || '').toLowerCase();

  // On-chain counts
  let genesisCount = 0, banditCount = 0, utilityCount = 0;
  try {
    [genesisCount, banditCount, utilityCount] = await Promise.all([
      getGenesisCount(wallet).catch(() => 0),
      getBanditCount(wallet).catch(() => 0),
      getUtilityPassCount(wallet).catch(() => 0),
    ]);
  } catch {}

  // Sync Genesis role
  const hasGenesisRole = guildMember.roles.cache.has(process.env.ROLE_GENESIS_ID);
  if (genesisCount > 0 && !hasGenesisRole) {
    await guildMember.roles.add(process.env.ROLE_GENESIS_ID, 'Owns Genesis Pass');
  } else if (genesisCount === 0 && hasGenesisRole) {
    await guildMember.roles.remove(process.env.ROLE_GENESIS_ID, 'No Genesis Pass');
  }

  // Level from Player
  const level = (await Player.findOne({ discordId: interaction.user.id }))?.level || 1;

  // Tickets = ((nftCount * 100) + (level * 25)) * roleMult
  const roleMult = getRoleMultiplier(guildMember);
  const nftCount = genesisCount; // ajoute banditCount si souhaité
  const tickets  = computeTickets(nftCount, level, roleMult);

  // FCFS/GTD WL flags (on-chain OR manual list) — always query with lowercased address
  const wlDoc = await WLAddress.findOne({ address: wallet }).lean().catch(() => null);
  const fcfsWL = (utilityCount > 0) || !!wlDoc?.fcfs;
  const gtdWL  = (genesisCount > 0 || banditCount > 0) || !!wlDoc?.gtd;

  // Sync FCFS/GTD roles only for verified users
  const fcfsRoleId = process.env.ROLE_MAINNET_FCFS_WL_ID;
  const gtdRoleId  = process.env.ROLE_MAINNET_GTD_WL_ID;

  if (link.verified && fcfsRoleId) {
    const hasFcfsRole = guildMember.roles.cache.has(fcfsRoleId);
    if (fcfsWL && !hasFcfsRole) {
      await guildMember.roles.add(fcfsRoleId, 'FCFS WL eligible');
    } else if (!fcfsWL && hasFcfsRole) {
      await guildMember.roles.remove(fcfsRoleId, 'No longer FCFS WL eligible');
    }
  }

  if (link.verified && gtdRoleId) {
    const hasGtdRole = guildMember.roles.cache.has(gtdRoleId);
    if (gtdWL && !hasGtdRole) {
      await guildMember.roles.add(gtdRoleId, 'GTD WL eligible');
    } else if (!gtdWL && hasGtdRole) {
      await guildMember.roles.remove(gtdRoleId, 'No longer GTD WL eligible');
    }
  }

  const { embed, buttons } = buildProfile({
    member: guildMember,
    link: { ...link, wallet },   // conserve l’affichage mais normalisé pour cohérence
    verified: !!link.verified,
    genesisCount,
    banditHeld: banditCount,
    utilityPass: utilityCount > 0,
    fcfsWL,
    gtdWL,
    tickets,
    level,
  });

  return interaction.editReply({ embeds: [embed], components: [buttons] });
}
