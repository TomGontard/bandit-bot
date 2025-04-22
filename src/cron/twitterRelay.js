// src/cron/twitterRelay.js
const cron = require('node-cron');
const {
  fetchLatestPost,
  updateLastTweetId
} = require('../services/twitter');
const client = require('../config/client');

const CHANNEL_ID = process.env.TWITTER_CHANNEL_ID;
const CRON_EXPR  = process.env.TWITTER_CRON || '0 8,13,18 * * *'; // 10am, 3pm, 8pm France time

cron.schedule(CRON_EXPR, async () => {
  console.log('🐦  Twitter poll…');

  try {
    const { tweet, isNew } = await fetchLatestPost();
    if (!tweet) return;

    if (!isNew) {
      console.log('→ No new original tweet.');
      return;
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    const url = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;

    // URL wrapped in angle brackets => no Discord preview
    await channel.send({ content: `<${url}>` });

    await updateLastTweetId(tweet.id);
    console.log(`✅  New tweet relayed: ${tweet.id}`);
  } catch (e) {
    // 429 = rate limit, just log and wait for the next cycle
    if (e.response?.status === 429) {
      console.warn('⚠️  Twitter rate-limited (429). Will retry on next cycle.');
    } else {
      console.error('Twitter relay error', e);
    }
  }
});
