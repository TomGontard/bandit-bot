// src/commands/mule.js
const { SlashCommandBuilder } = require('discord.js');
const Invite   = require('../services/models/Invite');
const UserLink = require('../services/models/UserLink');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mule')
    .setDescription('Show your invite stats & Mule eligibility'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });   // <─ keeps the token alive

    const guild      = interaction.guild;
    const inviterId  = interaction.user.id;
    const errandId   = process.env.ROLE_ERRAND_ID;
    const muleId     = process.env.ROLE_MULE_ID;

    // ── fetch invite document ────────────────────────────────
    const doc          = await Invite.findOne({ inviterId });
    const invitedIds   = doc?.invitedIds ?? [];
    const totalInvited = invitedIds.length;

    // ── how many reached Errand? ─────────────────────────────
    let errandCount = 0;
    if (totalInvited) {
      const members = await Promise.all(
        invitedIds.map(id => guild.members.fetch(id).catch(() => null))
      );
      errandCount = members.filter(m => m?.roles.cache.has(errandId)).length;
    }

    // ── how many linked wallet? ──────────────────────────────
    const walletCount = await UserLink.countDocuments({
      discordId: { $in: invitedIds },
    });

    // ── give Mule role instantly if eligible ────────────────
    const member = await guild.members.fetch(inviterId);
    if (errandCount >= 3 && !member.roles.cache.has(muleId)) {
      await member.roles.add(muleId, 'Invited 3 Errand members');
    }

    // ── build & send embed ──────────────────────────────────
    const embed = createEmbed({
      interaction,
      title: '<:MULE:1364560650487074858> Mule Progress',
      description: [
        `📨 You invited **${totalInvited}** member(s)`,
        `✅ **${errandCount}** reached **Errand**`,
        `💼 **${walletCount}** linked a wallet`,
        '',
        errandCount >= 3
          ? '🎉 You are **eligible** for the **Mule** role — or you already have it!'
          : `🏃 Invite **${3 - errandCount}** more Errands to unlock **Mule**.`,
      ].join('\n'),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
