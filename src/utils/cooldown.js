// Simple cooldown en mémoire (cleared au redémarrage du bot)
const cooldowns = new Map();         // key = "<command>:<userId>" → timestamp (ms)

// durée de la fenêtre (modifiable via .env si tu veux)
const WINDOW = 60 * 1000;            // 60 s

/**
 * Vérifie si l'utilisateur est encore en cooldown.
 * @return {number} 0 si OK, ou nombre de ms restants sinon
 */
module.exports = function checkCooldown(userId, command) {
  const key = `${command}:${userId}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const diff = now - cooldowns.get(key);
    if (diff < WINDOW) return WINDOW - diff;   // temps restant
  }

  cooldowns.set(key, now);
  return 0;
};
