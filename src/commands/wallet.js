// src/commands/wallet.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getUserLink } from '../services/userLinkService.js';
import { getGenesisCount } from '../services/genesisService.js';
import { checkAllPartners } from '../services/partnerService.js';
import giveawayWeights from '../config/giveawayWeights.js';
import buildProfile from '../utils/walletProfileEmbed.js';
import Whitelist from '../services/models/Whitelist.js';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('View or link your wallet');

export async function execute(interaction) {
  // 0. Y a-t-il déjà un wallet de lié ?
  const link = await getUserLink(interaction.user.id);
  if (!link) {
    // réutilise l’onboarding “/walletmessage”
    const walletMsgCmd = interaction.client.commands.get('walletmessage');
    return walletMsgCmd.execute(interaction);
  }

  await interaction.deferReply({ ephemeral: true });
  const guildMember = await interaction.guild.members.fetch(interaction.user.id);

  // 1. Récupère le nombre de Genesis Pass on-chain
  let genesisCount;
  try {
    genesisCount = await getGenesisCount(link.wallet);
  } catch (e) {
    if (e.message === 'GenesisService: ALL_RPC_FAILED') {
      return interaction.editReply({
        content:
          '⚠️ Impossible de contacter le RPC pour vérifier le Genesis Pass. Merci de réessayer dans quelques instants.',
        ephemeral: true,
      });
    }
    throw e;
  }

  // synchronisation du rôle Genesis
  const hasGenesisRole = guildMember.roles.cache.has(process.env.ROLE_GENESIS_ID);
  if (genesisCount > 0 && !hasGenesisRole) {
    await guildMember.roles.add(process.env.ROLE_GENESIS_ID, 'Owns Genesis Pass');
  }
  if (genesisCount === 0 && hasGenesisRole) {
    await guildMember.roles.remove(process.env.ROLE_GENESIS_ID, 'No Genesis Pass');
  }

  // 2. Calcule le multiplicateur de rôle le plus élevé
  const roleMult = Object.entries(giveawayWeights.roles).reduce(
    (best, [id, w]) => (guildMember.roles.cache.has(id) ? Math.max(best, w) : best),
    1
  );

  // 3. Comptabilise les NFTs partenaires (futur usage)
  const partnerCounts = await checkAllPartners(link.wallet);
  const wlNFTs = Object.values(partnerCounts).reduce((a, b) => a + b, 0);

  // met à jour la collection Whitelist
  await Whitelist.findOneAndUpdate(
    { discordId: interaction.user.id },
    { whitelistsNFTs: wlNFTs },
    { upsert: true }
  );

  // 4. Calcule les tickets
  const baseTickets = genesisCount * 100;
  const tickets = link.verified ? Math.round(baseTickets * roleMult) : baseTickets;

  // 5. Autres holdings (Bandit NFT, Soon…)
  const banditHeld = 0;
  const soonHeld = 0;

  // 6. Construit l’embed et les boutons
  const { embed, buttons } = buildProfile({
    member: guildMember,
    link,
    verified: !!link.verified,
    genesisCount,
    tickets,
    banditHeld,
    soonHeld,
  });

  await interaction.editReply({ embeds: [embed], components: [buttons] });
}

// util interne (optionnel si jamais besoin ailleurs)
function verified(link) {
  return !!link?.verified;
}
