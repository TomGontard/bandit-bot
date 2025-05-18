require('dotenv').config();
const mongoose = require('mongoose');
const Whitelist = require('../src/services/models/Whitelist');
const FrenchNads = require('../src/services/models/frenchnads');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await FrenchNads.find();

  console.log(`🧾 Processing ${users.length} FrenchNads…`);

  let updated = 0;

  for (const user of users) {
    await Whitelist.findOneAndUpdate(
      { discordId: user.discordId },
      {
        $inc: { whitelistsGiven: 1 },
        $push: {
          whitelistsLogs: {
            type: 'manual',
            amount: 1,
            reason: 'frenchnads',
            staffId: 'SCRIPT',
            date: new Date()
          }
        }
      },
      { upsert: true }
    );
    updated++;
  }

  console.log(`✅ Updated ${updated} whitelist records`);
  mongoose.connection.close();
})();
