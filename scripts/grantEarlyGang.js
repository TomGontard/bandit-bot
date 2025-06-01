// scripts/grantEarlyGang.js
require('dotenv').config();
<<<<<<< HEAD
const mongoose = require('mongoose');
const client = require('../src/config/client');
=======
const client = require('../src/config/client');
const mongoose = require('mongoose');
>>>>>>> develop
const UserLink = require('../src/services/models/UserLink');

(async () => {
  try {
    // Connect to Discord + Mongo
    await mongoose.connect(process.env.MONGODB_URI);
    await client.login(process.env.DISCORD_TOKEN);

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const earlyGangId = process.env.ROLE_EARLYGANG_ID;

    const qualified = await UserLink.find({ registrationNumber: { $lte: 203 } });
    console.log(`👥 ${qualified.length} users found with registrationNumber ≤ 200`);

    let granted = 0;
    for (const link of qualified) {
      try {
        const member = await guild.members.fetch(link.discordId);
        if (!member.roles.cache.has(earlyGangId)) {
          await member.roles.add(earlyGangId, 'Early registration (≤ #200)');
          console.log(`✅ Granted Early-Gang to ${member.user.tag}`);
          granted++;
        }
      } catch (err) {
        console.warn(`⚠️ Couldn’t grant role to ${link.discordId}:`, err.message);
      }
    }

    console.log(`🎉 Done! ${granted} users received the Early-Gang role.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Script error:', err);
    process.exit(1);
  }
})();
