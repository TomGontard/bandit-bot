// src/utils/previewCache.js
const cache = new Map();

export function set(userId, tweetId) {
  cache.set(userId, tweetId);
}

export function get(userId) {
  return cache.get(userId);
}

export function clear(userId) {
  cache.delete(userId);
}
