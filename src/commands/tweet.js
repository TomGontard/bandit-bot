// src/commands/tweet.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const { fetchLatestPost } = require('../services/twitter');
const { set } = require('../utils/previewCache');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tweet')
    .setDescription('Prévisualise le dernier tweet (publication via /confirm)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: 'Fetching tweet…', flags: MessageFlags.Ephemeral });

    try {
      const { tweet, isNew } = await fetchLatestPost();
      if (!tweet) {
        return interaction.editReply({
          content: '❌ Aucun tweet trouvé.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const url = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;
      set(interaction.user.id, tweet.id);

      return interaction.editReply({
        content: `${isNew ? '✅ New tweet loaded.' : '⚠️ Twitter limit reached – showing last known tweet.'}\n\n🔗 ${url}\n\nUse \`/confirm\` to post it.`,
        flags: MessageFlags.Ephemeral,
      });

    } catch (err) {
      console.error('tweet error', err);
      return interaction.editReply({
        content: '❌ Twitter fetch failed.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
