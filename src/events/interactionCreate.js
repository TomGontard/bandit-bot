// src/events/interactionCreate.js
module.exports = {
  name: 'interactionCreate',
  execute: async (interaction, client) => {

    // ✅ Handles clickable buttons (customId)
    if (interaction.isButton()) {
      const command = interaction.customId;

      // Simple response prompting the user to use the slash command
      return await interaction.reply({
        content: `🧠 Just type \`/${command}\` in this channel to get started.`,
        ephemeral: true,
      });
    }

    // ✅ Handles regular slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands?.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Internal error.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Internal error.', ephemeral: true });
      }
    }
  },
};
