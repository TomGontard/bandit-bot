// src/cron/rotatePublication.js
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import client from '../config/client.js';
import 'dotenv/config';
import { createEmbed } from '../utils/createEmbed.js';

// ✅ Toggle to enable or disable this job
const ENABLE_PUBLICATION = true;

// ✅ Replace {{ENV_VAR}} in text with values from .env
function interpolateEnvVars(text) {
  if (!text) return '';
  return text.replace(/{{(.*?)}}/g, (_, key) => process.env[key] || `MISSING_ENV:${key}`);
}

// Recréation de __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Répertoire contenant les fichiers JSON à publier
const PUBLICATION_DIR = join(__dirname, '../publications');
const CRON_EXPR = '0 */2 * * *'; // every 2 hours

cron.schedule(CRON_EXPR, async () => {
  if (!ENABLE_PUBLICATION) return;

  // Lecture synchronisée des fichiers JSON
  let files;
  try {
    files = fs
      .readdirSync(PUBLICATION_DIR)
      .filter((f) => f.endsWith('.json'));
  } catch (err) {
    console.error('❌ Impossible de lire le dossier publications :', err);
    return;
  }

  if (files.length === 0) return;

  const file = files[messageIndex % files.length];
  messageIndex++;

  try {
    // Charger et parser le JSON manuellement
    const raw = fs.readFileSync(join(PUBLICATION_DIR, file), 'utf-8');
    const data = JSON.parse(raw);

    // Résoudre l'ID du canal (supporte préfixe "env:")
    const channelId = data.channelId.startsWith('env:')
      ? process.env[data.channelId.slice(4)]
      : data.channelId;

    if (!channelId) {
      throw new Error(`Invalid or missing channel ID in ${file}`);
    }

    // Récupérer le canal Discord
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.send) {
      throw new Error(`Channel not found or not text channel: ${channelId}`);
    }

    // Envoi du message selon le type
    if (data.type === 'text') {
      await channel.send(interpolateEnvVars(data.content));
    } else if (data.type === 'embed') {
      const embed = createEmbed({
        title: interpolateEnvVars(data.embed.title),
        description: interpolateEnvVars(data.embed.description),
        color: data.embed.color,
        interaction: { client, guild: channel.guild },
      });
      await channel.send({ embeds: [embed] });
    } else {
      console.warn(`⚠️ Type inconnu dans ${file} : ${data.type}`);
    }

    console.log(`📢 Published message: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to publish message (${file}):`, err);
  }
});

// Index pour faire tourner cycliquement les fichiers
let messageIndex = 0;
