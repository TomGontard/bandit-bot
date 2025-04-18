// src/commands/sync.js
const { SlashCommandBuilder } = require('discord.js');
const { getWalletByDiscordId } = require('../services/userLinkService');
const { fetchBalances, aggregate } = require('../services/nftChecker');
const { saveHolding, syncRoles } = require('../services/holdingService');
const { partners } = require('../config/collections');
const checkCooldown = require('../utils/cooldown');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Vérifie tes NFT et synchronise tes rôles'),

  async execute(interaction) {
    // Cool‑down
    const remaining = checkCooldown(interaction.user.id, 'sync');
    if (remaining) {
      return interaction.reply({
        content: `⏳ Patiente encore **${Math.ceil(remaining / 1000)} s** avant de relancer \`/sync\`.`,
        ephemeral: true,
      });
    }

    // … suite logique (get wallet, deferReply, fetchBalances, etc.)

    const wallet = await getWalletByDiscordId(interaction.user.id);
    if (!wallet)
      return interaction.reply({ content: '❌ Aucun wallet lié (`/savewallet`).', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const counts = await fetchBalances(wallet);
    const { genesis, bandit } = aggregate(counts);

    // enregistre en DB
    await saveHolding(interaction.user.id, wallet, counts, genesis, bandit);

    // met à jour les rôles
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await syncRoles(member, genesis, bandit);

    // message récap
    const lines = partners
      .filter(p => counts[p.address] > 0)
      .map(p => `• **${p.name}** : ${counts[p.address]}`);

    const list = lines.length ? lines.join('\n') : '_Aucun NFT détecté_';

    await interaction.editReply(
      `🔍 **Sync terminée**\n` +
      `Genesis : **${genesis}**\nBandit : **${bandit}**\n\n` +
      `NFT trouvés :\n${list}`
    );
  },
};
