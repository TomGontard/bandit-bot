// src/commands/whitelist.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Whitelist = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');
const partnerCollections = require('../config/partnerCollections');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage and view whitelists')
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Show whitelist stats for a user (omit logs for non-admins)')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('The user to inspect')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add whitelists to a user (Admin only)')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Target user')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Number of whitelists to add')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for adding')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove whitelists from a user (Admin only)')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Target user')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Number of whitelists to remove')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for removal')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('total')
        .setDescription('Show total whitelists (Admin only)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    let target = interaction.options.getUser('user') || interaction.user;

    if ((sub === 'add' || sub === 'remove') && !isAdmin) {
      return interaction.reply({ content: '❌ You do not have permission for this action.', ephemeral: true });
    }

    if (sub === 'total') {
      if (!isAdmin) return interaction.reply({ content: '❌ Admin only.', ephemeral: true });

      const all = await Whitelist.find({});

      const staff = all.reduce((sum, r) => sum + r.whitelistsGiven, 0);
      const nfts  = all.reduce((sum, r) => sum + r.whitelistsNFTs, 0);
      const total = staff + nfts;

      const embed = createEmbed({
        interaction,
        title: '📊 Total Whitelist Stats',
        description:
          `📝 Staff-given: ${staff}\n` +
          `🧬 NFT-based:  ${nfts}\n` +
          `📈 Total:       ${total}`
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    let record = await Whitelist.findOne({ discordId: target.id });
    if (!record) record = await Whitelist.create({ discordId: target.id });

    if (sub === 'info') {
      let description;

      if (isAdmin) {
        const logs = record.whitelistsLogs.length
          ? record.whitelistsLogs.map(log => {
              const sign = log.amount > 0 ? '+' : '';
              const who  = log.staffId ? `<@${log.staffId}>` : 'System';
              return `• [${log.date.toLocaleString()}] (${who}) \`${sign}${log.amount}\` ${log.reason||''}`;
            }).join('\n')
          : '_No logs_';

        description =
          `• NFT-based: **${record.whitelistsNFTs}**\n` +
          `• Manual:    **${record.whitelistsGiven}**\n` +
          `• **Total**: **${record.whitelistsNFTs + record.whitelistsGiven}**\n\n` +
          `**History logs:**\n${logs}`;

      } else if (target.id === interaction.user.id) {
        description =
          `• NFT-based: **${record.whitelistsNFTs}**\n` +
          `• Manual:    **${record.whitelistsGiven}**\n` +
          `• **Total**: **${record.whitelistsNFTs + record.whitelistsGiven}**`;

      } else {
        const total = record.whitelistsNFTs + record.whitelistsGiven;
        description = `**${total}** total whitelist(s) for <@${target.id}>.`;
      }

      const embed = createEmbed({
        interaction,
        title: `🎫 Whitelist Info: ${target.username}`,
        description
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const amt     = interaction.options.getInteger('amount');
    const reason  = interaction.options.getString('reason') || (sub === 'remove' ? 'Manual removal' : 'Manual addition');
    const staffId = interaction.user.id;
    const delta   = sub === 'add' ? amt : -amt;

    record.whitelistsGiven = Math.max(0, record.whitelistsGiven + delta);
    record.whitelistsLogs.push({ type: 'manual', amount: delta, reason, staffId });
    await record.save();

    const embed = createEmbed({
      interaction,
      title: sub === 'add' ? '✅ Added Whitelist(s)' : '❌ Removed Whitelist(s)',
      description:
        `User: <@${target.id}>\n` +
        `Manual now: **${record.whitelistsGiven}** | NFT: **${record.whitelistsNFTs}** | Total: **${record.whitelistsGiven + record.whitelistsNFTs}**\n\n` +
        `Change: \`${delta > 0 ? '+' : ''}${delta}\`\n` +
        `Reason: ${reason}`
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
