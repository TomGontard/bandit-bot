// src/events/ready.js
const { getWalletByDiscordId } = require('../services/userLinkService');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  },
};

execute: async (client) => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  
  // Test : remplace par ton ID Discord
  const wallet = await getWalletByDiscordId('cubionix');
  console.log('Wallet associé :', wallet || 'Aucun');
}
