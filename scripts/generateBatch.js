#!/usr/bin/env node
/**
 * generateBatch.js – v2
 *
 * Génère la commande Solidity `setBatch` pour le contrat SimpleMint **en excluant**
 * les membres qui ont quitté le serveur Discord.
 *
 * Usage :
 *   DISCORD_TOKEN=xxxxx GUILD_ID=123 node scripts/generateBatch.js 3
 *
 * Étapes :
 *   1. Connexion Mongo (UserLink) pour lire les wallets par tranche de 100.
 *   2. Connexion rapide au bot Discord (token d’appli ou de bot) puis vérifie, pour
 *      chaque `discordId`, que le membre existe encore dans le serveur.
 *   3. Construit les arrays `addresses[]` et `quotas[]` (1 par adresse restante).
 *   4. Affiche la ligne à copier‑coller :
 *        await simpleMint.setBatch(batch, [addr1, …], [1, 1, …]);
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const connectDB = require('../src/services/mongo.js');
const UserLink = require('../src/services/models/UserLink');

async function main() {
  const batch = parseInt(process.argv[2], 10);
  if (!Number.isInteger(batch) || batch <= 0) {
    console.error('Usage: node scripts/generateBatch.js <batchNumber>');
    process.exit(1);
  }

  const { DISCORD_TOKEN, GUILD_ID } = process.env;
  if (!DISCORD_TOKEN || !GUILD_ID) {
    console.error('✖️  DISCORD_TOKEN et/ou GUILD_ID manquants dans les variables d\'env.');
    process.exit(1);
  }

  // 1) DB
  await connectDB();

  const min = (batch - 1) * 100 + 1;
  const max = batch * 100;

  const links = await UserLink.find({
    registrationNumber: { $gte: min, $lte: max }
  })
    .sort({ registrationNumber: 1 })
    .lean();

  if (!links.length) {
    console.warn(`⚠️  Aucun wallet dans la tranche ${min}-${max}.`);
  }

  // 2) Discord – vérification de présence
  const discord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await discord.login(DISCORD_TOKEN);
  const guild = await discord.guilds.fetch(GUILD_ID);

  const addresses = [];
  for (const link of links) {
    try {
      await guild.members.fetch(link.discordId);
      addresses.push(link.wallet.toLowerCase());
    } catch (_) {
      console.log(`↪️  Skip ${link.discordId} – plus dans le serveur`);
    }
  }
  await discord.destroy();

  const quotas = addresses.map(() => 1);
  const addrList = addresses.length
    ? '\n  "' + addresses.join('",\n  "') + '"\n'
    : '';

  const cmd = `await simpleMint.setBatch(${batch}, [${addrList}], [${quotas.join(', ')}]);`;

  console.log(`\n// ${addresses.length} adresse(s) retenue(s) dans le batch ${batch}`);
  console.log(cmd + '\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
