// src/events/interactionCreate.js
module.exports = {
  name: 'interactionCreate',
  execute: async (interaction, client) => {
      if (!interaction.isChatInputCommand()) return;
      
      const command = client.commands?.get(interaction.commandName);
      
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Erreur interne.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Erreur interne.', ephemeral: true });
      }
    }
  },
};
