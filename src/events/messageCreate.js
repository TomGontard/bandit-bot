// src/events/messageCreate.js
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PermissionsBitField } from 'discord.js';
import { createEmbed } from '../utils/createEmbed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory cooldown map: key = "triggerWord:channelId" → last timestamp
const cooldownMap = new Map();

/**
 * Charge tous les fichiers JSON d’un dossier et retourne un tableau d’objets.
 * Chaque JSON représente une règle de trigger (embed ou emoji).
 */
function loadJsons(dir) {
  const fullDir = join(__dirname, dir);
  return fs
    .readdirSync(fullDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(join(fullDir, f), 'utf-8');
      return JSON.parse(raw);
    });
}

const embedTriggers = loadJsons('../triggers/messages');
const emojiTriggers = loadJsons('../triggers/emojis');

export default {
  name: 'messageCreate',
  async execute(message) {
    // Ignorer les bots
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    const member = await message.guild.members.fetch(message.author.id);
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

    /* ───────────── EMBED triggers ───────────── */
    for (const trg of embedTriggers) {
      const words = Array.isArray(trg.trigger) ? trg.trigger : [trg.trigger];

      // Vérifications d’éligibilité
      if (!words.some((w) => content.includes(w))) continue;
      if (!trg.active && !isAdmin) continue;
      if (trg.ignoreAdmins && isAdmin) continue;

      // Gestion du cooldown
      const key = `${words[0]}:${message.channel.id}`;
      const now = Date.now();
      const cdMs = (trg.cooldownSeconds ?? 0) * 1000;
      if (cooldownMap.has(key) && now - cooldownMap.get(key) < cdMs) continue;
      cooldownMap.set(key, now);

      // Construction et envoi de l’embed
      const embed = createEmbed({
        title: trg.embed.title,
        description: trg.embed.description,
        color: trg.embed.color,
        // On simule un “interaction” uniquement pour permettre au footer d’apparaître
        interaction: { client: message.client, guild: message.guild },
      });
      await message.channel.send({ embeds: [embed] });
      return; // Un seul trigger embed par message
    }

    /* ───────────── EMOJI triggers ───────────── */
    for (const trg of emojiTriggers) {
      const words = Array.isArray(trg.trigger) ? trg.trigger : [trg.trigger];

      if (!words.some((w) => content.includes(w))) continue;
      if (!trg.active && !isAdmin) continue;
      if (trg.ignoreAdmins && isAdmin) continue;

      // Choix aléatoire d’un emoji dans la liste
      const emojiName =
        trg.emojis[Math.floor(Math.random() * trg.emojis.length)];
      const emoji = message.guild.emojis.cache.find(
        (e) => e.name.toUpperCase() === emojiName
      );

      if (emoji) {
        await message.react(emoji);
      } else {
        console.warn(`⚠️ Emoji :${emojiName}: introuvable sur le serveur.`);
      }
      return; // Un seul trigger emoji par message
    }
  },
};
