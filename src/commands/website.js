// src/commands/website.js – fournit les liens vers le site principal et la page de mint
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
  } = require('discord.js');
  const { createEmbed } = require('../utils/createEmbed');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('website')
      .setDescription('Get quick links to the project website and mint page'),
  
    async execute(interaction) {
      const embed = createEmbed({
        title: '🌐 Monad Bandit – Links',
        description: [
          '• **Website**: https://www.monadbandit.xyz',
          '• **Mint page**: https://www.monadbandit.xyz/genesismint',
          '• **Navigation page**: https://www.monadbandit.xyz/navigation',
        ].join('\n'),
        interaction
      });
  
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Website')
          .setURL('https://www.monadbandit.xyz')
          .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Navigation Page')
            .setURL('https://www.monadbandit.xyz/navigation')
            .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Mint Page')
          .setURL('https://www.monadbandit.xyz/genesismint')
          .setStyle(ButtonStyle.Link)
      );
  
      await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
    }
  };
  