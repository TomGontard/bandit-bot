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
      await interaction.reply({ content: 'Erreur pendant l’exécution de la commande.', ephemeral: true });
    }
  },
};
