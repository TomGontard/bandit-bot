// src/commands/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Charge dynamiquement toutes les commandes du dossier et les enregistre dans client.commands.
 * Vous devez appeler await registerCommands(client) dans votre index principal.
 */
export default async function registerCommands(client) {
  client.commands = new Map();

  // __dirname en ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = path.dirname(__filename);

  // Chemin du dossier commands (ce fichier)
  const commandsPath = __dirname;
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js') && file !== 'index.js');

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    // Import dynamique du module
   const commandModule = await import(`file://${filePath}`);
   // Si le fichier exportait par défaut, on récupère commandModule.default,
   // sinon on prend l’objet complet (pour gérer d’éventuels exports nommés).
   const command = commandModule.default ?? commandModule;

    // On ne garde que les modules qui ont bien `data` et `execute`
    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}
