// src/commands/latesttweet.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fetchLatestPost }     = require('../services/twitter');
const checkCooldown           = require('../utils/cooldown');

const WINDOW_15_MIN = 15 * 60 * 1000;   // 15 minutes

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latesttweet')
    .setDescription('Display the latest original tweet (excluding replies) from the account')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // admin only
  
  async execute(interaction) {
    // ⏳ Per-user cooldown (15 min)
    const rest = checkCooldown(interaction.user.id, 'latesttweet', WINDOW_15_MIN);
    if (rest) {
      return interaction.reply({
        content: `⏳ Please wait **${Math.ceil(rest / 60000)} minutes** before trying again.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const { tweet } = await fetchLatestPost();
      if (!tweet) {
        return interaction.editReply('No tweet found.');
      }
      const url = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;
      await interaction.editReply(url);
    } catch (e) {
      const isRateLimit = e.message === 'RATE_LIMIT' || e.response?.status === 429;
      if (isRateLimit) {
        const resetMs = e.rateReset ?? (e.response?.headers?.['x-rate-limit-reset'] * 1000);
        const wait = resetMs ? Math.ceil((resetMs - Date.now()) / 60000) : '?';
        return interaction.editReply(
          `🚦 Twitter rate limit reached. Try again in ~${wait} minutes.`
        );
      }

      console.error('latesttweet error', e);
      await interaction.editReply('❌ Unexpected Twitter error.');
    }
  },
};
