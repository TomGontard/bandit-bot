// src/commands/checkwallet.js
import { SlashCommandBuilder } from 'discord.js';
import { getWalletByDiscordId } from '../services/userLinkService.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('checkwallet')
  .setDescription("Display the EVM address linked to your Discord account (ephemeral)");

export async function execute(interaction) {
  const discordId = interaction.user.id;
  const wallet = await getWalletByDiscordId(discordId);

  if (!wallet) {
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ No Wallet Linked',
          description: "You haven't linked **any** EVM address to your account yet.",
          interaction,
        }),
      ],
      flags: 64, // Ephemeral
    });
  }

  return interaction.reply({
    embeds: [
      createEmbed({
        title: '✅ Linked Wallet',
        description: `Your linked address is:\n\`${wallet}\``,
        interaction,
      }),
    ],
    flags: 64, // Ephemeral
  });
}
