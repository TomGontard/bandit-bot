#!/usr/bin/env node
/**
 * generateWhitelistBatch.js – v2.1
 *
 * ➜ Génère l'appel Solidity `setBatch(0, [...addresses], [...quotas])`.
 *     • Les quotas correspondent désormais à **whitelistsGiven + whitelistsNFTs**.
 *
 * Usage :
 *   node scripts/generateWhitelistBatch.js                    # sans vérification Discord
 *   DISCORD_TOKEN=xxx GUILD_ID=123 node scripts/generateWhitelistBatch.js   # avec check membre
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const connectDB = require('../src/services/mongo.js');
const Whitelist = require('../src/services/models/Whitelist');
const UserLink = require('../src/services/models/UserLink');

async function fetchGuildMemberMap() {
  const { DISCORD_TOKEN, GUILD_ID } = process.env;
  if (!DISCORD_TOKEN || !GUILD_ID) return null;

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(DISCORD_TOKEN);
  const guild = await client.guilds.fetch(GUILD_ID);

  const memberIds = new Set();
  let after;
  do {
    const members = await guild.members.list({ limit: 1000, after });
    if (!members.size) break;
    members.forEach(m => memberIds.add(m.id));
    after = [...members.values()].pop().id;
  } while (after);

  await client.destroy();
  return memberIds;
}

async function main() {
  await connectDB();

  // 1) Récupère tous les whitelistés (given + NFT)
  const whiteDocs = await Whitelist.find({
    $expr: { $gt: [{ $add: ["$whitelistsGiven", "$whitelistsNFTs"] }, 0] }
  }).lean();

  if (!whiteDocs.length) {
    console.warn('Aucun whitelisté trouvé.');
    await mongoose.disconnect();
    return;
  }

  // Map discordId -> quota total
  const idToQuota = new Map();
  whiteDocs.forEach(d => {
    const total = (d.whitelistsGiven || 0) + (d.whitelistsNFTs || 0);
    idToQuota.set(d.discordId, total);
  });

  // 2) Récupère les wallets de ces users
  const links = await UserLink.find({ discordId: { $in: Array.from(idToQuota.keys()) } })
    .select('discordId wallet registrationNumber')
    .lean();

  if (!links.length) {
    console.warn('Aucun wallet lié pour les whitelistés.');
    await mongoose.disconnect();
    return;
  }

  // 3) Optionnel : vérifie présence Discord
  let memberSet = null;
  try {
    memberSet = await fetchGuildMemberMap();
  } catch (e) {
    console.warn('⚠️  Vérification Discord ignorée :', e.message);
  }

  const rows = [];
  for (const link of links) {
    if (memberSet && !memberSet.has(link.discordId)) {
      console.log(`Skip ${link.discordId} – a quitté le serveur`);
      continue;
    }
    const quota = idToQuota.get(link.discordId);
    rows.push({ reg: link.registrationNumber, wallet: link.wallet.toLowerCase(), quota });
  }

  // 4) Trie par registrationNumber
  rows.sort((a, b) => a.reg - b.reg);

  const addresses = rows.map(r => r.wallet);
  const quotasArr = rows.map(r => r.quota);

  const addrList = addresses.length ? '\n  "' + addresses.join('",\n  "') + '"\n' : '';
  const cmd = `await simpleMint.setBatch(0, [${addrList}], [${quotasArr.join(', ')}]);`;

  console.log(`\n// ${addresses.length} wallet(s) whitelistés (batch 0)`);
  console.log(cmd + '\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
