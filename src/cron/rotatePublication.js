// src/cron/rotatePublication.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const client = require('../config/client');

let messageIndex = 0;

const PUBLICATION_DIR = path.join(__dirname, '../publications');
const CRON_EXPR = '* */24 * * *';  

cron.schedule(CRON_EXPR, async () => {
  const files = fs.readdirSync(PUBLICATION_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return;

  const file = files[messageIndex % files.length];
  messageIndex++;

  try {
    const data = require(path.join(PUBLICATION_DIR, file));
    const channel = await client.channels.fetch(data.channelId);

    if (data.type === 'text') {
      await channel.send(data.content);
    } else if (data.type === 'embed') {
      await channel.send({ embeds: [data.embed] });
    }

    console.log(`📢 Published message: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to publish message (${file}):`, err);
  }
});
