// utils/giveawayHelper.js
const UserLink   = require('../services/models/UserLink');
const Whitelist  = require('../services/models/Whitelist');
const weightsCfg = require('../config/giveawayWeights');

function getWeight(member) {
  for (const [envKey, weight] of Object.entries(weightsCfg).sort((a, b) => b[1] - a[1])) {
    const roleId = process.env[envKey];
    if (roleId && member.roles.cache.has(roleId)) return weight;
  }
  return 1.0;
}

async function pickWinners(guild, amount) {
  const errandRole = process.env.ROLE_ERRAND_ID;

  // 1) Fetch every member with Errand
  const members = await guild.members.fetch({ withPresences: false });
  const eligible = members.filter(m => m.roles.cache.has(errandRole));

  // 2) intersect with wallet-linked
  const linkedDocs = await UserLink.find({ discordId: { $in: eligible.map(e => e.id) } }, 'discordId');
  const linkedSet  = new Set(linkedDocs.map(d => d.discordId));

  const pool = eligible.filter(m => linkedSet.has(m.id));
  if (!pool.size) return [];

  // 3) Build weight table
  const weighted = [];
  for (const m of pool.values()) {
    const w = getWeight(m);
    weighted.push({ id: m.id, weight: w });
  }

  // 4) Random weighted sampling w/out replacement
  const winners = [];
  let triesSafe = 10_000; // avoid infinite loop if amount>pool
  while (winners.length < amount && triesSafe--) {
    const total = weighted.reduce((sum, e) => sum + e.weight, 0);
    let   pick  = Math.random() * total;
    let   idx   = weighted.findIndex(e => (pick -= e.weight) <= 0);
    if (idx === -1) idx = 0;
    winners.push(weighted[idx].id);
    weighted.splice(idx, 1);           // remove
    if (!weighted.length) break;
  }
  return winners;
}

async function grantWhitelist(discordId, staffId) {
  await Whitelist.findOneAndUpdate(
    { discordId },
    {
      $inc : { whitelistsGiven   : 1 },
      $push: { whitelistsLogs: { type:'manual', amount:1, reason:'Giveaway', staffId } }
    },
    { upsert:true }
  );
}

module.exports = { pickWinners, grantWhitelist };
