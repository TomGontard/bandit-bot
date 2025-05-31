// src/utils/cooldown.js

/**
 * Cool-down en mémoire – réinitialisé à chaque reboot du bot.
 *
 * @param {string} userId    – ID Discord de l’utilisateur
 * @param {string} command   – identifiant de la commande (ex. "sync", "latesttweet")
 * @param {number} windowMs  – durée du cool-down en millisecondes (défaut 60 000 ms)
 * @returns {number}         – 0 si OK, sinon temps restant (ms)
 */
const cooldowns = new Map(); // key = "command:userId" → timestamp ms

export default function checkCooldown(userId, command, windowMs = 60_000) {
  const key = `${command}:${userId}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const diff = now - cooldowns.get(key);
    if (diff < windowMs) return windowMs - diff;
  }

  cooldowns.set(key, now);
  return 0;
}
