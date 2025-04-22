// src/events/messageCreate.js
module.exports = {
  name: 'messageCreate',
  execute: async (message) => {
    // Ignore les bots
    if (message.author.bot) return;

    // Vérifie si le message contient "gbandit" (insensible à la casse)
    if (message.content.toLowerCase().includes('gbandit')) {
      const emojis = [
        'COOL',
        'SICK',
        'CRAZY',
        'AFFRAID',
        'SAD',
        'THINKING',
        'NERD',
        'RAGE',
        'WHAT',
        'GRINNING',
        'VOMITING',
        'CLOWN',
        'LOL'
      ];

      // Choisit un emoji aléatoire
      const emojiName = emojis[Math.floor(Math.random() * emojis.length)];

      try {
        // Recherche l’emoji dans la liste du serveur
        const emoji = message.guild.emojis.cache.find(e => e.name.toUpperCase() === emojiName);
        if (emoji) {
          await message.react(emoji);
        } else {
          console.warn(`⚠️ Emoji :${emojiName}: non trouvé dans le serveur.`);
        }
      } catch (err) {
        console.error('❌ Erreur lors de l’ajout d’un emoji gbandit :', err);
      }
    }
  },
};
