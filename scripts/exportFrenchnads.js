#!/usr/bin/env node
/**
 * exportFrenchNads.js – v2
 *
 * Sortie : <discordId> : <nomDiscord> : <wallet>
 *   • nomDiscord = `discordName` (ou `discordUsername`) stockés dans la collection.
 *   • Si absent, on tente un fetch live (BOT_TOKEN+GUILD_ID).
 *
 * Usage : node scripts/exportFrenchNads.js > frenchnads.txt
 */

require('dotenv').config();
const mongoose    = require('mongoose');
const FrenchNads  = require('../src/services/models/frenchnads');
const UserLink    = require('../src/services/models/UserLink');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const nads = await FrenchNads.find().lean();
  console.log(`# FrenchNads export – ${nads.length} entries`);

  // Optionnel – enrichir via Discord API
  let guild = null, client = null;
  const { BOT_TOKEN, GUILD_ID } = process.env;
  if (BOT_TOKEN && GUILD_ID) {
    const { Client, GatewayIntentBits } = require('discord.js');
    client = new Client({ intents: [GatewayIntentBits.Guilds] });
    try {
      await client.login(BOT_TOKEN);
      guild = await client.guilds.fetch(GUILD_ID);
    } catch { /* ignore */ }
  }

  for (const nad of nads) {
    const link   = await UserLink.findOne({ discordId: nad.discordId }).lean();
    const wallet = link ? link.wallet.toLowerCase() : 'N/A';

    let name = nad.discordName || nad.discordUsername;
    if (!name && guild) {
      const m = await guild.members.fetch(nad.discordId).catch(()=>null);
      if (m) name = m.user.tag;
    }
    if (!name) name = 'Unknown';

    console.log(`${nad.discordId} : ${name} : ${wallet}`);
  }

  if (client) await client.destroy();
  await mongoose.disconnect();
})();
