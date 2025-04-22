// src/events/interactionCreate.js
module.exports = {
  name: 'interactionCreate',
  execute: async (interaction, client) => {

    // ✅ Gère les boutons cliquables (customId)
    if (interaction.isButton()) {
      const command = interaction.customId;

      // Réponse simple qui invite à taper la commande slash
      return await interaction.reply({
        content: `🧠 Tape simplement \`/${command}\` dans ce salon pour commencer.`,
        ephemeral: true,
      });
    }

    // ✅ Gère les slash commands classiques
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
