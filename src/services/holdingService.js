// src/services/holdingService.js
const NFTHolding = require('./models/NFTHolding');
const { roleIds } = require('../config/collections');

async function saveHolding(discordId, wallet, counts, genesis, bandit) {
  return NFTHolding.findOneAndUpdate(
    { discordId },
    { wallet, counts, genesis, bandit, updatedAt: new Date() },
    { upsert: true, new: true },
  );
}

async function syncRoles(member, genesis, bandit) {
  if (roleIds.genesis) {
    genesis > 0
      ? await member.roles.add(roleIds.genesis, 'NFT sync')
      : await member.roles.remove(roleIds.genesis, 'NFT sync');
  }
  if (roleIds.bandit) {
    bandit > 0
      ? await member.roles.add(roleIds.bandit, 'NFT sync')
      : await member.roles.remove(roleIds.bandit, 'NFT sync');
  }
}

module.exports = { saveHolding, syncRoles };
