// src/services/inviteService.js
import Invite from './models/Invite.js';
import UserLink from './models/UserLink.js';

/**
 * Retourne le nombre d’invités valides : ceux qui ont le rôle Errand **et** ont vérifié leur wallet.
 * @param {string} inviterId - ID du membre à analyser
 * @param {Guild} guild - Instance du serveur Discord
 * @returns {number}
 */
export async function getInvitedCount(inviterId, guild) {
  const errandId = process.env.ROLE_ERRAND_ID;

  // Charge les invités depuis la base
  const doc = await Invite.findOne({ inviterId });
  if (!doc) return 0;

  const invitedIds = doc.invitedIds ?? [];
  if (invitedIds.length === 0) return 0;

  // Vérifie côté wallet en une seule requête
  const walletDocs = await UserLink.find({
    discordId: { $in: invitedIds },
    verified: true,
  });

  const verifiedIds = walletDocs.map(doc => doc.discordId);

  // Filtre ceux qui ont aussi le rôle Errand
  let count = 0;
  for (const id of verifiedIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member?.roles.cache.has(errandId)) {
      count++;
    }
  }

  return count;
}
