// src/cron/twitterRelay.js
const cron                 = require('node-cron');
const { fetchLatestPost,
        updateLastTweetId } = require('../services/twitter');
const client               = require('../config/client');

const CHANNEL_ID = process.env.TWITTER_CHANNEL_ID;
const CRON_EXPR  = process.env.TWITTER_CRON || '0 8,13,18 * * *'; // 10h, 15h, 20h france

cron.schedule(CRON_EXPR, async () => {
  console.log('🐦  Twitter poll…');

  try {
    const { tweet, isNew } = await fetchLatestPost();
    if (!tweet) return;

    if (!isNew) {
      console.log('→ Aucun nouveau tweet original.');
      return;
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    const url     = `https://fxtwitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;

    // URL entourée de chevrons => pas de preview Discord
    await channel.send({ content: `<${url}>` });

    await updateLastTweetId(tweet.id);
    console.log(`✅  Nouveau tweet relayé : ${tweet.id}`);
  } catch (e) {
    // 429 = rate limit, on logue simplement
    if (e.response?.status === 429) {
      console.warn('⚠️  Twitter rate‑limited (429). On réessaiera au prochain cycle.');
    } else {
      console.error('Twitter relay error', e);
    }
  }
});
