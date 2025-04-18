// src/services/userLinkService.js
const UserLink = require('./models/UserLink');

async function createOrUpdateUserLink(discordId, wallet) {
  return await UserLink.findOneAndUpdate(
    { discordId },
    { wallet },
    { upsert: true, new: true }
  );
}

async function getWalletByDiscordId(discordId) {
  const user = await UserLink.findOne({ discordId });
  return user?.wallet;
}

async function isWalletLinked(wallet) {
  const user = await UserLink.findOne({ wallet });
  return !!user;
}

module.exports = {
  createOrUpdateUserLink,
  getWalletByDiscordId,
  isWalletLinked,
};
