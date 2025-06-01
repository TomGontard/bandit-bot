// src/services/holdingService.js
import NFTHolding from '../services/models/NFTHolding.js';
import { roleIds } from '../config/collections.js';

export async function saveHolding(discordId, wallet, counts, genesis, bandit) {
  return NFTHolding.findOneAndUpdate(
    { discordId },
    { wallet, counts, genesis, bandit, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

export async function syncRoles(member, genesis, bandit) {
  if (roleIds.genesis) {
    if (genesis > 0) {
      await member.roles.add(roleIds.genesis, 'NFT sync');
    } else {
      await member.roles.remove(roleIds.genesis, 'NFT sync');
    }
  }
  if (roleIds.bandit) {
    if (bandit > 0) {
      await member.roles.add(roleIds.bandit, 'NFT sync');
    } else {
      await member.roles.remove(roleIds.bandit, 'NFT sync');
    }
  }
}
