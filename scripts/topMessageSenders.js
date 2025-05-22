#!/usr/bin/env node
/**
 * topMessageSenders.js
 *
 * ➜ Compte les messages dans **tout l'historique** texte du serveur Discord et
 *   affiche le TOP 100 (user, count).
 *
 * ⚠️  Discord limite `channel.messages.fetch()` à 100 messages/req et applique un
 *    ratelimit (50 requêtes / canal / 20 min). Pour un gros serveur, prévois un
 *    exécution longue ou filtre par date (voir `SINCE_DAYS`).
 *
 * Usage :
 *   DISCORD_TOKEN=xxx GUILD_ID=123 node scripts/topMessageSenders.js [SINCE_DAYS]
 *     – SINCE_DAYS (optionnel) : ne compte que les messages <n> derniers jours.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
if (!token || !guildId) {
  console.error('DISCORD_TOKEN et/ou GUILD_ID manquants dans .env');
  process.exit(1);
}

// Optionnel : ne compter que les messages récents
const SINCE_DAYS = parseInt(process.argv[2], 10); // ex: 30 pour 30 derniers jours
const sinceTimestamp = SINCE_DAYS ? Date.now() - SINCE_DAYS * 86400 * 1000 : 0;

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
] });

async function countMessagesInChannel(channel, counter) {
  let lastId;
  let keepFetching = true;
  while (keepFetching) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    for (const msg of messages.values()) {
      if (sinceTimestamp && msg.createdTimestamp < sinceTimestamp) {
        keepFetching = false; // plus besoin d'aller plus loin dans le passé
        break;
      }
      const authorId = msg.author.id;
      counter.set(authorId, (counter.get(authorId) || 0) + 1);
    }
    lastId = messages.last().id;
  }
}

async function main() {
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  const counter = new Map();

  console.log('\u{1F50E}  Counting messages… This can take a while.');

  const textChannels = (await guild.channels.fetch()).filter(ch =>
    ch.type === ChannelType.GuildText || ch.type === ChannelType.PublicThread || ch.type === ChannelType.PrivateThread
  );

  for (const channel of textChannels.values()) {
    try {
      await countMessagesInChannel(channel, counter);
      console.log(`✔️  ${channel.name}`);
    } catch (err) {
      console.warn(`⚠️  Skip #${channel.name}:`, err.message);
    }
  }

  // Top 100
  const top = [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  console.log('\n=== TOP 100 message senders ===');
  for (const [idx, [userId, count]] of top.entries()) {
    const member = await guild.members.fetch(userId).catch(() => null);
    const tag = member ? member.user.tag : userId;
    console.log(`${String(idx + 1).padStart(3, ' ')}. ${tag.padEnd(30)} ${count}`);
  }

  await client.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
