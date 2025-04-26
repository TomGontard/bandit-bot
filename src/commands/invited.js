// src/commands/invited.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const InviteTrack = require('../services/models/InviteTrack');
const { createEmbed } = require('../utils/createEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invited')
    .setDescription('Show how many users someone has invited and their created invite links')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const guild = interaction.guild;
    const errandRoleId = process.env.ROLE_ERRAND_ID;

    const dbInvites = await InviteTrack.find({ inviterId: user.id });
    const total = dbInvites.length;

    let confirmed = 0;
    for (const invite of dbInvites) {
      const member = await guild.members.fetch(invite.invitedId).catch(() => null);
      if (member?.roles.cache.has(errandRoleId)) confirmed++;
    }

    const allInvites = await guild.invites.fetch();
    const userInvites = allInvites.filter(inv => inv.inviter?.id === user.id);

    const inviteLines = userInvites.map(inv => {
      const uses = inv.uses ?? 0;
      const code = inv.code;
      const created = inv.createdAt?.toLocaleDateString('en-GB') ?? 'unknown';
      return `• \`${code}\` — **${uses}** use(s) (created: ${created})`;
    });

    const description =
      `📨 <@${user.id}> has invited **${total}** member(s)\n` +
      `✅ Among them, **${confirmed}** reached the **Errand** role\n` +
      (confirmed >= 3
        ? `🐴 Eligible for the **Mule** role`
        : `🏃 Needs **${3 - confirmed}** more to reach Mule eligibility`) +
      (inviteLines.length
        ? `\n\n📬 **Invite links created by <@${user.id}>**:\n${inviteLines.join('\n')}`
        : `\n\n📬 <@${user.id}> has not created any invite links.`);

    const embed = createEmbed({
      title: '📨 Invite Tracker',
      description,
      interaction,
    });

    await interaction.reply({
      embeds: [embed],
      flags: 64,
    });
  },
};


