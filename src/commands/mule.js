// src/commands/mule.js
import { SlashCommandBuilder } from 'discord.js';
import Invite from '../services/models/Invite.js';
import UserLink from '../services/models/UserLink.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('mule')
  .setDescription('Show your invite stats & Mule eligibility');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const inviterId = interaction.user.id;
  const errandId = process.env.ROLE_ERRAND_ID;
  const muleId = process.env.ROLE_MULE_ID;
  const boosterId = process.env.ROLE_BOOSTER_ID;

  const doc = await Invite.findOne({ inviterId });
  const invitedIds = doc?.invitedIds ?? [];
  const totalInvited = invitedIds.length;

  let confirmed = 0;
  for (const id of invitedIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member?.roles.cache.has(errandId)) {
      const hasWallet = await UserLink.exists({ discordId: id });
      if (hasWallet) confirmed++;
    }
  }

  const walletCount = await UserLink.countDocuments({
    discordId: { $in: invitedIds },
  });

  const member = await guild.members.fetch(inviterId);
  const hasBoost = boosterId && member.roles.cache.has(boosterId);
  const eligible = hasBoost || confirmed >= 3;

  if (eligible && !member.roles.cache.has(muleId)) {
    await member.roles.add(muleId, 'Qualified for Mule role');
  }

  const embed = createEmbed({
    interaction,
    title: '<:MULE:1364560650487074858>  Mule Progress',
    description:
      `📨 You invited **${totalInvited}** member(s)\n` +
      `✅ **${confirmed}** reached **Errand** and linked wallet\n` +
      `💼 **${walletCount}** linked a wallet\n` +
      `🚀 Booster       : **${hasBoost ? '✅' : '—'}**\n` +
      `\n` +
      (eligible
        ? '🎉 You are **eligible** for the **Mule** role — or you already have it!'
        : `🏃 Invite **${3 - confirmed}** more Errands *with linked wallets* or boost the server to unlock **Mule**.`),
  });

  await interaction.editReply({ embeds: [embed] });
}
