// src/commands/invited.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const InviteTrack = require('../services/models/InviteTrack');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invited')
    .setDescription('Show how many users someone has invited and their created invite links')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // admin only

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const guild = interaction.guild;
    const errandRoleId = process.env.ROLE_ERRAND_ID;

    // 🧩 Step 1: Get custom-tracked invites (MongoDB)
    const dbInvites = await InviteTrack.find({ inviterId: user.id });
    const total = dbInvites.length;

    let confirmed = 0;
    for (const invite of dbInvites) {
      const member = await guild.members.fetch(invite.invitedId).catch(() => null);
      if (member?.roles.cache.has(errandRoleId)) confirmed++;
    }

    // 📥 Step 2: Get official Discord invites created by this user
    const allInvites = await guild.invites.fetch();
    const userInvites = allInvites.filter(inv => inv.inviter?.id === user.id);

    const inviteLines = userInvites.map(inv => {
      const uses = inv.uses ?? 0;
      const code = inv.code;
      const created = inv.createdAt?.toLocaleDateString('en-GB') ?? 'unknown';
      return `• \`${code}\` — **${uses}** use(s) (created: ${created})`;
    });

    const summary =
      `📨 <@${user.id}> has invited **${total}** member(s)\n` +
      `✅ Among them, **${confirmed}** reached the **Errand** role\n` +
      (confirmed >= 3
        ? `🐴 Eligible for the **Mule** role\n`
        : `🏃 Needs **${3 - confirmed}** more to reach Mule eligibility\n`);

    const invitesText = inviteLines.length
      ? `📬 **Invite links created by <@${user.id}>**:\n${inviteLines.join('\n')}`
      : `📬 <@${user.id}> has not created any invite links.`

    await interaction.reply({
      ephemeral: true,
      content: `${summary}\n${invitesText}`
    });
  }
};
