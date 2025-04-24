// src/services/twitter.js
const { TwitterApi } = require('twitter-api-v2');
const TwitterState = require('./models/TwitterState');

const WINDOW_15_MIN = 15 * 60 * 1_000;
const twitter = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

let cachedUserId = null;

async function getUserId() {
  if (cachedUserId) return cachedUserId;
  const { data } = await twitter.v2.userByUsername(process.env.TWITTER_HANDLE);
  cachedUserId = data.id;
  return data.id;
}

async function fetchLatestPost() {
  const existing = await TwitterState.findOne({});
  if (existing && Date.now() < existing.nextAllowed) {
    return { tweet: { id: existing.lastTweetId }, isNew: false };
  }

  try {
    const uid = await getUserId();
    const { data, rateLimit } = await twitter.v2.userTimeline(uid, {
      exclude: 'replies',
      max_results: 5,
      'tweet.fields': 'id,created_at',
    });

    if (!data?.length) return { tweet: null };

    const tweet = data[0];
    const reset = rateLimit?.reset ? rateLimit.reset * 1000 : Date.now() + WINDOW_15_MIN;

    await TwitterState.findOneAndUpdate(
      {},
      {
        lastTweetId: tweet.id,
        lastTweetTime: new Date(),
        nextAllowed: reset,
      },
      { upsert: true, new: true }
    );

    return { tweet: { id: tweet.id }, isNew: true };

  } catch (err) {
    if (err.code === 429) {
      console.warn('⚠️ Twitter 429. Using cached tweet.');
      if (existing) {
        return { tweet: { id: existing.lastTweetId }, isNew: false };
      }
    }
    throw err;
  }
}

module.exports = {
  fetchLatestPost,
};
