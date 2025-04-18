// deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

// 1) On charge uniquement les .js qui exportent un slash‑command
const commandFiles = fs
  .readdirSync('./src/commands')
  .filter(file => file.endsWith('.js') && file !== 'index.js');

const commands = [];

for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`);

  // Vérif : le module doit avoir un .data et un .toJSON()
  if (command?.data?.toJSON) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`⚠️  ${file} ignoré : pas de propriété .data`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Déploiement des commandes…');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Commandes déployées avec succès.');
  } catch (error) {
    console.error(error);
    // Affiche le JSON envoyé pour debug si besoin
    // console.dir(commands, { depth: null });
  }
})();
