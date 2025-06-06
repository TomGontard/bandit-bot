// src/commands/wallet.js
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getUserLink } from '../services/userLinkService.js';
import { getGenesisCount } from '../services/genesisService.js';
import { checkAllPartners } from '../services/partnerService.js';
import giveawayWeights from '../config/giveawayWeights.js';
import buildProfile from '../utils/walletProfileEmbed.js';
import Whitelist from '../services/models/Whitelist.js';
import { getInvitedCount } from '../services/inviteService.js';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('View or link your wallet');

export async function execute(interaction) {
  // 0. Y a-t-il déjà un wallet de lié ?
  const link = await getUserLink(interaction.user.id);
  if (!link) {
    // Si pas de lien, on délègue à /walletmessage sans deferReply ici
    const walletMsgCmd = interaction.client.commands.get('walletmessage');
    return walletMsgCmd.execute(interaction);
  }

  // 1. On ne deferReply qu’une seule fois
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const guildMember = await interaction.guild.members.fetch(interaction.user.id);

  // 🔎 Vérifie si l'utilisateur booste le serveur
  const isBooster = guildMember.roles.cache.has(process.env.ROLE_BOOSTER_ID);

  const guild = await interaction.guild.fetch();
  // 📬 Récupère le nombre de personnes invitées
  const invitedCount = await getInvitedCount(interaction.user.id, guild);

  // 2. Récupère le nombre de Genesis Pass on-chain
  let genesisCount;
  try {
    genesisCount = await getGenesisCount(link.wallet);
  } catch (e) {
    if (e.message === 'GenesisService: ALL_RPC_FAILED') {
      return interaction.editReply({
        content:
          '⚠️ Impossible de contacter le RPC pour vérifier le Genesis Pass. Merci de réessayer dans quelques instants.',
      });
    }
    throw e;
  }

  // 3. Synchronisation du rôle Genesis
  const hasGenesisRole = guildMember.roles.cache.has(process.env.ROLE_GENESIS_ID);
  if (genesisCount > 0 && !hasGenesisRole) {
    await guildMember.roles.add(process.env.ROLE_GENESIS_ID, 'Owns Genesis Pass');
  }
  if (genesisCount === 0 && hasGenesisRole) {
    await guildMember.roles.remove(process.env.ROLE_GENESIS_ID, 'No Genesis Pass');
  }

  // 4. Calcule le multiplicateur de rôle le plus élevé
  const roleMult = Object.entries(giveawayWeights.roles).reduce(
    (best, [id, w]) =>
      guildMember.roles.cache.has(id) ? Math.max(best, w) : best,
    1
  );

  // 5. Comptabilise les NFTs partenaires (futur usage)
  const partnerCounts = await checkAllPartners(link.wallet);
  const wlNFTs = Object.values(partnerCounts).reduce((a, b) => a + b, 0);

  // 6. Met à jour la collection Whitelist
  await Whitelist.findOneAndUpdate(
    { discordId: interaction.user.id },
    { whitelistsNFTs: wlNFTs },
    { upsert: true }
  );

  // 7. Calcule les tickets
  const baseTickets = genesisCount * 100;
  const tickets = link.verified ? Math.round(baseTickets * roleMult) : baseTickets;

  // 8. Autres holdings (Bandit NFT, Soon…)
  const banditHeld = 0;
  const soonHeld = 0;

  // 9. Attribue le rôle Mule si conditions réunies
  const hasMuleRole = guildMember.roles.cache.has(process.env.ROLE_MULE_ID);
  if (link.verified && (invitedCount >= 3 || isBooster) && !hasMuleRole) {
    await guildMember.roles.add(process.env.ROLE_MULE_ID, 'Eligible for Mule role');
  }

  // 10. Construit l’embed et les boutons
  const { embed, buttons } = buildProfile({
    member: guildMember,
    link,
    verified: !!link.verified,
    genesisCount,
    tickets,
    banditHeld,
    soonHeld,
    invitedCount,
    isBooster,
  });

  return interaction.editReply({ embeds: [embed], components: [buttons] });
}
