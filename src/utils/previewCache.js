// src/utils/previewCache.js
const cache = new Map();

function set(userId, tweetId) {
  cache.set(userId, tweetId);
}

function get(userId) {
  return cache.get(userId);
}

function clear(userId) {
  cache.delete(userId);
}

module.exports = { set, get, clear };
