// deploy-commands.js
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) On charge uniquement les .js qui exportent un slash-command
const commandsDir = path.join(__dirname, 'src/commands');
const commandFiles = fs
  .readdirSync(commandsDir)
  .filter((file) => file.endsWith('.js') && file !== 'index.js');

const commands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsDir, file);
  const commandModule = await import(`file://${filePath}`);
  // Prend export default ou exports nommés
  const command = commandModule.default ?? commandModule;

  // Vérif : le module doit avoir un .data et un .data.toJSON()
  if (command?.data?.toJSON) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`⚠️  ${file} ignoré : pas de propriété .data`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('🚀 Déploiement des commandes…');
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );
  console.log('✅ Commandes déployées avec succès.');
} catch (error) {
  console.error(error);
  // Pour debug : afficher le JSON envoyé
  // console.dir(commands, { depth: null });
}
