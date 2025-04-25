// src/commands/rebuildinvites.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveInviteSnapshot, deleteExpiredInvites } = require('../utils/inviteUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rebuildinvites')
    .setDescription('Force refresh the invite cache from Discord and save to DB')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    await saveInviteSnapshot(guild);
    await deleteExpiredInvites(guild);
    await interaction.reply({ content: '✅ Invite cache successfully rebuilt and cleaned.', ephemeral: true });
  }
};