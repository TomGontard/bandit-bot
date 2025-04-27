// src/events/interactionCreate.js
module.exports = {
  name: 'interactionCreate',
  execute: async (interaction, client) => {

    // ✅ Handles clickable buttons (customId)
    /* --------------------------------------------------------- */
    if (interaction.isButton()) {
      const generalPing = `<#${process.env.CHANNEL_GENERAL_ID}>`;   // 👈 ping dynamique

      const guide =
      `### 🔐 Getting started
      1️⃣  \`/savewallet <address>\` – link your Monad wallet  
      2️⃣  \`/checkwallet\` – make sure the link is saved  
      3️⃣  \`/sync\` – unlock roles, giveaways & partner perks  

      Join the conversation in ${generalPing} and don’t miss any update!`;

      await interaction.reply({
        content: guide,
        flags: 64,          // 64 = MessageFlags.Ephemeral
      });
      return;
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
