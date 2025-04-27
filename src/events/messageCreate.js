// src/events/messageCreate.js
const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');

const cooldownMap = new Map();             // key = word:channelId → last timestamp

/* ---------- load *.json trigger files ---------- */
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
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

    /* ───────────── EMBED triggers ───────────── */
    for (const trg of embedTriggers) {
      const words = Array.isArray(trg.trigger) ? trg.trigger : [trg.trigger];

      /** ––– eligibility checks ––– */
      if (!words.some(w => content.includes(w)))                              continue;   // keyword not present
      if (!trg.active && !isAdmin)                                            continue;   // disabled for users
      if (trg.ignoreAdmins && isAdmin)                                        continue;   // optional “skip admins”
      /* cooldown */
      const key = `${words[0]}:${message.channel.id}`;
      const now = Date.now();
      if (cooldownMap.get(key) && now - cooldownMap.get(key) < (trg.cooldownSeconds ?? 0) * 1000) continue;
      cooldownMap.set(key, now);

      /** ––– send embed ––– */
      const embed = createEmbed({
        title:       trg.embed.title,
        description: trg.embed.description,
        color:       trg.embed.color,
        // fake interaction for footer (guild icon etc.)
        interaction: { client: message.client, guild: message.guild }
      });
      await message.channel.send({ embeds: [embed] });
      return; // fire max-one trigger per message
    }

    /* ───────────── EMOJI triggers ───────────── */
    for (const trg of emojiTriggers) {
      const words = Array.isArray(trg.trigger) ? trg.trigger : [trg.trigger];

      if (!words.some(w => content.includes(w)))                              continue;
      if (!trg.active && !isAdmin)                                            continue;
      if (trg.ignoreAdmins && isAdmin)                                        continue;

      const emojiName = trg.emojis[Math.floor(Math.random() * trg.emojis.length)];
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
