// src/scripts/grantEarlyGangWL.js
const mongoose   = require('mongoose');
const client     = require('../src/config/client');
const Whitelist  = require('../src/services/models/Whitelist');
require('dotenv').config(); // Load .env

const EARLY_ROLE = process.env.ROLE_EARLYGANG_ID;

async function grantWLToEarlyGang() {
  await client.login(process.env.DISCORD_TOKEN);
  await mongoose.connect(process.env.MONGODB_URI);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const members = await guild.members.fetch();

  const earlyGang = members.filter(m => m.roles.cache.has(EARLY_ROLE));
  console.log(`👥 Found ${earlyGang.size} Early Gang members.`);

  let success = 0;

  for (const member of earlyGang.values()) {
    const wl = await Whitelist.findOneAndUpdate(
      { discordId: member.id },
      {
        $inc: { whitelistsGiven: 1 },
        $push: {
          whitelistsLogs: {
            type: 'manual',
            amount: 1,
            reason: 'Early Gang auto-grant',
            staffId: 'SYSTEM',
          }
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ +1 WL to ${member.user.tag}`);
    success++;
  }

  console.log(`🎉 Done. ${success} whitelist(s) distributed.`);

  await mongoose.disconnect();
  process.exit(0);
}

grantWLToEarlyGang().catch(console.error);
