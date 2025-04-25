// src/cron/rotatePublication.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const client = require('../config/client');
const { createEmbed } = require('../utils/createEmbed');

// ✅ Toggle to enable or disable this job
const ENABLE_PUBLICATION = true;

// ✅ Replace {{ENV_VAR}} in text with values from .env
function interpolateEnvVars(text) {
  if (!text) return '';
  return text.replace(/{{(.*?)}}/g, (_, key) => process.env[key] || `MISSING_ENV:${key}`);
}

let messageIndex = 0;

const PUBLICATION_DIR = path.join(__dirname, '../publications');
const CRON_EXPR = '* */2 * * *'; // every 2 hours

cron.schedule(CRON_EXPR, async () => {
  if (!ENABLE_PUBLICATION) return;

  const files = fs.readdirSync(PUBLICATION_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return;

  const file = files[messageIndex % files.length];
  messageIndex++;

  try {
    const data = require(path.join(PUBLICATION_DIR, file));

    const channelId = data.channelId.startsWith('env:')
      ? process.env[data.channelId.slice(4)] // remove 'env:'
      : data.channelId;

    if (!channelId) throw new Error(`Invalid or missing channel ID in ${file}`);

    const channel = await client.channels.fetch(channelId);

    if (data.type === 'text') {
      await channel.send(interpolateEnvVars(data.content));
    } else if (data.type === 'embed') {
      const embed = createEmbed({
        title: interpolateEnvVars(data.embed.title),
        description: interpolateEnvVars(data.embed.description),
        color: data.embed.color,
        interaction: { client, guild: channel.guild }
      });

      await channel.send({ embeds: [embed] });
    }

    console.log(`📢 Published message: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to publish message (${file}):`, err);
  }
});
