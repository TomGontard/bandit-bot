// src/utils/twitterButtons.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildTwitterButtons(tweetId) {
  const base = `https://twitter.com/intent`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Like')
      .setEmoji('💜')
      .setStyle(ButtonStyle.Link)
      .setURL(`${base}/like?tweet_id=${tweetId}`),

    new ButtonBuilder()
      .setLabel('Retweet')
      .setEmoji('🔁')
      .setStyle(ButtonStyle.Link)
      .setURL(`${base}/retweet?tweet_id=${tweetId}`),

    new ButtonBuilder()
      .setLabel('Comment')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Link)
      .setURL(`${base}/tweet?in_reply_to=${tweetId}`)
  );
}

module.exports = { buildTwitterButtons };
