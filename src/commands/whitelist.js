const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const NFTHolding = require('../services/models/NFTHolding');

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
        content: `❌ No record found for user <@${discordId}>.`,
        ephemeral: true
      });
    }

    holding.whitelistCount = (holding.whitelistCount || 0) + 1;
    await holding.save();

    return interaction.reply({
      content: `✅ User <@${discordId}> now has **${holding.whitelistCount} whitelist(s)**.`,
      ephemeral: true
    });
  },
};
