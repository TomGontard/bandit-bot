// src/utils/withTimeout.js
export default function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms)),
    ]);
  }
  