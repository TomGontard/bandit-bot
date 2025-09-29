// src/utils/tickets.js
import weightsConfig from '../config/giveawayWeights.js';

export function getRoleMultiplier(member) {
  let mult = 1;
  for (const [rid, m] of Object.entries(weightsConfig.roles)) {
    if (!rid) continue;
    if (member.roles.cache.has(rid)) mult = Math.max(mult, m);
  }
  return mult;
}

export function computeTickets(nftCount, level, roleMult) {
  const base = (Number(nftCount || 0) * 100) + (Number(level || 0) * 25);
  return Math.max(0, Math.floor(base * (roleMult || 1)));
}
