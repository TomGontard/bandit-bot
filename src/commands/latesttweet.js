// src/commands/latesttweet.js
const { SlashCommandBuilder } = require('discord.js');
const { fetchLatestPost }     = require('../services/twitter');
const checkCooldown           = require('../utils/cooldown');

const WINDOW_15_MIN = 15 * 60 * 1000;   // 15 minutes

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latesttweet')
    .setDescription('Affiche le dernier tweet original (hors réponses) du compte'),

  async execute(interaction) {
    // Cool‑down utilisateur (15 min)
    const rest = checkCooldown(interaction.user.id, 'latesttweet', WINDOW_15_MIN);
    if (rest) {
      return interaction.reply({
        content: `⏳ Patiente encore **${Math.ceil(rest / 60000)} min** avant de réessayer.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const { tweet } = await fetchLatestPost();
      if (!tweet) {
        return interaction.editReply('Aucun tweet trouvé.');
      }
      const url = `https://fxtwitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;
      await interaction.editReply(url);
    } catch (e) {
        const isRateLimit = e.message === 'RATE_LIMIT' || e.response?.status === 429;
        if (isRateLimit) {
            const resetMs = e.rateReset ?? (e.response?.headers?.['x-rate-limit-reset'] * 1000);
            const wait = resetMs ? Math.ceil((resetMs - Date.now()) / 60000) : '?';
            return interaction.editReply(
            `🚦 Limite Twitter atteinte ; réessaie dans ~${wait} min.`
            );
        }

        console.error('latesttweet error', e);
        await interaction.editReply('❌ Erreur Twitter inattendue.');
        }

  },
};
