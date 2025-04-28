// src/commands/giveaway.js
// ──────────────────────────────────────────────────────────────
// /giveaway <amount>
// /giveaway <partner> <amount>
//  • Randomly awards WLs (or just selects winners if "partner" is used)
//  • Must have at least the Errand role + linked wallet
//  • Weights based on highest Bandit role
// ──────────────────────────────────────────────────────────────
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const UserLink    = require('../services/models/UserLink');
const Whitelist   = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');

// ───── weights (multipliers) ─────
const weights = {
  [process.env.ROLE_ERRAND_ID]    : 1.00,
  [process.env.ROLE_MULE_ID]      : 1.25,
  [process.env.ROLE_GANGSTER_ID]  : 1.50,
  [process.env.ROLE_UNDERBOSS_ID] : 1.75,
  [process.env.ROLE_BOSS_ID]      : 2.00,
};

function pickWinners(pool, n) {
  const winners = new Set();
  while (winners.size < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.add(pool.splice(idx, 1)[0]);
  }
  return [...winners];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Randomly distribute whitelist slots or partner WLs')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of winners')
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(opt =>
      opt.setName('partner')
        .setDescription('Optional partner name (if set, no WL will be given)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const partner = interaction.options.getString('partner');
    const amount  = interaction.options.getInteger('amount');
    const guild   = interaction.guild;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
    if (!errandRole) {
      return interaction.editReply('❌ Errand role not found / mis-configured.');
    }

    const members = await guild.members.fetch({ withPresences: false });
    const pool    = [];

    for (const member of members.values()) {
      if (!member.roles.cache.has(errandRole.id)) continue;
      const linked = await UserLink.exists({ discordId: member.id });
      if (!linked) continue;

      let multiplier = 1;
      for (const [roleId, weight] of Object.entries(weights)) {
        if (member.roles.cache.has(roleId)) multiplier = Math.max(multiplier, weight);
      }
      for (let i = 0; i < multiplier * 100; i++) pool.push(member.id);
    }

    if (pool.length === 0) {
      return interaction.editReply('⚠️ No eligible users found.');
    }

    const winners = pickWinners(pool, amount);
    if (winners.length === 0) {
      return interaction.editReply('⚠️ Not enough winners could be selected.');
    }

    const annChannel = await guild.channels.fetch(process.env.CHANNEL_ANNOUNCEMENTS_ID);
    const ping       = process.env.ROLE_ERRAND_ID ? `<@&${process.env.ROLE_ERRAND_ID}> ` : '';

    if (partner) {
      const embed = createEmbed({
        title: `🤝 Whitelist Giveaway for **${partner}**!`,
        description: winners.map((id, i) => `**${i + 1}.** <@${id}>`).join('\n') +
          '\n\n> Use `/savewallet <address>` to enter future raffles!',
        interaction,
      });

      await annChannel.send({
        content: `${ping}New partner giveaway for **${partner}**! 🎉`,
        embeds: [embed],
        allowed_mentions: {
          parse: ['roles'],
          users: winners,
        },
      });
    } else {
      for (const id of winners) {
        await Whitelist.findOneAndUpdate(
          { discordId: id },
          { $inc: { whitelistsGiven: 1 },
            $push: { whitelistsLogs: {
              type:   'manual',
              amount: 1,
              reason: 'Giveaway',
              staffId: interaction.user.id,
            } } },
          { upsert: true, new: true }
        );
      }

      const embed = createEmbed({
        title: `🎉 ${amount} whitelist${amount > 1 ? 's' : ''} just got distributed!`,
        description: winners.map((id, i) => `**${i + 1}.** <@${id}> — +1 WL`).join('\n') +
          '\n\n> Use `/savewallet <address>` to enter future raffles!',
        interaction,
      });

      await annChannel.send({
        content: `${ping}New whitelist giveaway! 🤘🔥`,
        embeds: [embed],
        allowed_mentions: {
          parse: ['roles'],
          users: winners,
        },
      });
    }

    await interaction.editReply(`✅ Giveaway finished – ${winners.length} winner(s) announced.`);
  },
};
