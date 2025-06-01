// src/events/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Enregistre tous les gestionnaires d'événements du dossier "events" sur le client Discord.
 * Chaque fichier d'événement doit exporter :
 *   - name (string) : nom de l'événement (ex. "ready", "messageCreate")
 *   - once (boolean) : true si on n'écoute qu'une seule fois, sinon false
 *   - execute (...args, client) : fonction exécutée lorsque l'événement se déclenche
 *
 * Exécutez : await registerEvents(client);
 */
export default async function registerEvents(client) {
  // __dirname équivalent en ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const eventsPath = __dirname;
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const { default: event } = await import(`file://${filePath}`);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}
