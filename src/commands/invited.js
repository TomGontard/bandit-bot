// src/commands/invited.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Invite from '../services/models/Invite.js';
import UserLink from '../services/models/UserLink.js';
import { createEmbed } from '../utils/createEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('invited')
  .setDescription('Show how many users someone has invited and their created invite links')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('The user to inspect')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user');
  const guild = interaction.guild;
  const errandId = process.env.ROLE_ERRAND_ID;

  const doc = await Invite.findOne({ inviterId: user.id });
  const invitedIds = doc?.invitedIds ?? [];
  const total = invitedIds.length;

  let errandAndWallet = 0;
  for (const id of invitedIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    if (member?.roles.cache.has(errandId)) {
      const hasWallet = await UserLink.exists({ discordId: id });
      if (hasWallet) errandAndWallet++;
    }
  }

  const walletCount = await UserLink.countDocuments({
    discordId: { $in: invitedIds },
  });

  const allInvites = await guild.invites.fetch();
  const userInvites = allInvites.filter((inv) => inv.inviter?.id === user.id);

  const inviteLines = userInvites.map((inv) => {
    const uses = inv.uses ?? 0;
    const code = inv.code;
    const created = inv.createdAt?.toLocaleDateString('en-GB') ?? 'unknown';
    return `• \`${code}\` — **${uses}** use(s) (created: ${created})`;
  });

  const description =
    `📨 <@${user.id}> has invited **${total}** member(s)\n` +
    `✅ **${errandAndWallet}** reached **Errand** and linked wallet\n` +
    `💼 **${walletCount}** linked a wallet\n` +
    (errandAndWallet >= 3
      ? `🐴 Eligible for the **Mule** role`
      : `🏃 Needs **${3 - errandAndWallet}** more to unlock Mule eligibility`) +
    (inviteLines.length
      ? `\n\n📬 **Invite links created by <@${user.id}>**:\n${inviteLines.join('\n')}`
      : `\n\n📬 <@${user.id}> has not created any invite links.`);

  const embed = createEmbed({
    title: '📨 Invite Tracker',
    description,
    interaction,
  });

  await interaction.editReply({ embeds: [embed] });
}
