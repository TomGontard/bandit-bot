// src/commands/confirm.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const { get, clear } = require('../utils/previewCache');
const { buildTwitterButtons } = require('../utils/twitterButtons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confirm')
    .setDescription('Publie le tweet prévisualisé dans le salon Twitter')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const tweetId = get(interaction.user.id);
    if (!tweetId) {
      return interaction.reply({
        content: '❌ Aucun tweet en attente. Utilise `/tweet` d’abord.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const channelId = process.env.CHANNEL_TWITTER_ID;
    const tweetURL = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweetId}`;
    const ping = process.env.ROLE_ERRAND_ID ? `<@&${process.env.ROLE_ERRAND_ID}>` : '';

    const channel = await interaction.client.channels.fetch(channelId);
    await channel.send(`${ping} New tweet gang ! 🤘🔥\n${tweetURL}`);
    await channel.send({ components: [buildTwitterButtons(tweetId)] });

    clear(interaction.user.id);

    return interaction.reply({
      content: '✅ Tweet publié.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
