// src/commands/check.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserLink } = require('../services/userLinkService');
const NFTHolding = require('../services/models/NFTHolding');
const { partners } = require('../config/collections');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Inspecte les infos Web3 d’un utilisateur')
    .addUserOption(opt =>
      opt.setName('utilisateur')
        .setDescription('L’utilisateur à inspecter')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // seul admin peut l’utiliser

  async execute(interaction) {
    const member = interaction.options.getUser('utilisateur');
    const discordId = member.id;

    const userLink = await getUserLink(discordId);
    const holding = await NFTHolding.findOne({ discordId });

    if (!userLink || !holding) {
      return interaction.reply({
        content: `❌ Aucune donnée trouvée pour <@${discordId}>.`,
        ephemeral: true,
      });
    }

    // construire réponse
    const wallet = userLink.wallet;
    const registrationNumber = userLink.registrationNumber;
    const genesis = holding.genesis || 0;
    const bandit = holding.bandit || 0;
    const whitelist = holding.whitelistCount || 0;

    const lines = partners
      .filter(p => holding.counts.get(p.address) > 0)
      .map(p => `• **${p.name}** : ${holding.counts.get(p.address)}`);

    const list = lines.length ? lines.join('\n') : '_Aucun NFT détenu_';

    await interaction.reply({
      ephemeral: true,
      content:
`👤 **Infos de <@${discordId}>**

🧾 Wallet : \`${wallet}\`
🔢 Inscrit en position : #${registrationNumber}
🎫 Whitelists reçues : **${whitelist}**

🎟️ Genesis : **${genesis}**
🤠 Bandit : **${bandit}**

🧩 Détail des collections :
${list}
`
    });
  },
};
