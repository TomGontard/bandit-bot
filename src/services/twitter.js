// src/services/twitter.js
const axios        = require('axios');
const TwitterState = require('./models/TwitterState');

const BEARER = process.env.TWITTER_BEARER_TOKEN;
const HANDLE = process.env.TWITTER_HANDLE;

const api = axios.create({
  baseURL: 'https://api.twitter.com/2',
  headers: { Authorization: `Bearer ${BEARER}` },
});

/* ------------------------------------------------------------------ */
/*  Gestion interne du rate‑limit (free tier = 1 req / 15 min)        */
/* ------------------------------------------------------------------ */
let nextAllowed = 0;      // timestamp (ms) avant lequel on doit s'abstenir
async function safeGet(url) {
  const now = Date.now();
  if (now < nextAllowed) {
    const err = new Error('RATE_LIMIT');
    err.rateReset = nextAllowed;
    throw err;
  }

  try {
    return await api.get(url);
  } catch (e) {
    if (e.response?.status === 429) {
      const reset = Number(e.response.headers['x-rate-limit-reset']) || 0; // secondes UNIX
      nextAllowed = reset * 1000;
    }
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/*  Utils                                                             */
/* ------------------------------------------------------------------ */
let cachedUserId;
async function getUserId() {
  if (cachedUserId) return cachedUserId;
  const { data } = await safeGet(`/users/by/username/${HANDLE}`);
  cachedUserId   = data.data.id;
  return cachedUserId;
}

/**
 * Récupère le dernier tweet ORIGINAL (pas reply / retweet)
 * @returns { tweet, isNew }
 */
async function fetchLatestPost() {
  const userId = await getUserId();

  const params = new URLSearchParams({
    exclude:        'replies',
    max_results:    5,
    'tweet.fields': 'created_at',
  });

  const { data } = await safeGet(`/users/${userId}/tweets?${params}`);
  const tweets   = Array.isArray(data.data) ? data.data : [];
  if (!tweets.length) return { tweet: null, isNew: false };

  const latest   = tweets[0];
  const stateDoc = await TwitterState.findById('state');
  const lastId   = stateDoc?.lastTweetId || null;

  return { tweet: latest, isNew: latest.id !== lastId };
}

async function updateLastTweetId(id) {
  await TwitterState.findByIdAndUpdate(
    'state',
    { lastTweetId: id },
    { upsert: true },
  );
}

module.exports = { fetchLatestPost, updateLastTweetId };
