// src/commands/frenchnads.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const FrenchNads = require('../services/models/frenchnads');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('frenchnads')
    .setDescription('Register yourself or someone else (admin only) as a FrenchNad')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User to register (admin only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // non-admins can only register themselves
    if (!isAdmin && targetUser.id !== interaction.user.id) {
      return interaction.reply({
        content: '❌ You can only register yourself unless you are an admin.',
        ephemeral: true
      });
    }

    const discordId       = targetUser.id;
    const discordName     = interaction.guild.members.cache.get(discordId)?.displayName || targetUser.username;
    const discordUsername = targetUser.username;

    try {
      const existing = await FrenchNads.findOne({ discordId });
      if (existing) {
        return interaction.reply({
          content: `✅ <@${discordId}> is already registered as a FrenchNad.`,
          ephemeral: true
        });
      }

      await FrenchNads.create({ discordId, discordName, discordUsername });

      const embed = createEmbed({
        interaction,
        title: '🇫🇷 FrenchNad Registered',
        description: `User <@${discordId}> has been successfully registered as a FrenchNad.`
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error('❌ Error registering FrenchNad:', err);
      return interaction.reply({
        content: '❌ Failed to register user. Please try again later.',
        ephemeral: true
      });
    }
  }
};
