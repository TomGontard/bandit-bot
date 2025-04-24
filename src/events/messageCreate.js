const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../utils/createEmbed');
const cooldownMap = new Map(); // key = trigger:channelId, value = timestamp

const loadJsons = (dirPath) =>
  fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json'))
    .map(f => require(path.join(dirPath, f)));

const embedTriggers = loadJsons(path.join(__dirname, '../triggers/messages'));
const emojiTriggers = loadJsons(path.join(__dirname, '../triggers/emojis'));

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    const member = await message.guild.members.fetch(message.author.id);

    // 🔹 Embed triggers
    for (const trigger of embedTriggers) {
      if (!content.includes(trigger.trigger)) continue;
      if (trigger.ignoreAdmins && member.permissions.has(PermissionsBitField.Flags.Administrator)) continue;

      const cooldownKey = `${trigger.trigger}:${message.channel.id}`;
      const lastUsed = cooldownMap.get(cooldownKey);
      const now = Date.now();
      const cooldownMs = (trigger.cooldownSeconds || 0) * 1000;

      if (lastUsed && now - lastUsed < cooldownMs) continue;
      cooldownMap.set(cooldownKey, now);

      const embed = createEmbed({
        title: trigger.embed.title,
        description: trigger.embed.description,
        color: trigger.embed.color
      });

      return await message.channel.send({ embeds: [embed] });
    }


    // 🔹 Emoji triggers
    for (const trigger of emojiTriggers) {
      if (!content.includes(trigger.trigger)) continue;
      if (trigger.ignoreAdmins && member.permissions.has(PermissionsBitField.Flags.Administrator)) continue;

      const emojis = trigger.emojis;
      const emojiName = emojis[Math.floor(Math.random() * emojis.length)];

      const emoji = message.guild.emojis.cache.find(e => e.name.toUpperCase() === emojiName);
      if (emoji) {
        return await message.react(emoji);
      } else {
        console.warn(`⚠️ Emoji :${emojiName}: not found in guild.`);
      }
    }
  }
};
