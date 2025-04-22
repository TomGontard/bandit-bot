const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const NFTHolding = require('../services/models/NFTHolding');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription("Attribue une whitelist à un utilisateur")
    .addStringOption(opt =>
      opt.setName('discordid')
        .setDescription('ID du membre à whitelister')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // seul admin peut l’utiliser

  async execute(interaction) {
    const discordId = interaction.options.getString('discordid');

    const holding = await NFTHolding.findOne({ discordId });
    if (!holding) {
      return interaction.reply({
        content: `❌ Aucun enregistrement trouvé pour l'utilisateur <@${discordId}>.`,
        ephemeral: true
      });
    }

    holding.whitelistCount = (holding.whitelistCount || 0) + 1;
    await holding.save();

    return interaction.reply({
      content: `✅ L'utilisateur <@${discordId}> possède maintenant **${holding.whitelistCount} whitelist(s)**.`,
      ephemeral: true
    });
  },
};
