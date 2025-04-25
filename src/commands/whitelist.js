// src/commands/whitelist.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const NFTHolding = require('../services/models/NFTHolding');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription("Assign a whitelist entry to a user")
    .addStringOption(opt =>
      opt.setName('discordid')
        .setDescription('ID of the member to whitelist')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // only admins can use this

  async execute(interaction) {
    const discordId = interaction.options.getString('discordid');

    const holding = await NFTHolding.findOne({ discordId });
    if (!holding) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '❌ User Not Found',
          description: `No record found for user <@${discordId}>.`,
          interaction
        })],
        flags: 64
      });
    }

    holding.whitelistCount = (holding.whitelistCount || 0) + 1;
    await holding.save();

    return interaction.reply({
      embeds: [createEmbed({
        title: '✅ Whitelist Assigned',
        description: `User <@${discordId}> now has **${holding.whitelistCount} whitelist(s)**.`,
        interaction
      })],
      flags: 64
    });
  },
};
