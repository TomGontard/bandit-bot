// src/events/messageCreate.js
const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');

const cooldownMap = new Map(); // key = word:channelId , value = timestamp

/* ---------- load trigger JSON files ---------- */
const loadJsons = dir =>
  fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => require(path.join(dir, f)));

const embedTriggers = loadJsons(path.join(__dirname, '../triggers/messages'));
const emojiTriggers = loadJsons(path.join(__dirname, '../triggers/emojis'));

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    const member  = await message.guild.members.fetch(message.author.id);

    /* ───────────── EMBED triggers ───────────── */
    for (const trig of embedTriggers) {
      const words = Array.isArray(trig.trigger) ? trig.trigger : [trig.trigger];
      if (!words.some(w => content.includes(w))) continue;
      if (trig.ignoreAdmins && member.permissions.has(PermissionsBitField.Flags.Administrator)) continue;

      const primary   = words[0]; // used for cooldown key
      const key       = `${primary}:${message.channel.id}`;
      const lastUsed  = cooldownMap.get(key);
      const now       = Date.now();
      const cooldown  = (trig.cooldownSeconds || 0) * 1000;
      if (lastUsed && now - lastUsed < cooldown) continue;
      cooldownMap.set(key, now);

      const embed = createEmbed({
        title:       trig.embed.title,
        description: trig.embed.description,
        color:       trig.embed.color,
        // simulate interaction for footer
        interaction: { client: message.client, guild: message.guild },
      });

      await message.channel.send({ embeds: [embed] });
      return; // only one trigger per message
    }

    /* ───────────── EMOJI triggers ───────────── */
    for (const trig of emojiTriggers) {
      const words = Array.isArray(trig.trigger) ? trig.trigger : [trig.trigger];
      if (!words.some(w => content.includes(w))) continue;
      if (trig.ignoreAdmins && member.permissions.has(PermissionsBitField.Flags.Administrator)) continue;

      const emojiName = trig.emojis[Math.floor(Math.random() * trig.emojis.length)];
      const emoji     = message.guild.emojis.cache.find(e => e.name.toUpperCase() === emojiName);

      if (emoji) {
        await message.react(emoji);
      } else {
        console.warn(`⚠️ Emoji :${emojiName}: not found in guild.`);
      }
      return;
    }
  },
};
