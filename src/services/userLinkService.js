// src/services/userLinkService.js
const UserLink = require('./models/UserLink');

async function createOrUpdateUserLink(discordId, wallet) {
  const existing = await UserLink.findOne({ discordId });

  // ➕ si user existe déjà, update seulement le wallet
  if (existing) {
    existing.wallet = wallet;
    return await existing.save();
  }

  // 🔢 sinon, assigner un numéro unique
  const count = await UserLink.countDocuments();
  const registrationNumber = count + 1;

  return await UserLink.create({ discordId, wallet, registrationNumber });
}

async function getWalletByDiscordId(discordId) {
  const user = await UserLink.findOne({ discordId });
  return user?.wallet;
}

async function isWalletLinked(wallet) {
  const user = await UserLink.findOne({ wallet });
  return !!user;
}

async function getUserLink(discordId) {
  return await UserLink.findOne({ discordId });
}

module.exports = {
  createOrUpdateUserLink,
  getWalletByDiscordId,
  isWalletLinked,
  getUserLink, 
};
