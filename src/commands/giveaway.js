// src/commands/giveaway.js
// ──────────────────────────────────────────────────────────────
// /giveaway <amount>
//  • Randomly awards <amount> WLs to users who:
//      – have at least the Errand role
//      – have linked a wallet (UserLink exists)
//  • Weighted chances based on highest Bandit role held
//  • Announces winners in #announcements and stores DB logs
// ──────────────────────────────────────────────────────────────
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const UserLink   = require('../services/models/UserLink');
const Whitelist  = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');

// ───── weights (multipliers) ─────
const weights = {
  [process.env.ROLE_ERRAND_ID]    : 1.00,
  [process.env.ROLE_MULE_ID]      : 1.25,
  [process.env.ROLE_GANGSTER_ID]  : 1.50,
  [process.env.ROLE_UNDERBOSS_ID] : 1.75,
  [process.env.ROLE_BOSS_ID]      : 2.00,
};

// helper – pick N unique winners from weighted pool
function pickWinners(pool, n) {
  const winners = new Set();
  while (winners.size < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.add(pool.splice(idx, 1)[0]);              // remove to avoid dup
  }
  return [...winners];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Randomly distribute whitelist slots')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of WLs to give')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const guild  = interaction.guild;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    /* ────── build weighted pool ────── */
    const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
    if (!errandRole) {
      return interaction.editReply('❌ Errand role not found / mis-configured.');
    }

    const members = await guild.members.fetch({ withPresences: false });
    const pool    = [];

    for (const member of members.values()) {
      if (!member.roles.cache.has(errandRole.id)) continue;      // not Errand

      // has a linked wallet ?
      const linked = await UserLink.exists({ discordId: member.id });
      if (!linked) continue;

      // highest weight the member qualifies for
      let multiplier = 1;
      for (const [roleId, weight] of Object.entries(weights)) {
        if (member.roles.cache.has(roleId)) multiplier = Math.max(multiplier, weight);
      }

      // push the member.id 'multiplier' times
      for (let i = 0; i < multiplier * 100; i++) pool.push(member.id);
      // (×100 to keep integers; relative chances stay the same)
    }

    if (pool.length === 0) {
      return interaction.editReply('⚠️ No eligible users found.');
    }

    const winners = pickWinners(pool, amount);

    /* ────── DB update ────── */
    for (const id of winners) {
      const wl = await Whitelist.findOneAndUpdate(
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

    /* ────── compose announcement ────── */
    const announce = createEmbed({
      title: `A GiveAway just took place and ${amount} whitelist${amount > 1 ? 's' : ''} got distributed! 🎉`,
      description: winners.map((id, i) => `**${i + 1}.** <@${id}> — +1 WL`).join('\n')
        + '\n\n> Use `/savewallet <address>` to enter future raffles!',
      interaction,
    });

    const annChannel = await guild.channels.fetch(process.env.CHANNEL_LOGS_ID);
    const ping       = process.env.ROLE_ERRAND_ID ? `<@&${process.env.ROLE_ERRAND_ID}> ` : '';

    await annChannel.send({
        content: `${ping}New whitelist giveaway! 🤘🔥`,
        embeds: [announce],
        allowed_mentions: {
            parse: ['roles'],   // autorise le ping du rôle @Errand
            users: winners      // autorise uniquement le ping des gagnants
        }
    });

    /* ────── done ────── */
    await interaction.editReply(`✅ Giveaway finished – ${winners.length} winner(s) announced.`);
  },
};
