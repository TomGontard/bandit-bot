// src/services/userLinkService.js
import UserLink from './models/UserLink.js';

export async function createOrUpdateUserLink(discordId, wallet) {
  const existing = await UserLink.findOne({ discordId });

  // ➕ si user existe déjà, update seulement le wallet
  if (existing) {
    existing.wallet = wallet;
    existing.verified = false;       // Reset verification status on update
    existing.verifiedAt = null;      // Reset verification date on update
    return await existing.save();
  }

  // 🔢 sinon, assigner un numéro unique
  const count = await UserLink.countDocuments();
  const registrationNumber = count + 1;

  return await UserLink.create({ discordId, wallet, registrationNumber });
}

export async function getWalletByDiscordId(discordId) {
  const user = await UserLink.findOne({ discordId });
  return user?.wallet;
}

export async function isWalletLinked(wallet) {
  const user = await UserLink.findOne({ wallet });
  return !!user;
}

export async function getUserLink(discordId) {
  return await UserLink.findOne({ discordId });
}

export async function verifyUser(discordId) {
  return UserLink.findOneAndUpdate(
    { discordId },
    { verified: true, verifiedAt: new Date() },
    { new: true }
  );
}
