// src/commands/check.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserLink } = require('../services/userLinkService');
const NFTHolding = require('../services/models/NFTHolding');
const { partners } = require('../config/collections');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Inspect the Web3 info of a specific user')
    .addUserOption(opt =>
      opt.setName('utilisateur')
        .setDescription('The user to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // admin only

  async execute(interaction) {
    const member = interaction.options.getUser('utilisateur');
    const discordId = member.id;

    const userLink = await getUserLink(discordId);
    const holding = await NFTHolding.findOne({ discordId });

    if (!userLink || !holding) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ User Not Found',
          description: `No Web3 data found for <@${discordId}>.`,
          interaction
        })],
        flags: 64,
      });
    }

    const wallet = userLink.wallet;
    const registrationNumber = userLink.registrationNumber;
    const genesis = holding.genesis || 0;
    const bandit = holding.bandit || 0;
    const whitelist = holding.whitelistCount || 0;

    const lines = partners
      .filter(p => holding.counts.get(p.address) > 0)
      .map(p => `• **${p.name}**: ${holding.counts.get(p.address)}`);

    const list = lines.length ? lines.join('\n') : '_No NFTs held_';

    const embed = createEmbed({
      title: `👤 Details for ${member.tag}`,
      description:
        ` 👤 **Details for <@${discordId}>**
          🧾 Wallet: \`${wallet}\`
          🔢 Registered as user #${registrationNumber}
          🎫 Whitelists received: **${whitelist}**

          🎟️ Genesis: **${genesis}**
          🤠 Bandit: **${bandit}**

          🧩 NFT collections breakdown:
          ${list}
          `,
      interaction
    });

    await interaction.reply({
      embeds: [embed],
      flags: 64,
    });
  },
};