// src/commands/help.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription("Affiche la liste des commandes disponibles"),

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    let helpText = `📘 **Commandes disponibles**\n\n`;

    // 🟢 Commandes publiques
    helpText += `### 👥 Pour tous les utilisateurs :\n`;
    helpText += `
- \`/savewallet <adresse>\`  
 🔗 Lie ton compte Discord à ton wallet Monad.

- \`/checkwallet\`  
 👁️ Affiche l’adresse EVM actuellement liée à ton compte.

- \`/sync\`  
 🔍 Vérifie la possession de NFTs (Genesis, Bandit, partenaires), met à jour les rôles Discord, et enregistre tes stats en base.
`;

    // 🔐 Commandes admin uniquement
    if (isAdmin) {
      helpText += `\n### 🛠️ Commandes réservées aux administrateurs :\n`;
      helpText += `
- \`/latesttweet\`  
 📡 Relaye manuellement le dernier tweet du compte officiel dans le channel.

- \`/whitelist <discord_id>\`  
 🎫 Ajoute une entrée whitelist à un utilisateur Discord (stockée dans la base de données).

- \`/check <@utilisateur>\`  
 🧾 Affiche toutes les infos Web3 d’un membre (wallet, NFTs, nombre de whitelists, rang d’enregistrement).
`;
    }

    return interaction.reply({ content: helpText, ephemeral: true });
  },
};
