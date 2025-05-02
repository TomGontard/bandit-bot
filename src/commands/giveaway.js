// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const UserLink       = require('../services/models/UserLink');
const Whitelist      = require('../services/models/Whitelist');
const { createEmbed }= require('../utils/createEmbed');
const weightsConfig  = require('../config/giveawayWeights');

// helper – pick N unique winners from weighted pool
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
    .setDescription('🎉 Run a weighted raffle or partner giveaway')
    .addIntegerOption(opt =>
      opt.setName('amount')
         .setDescription('How many winners?')
         .setRequired(true)
         .setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('partner')
         .setDescription('(Optional) Partner name — no WL changes')
         .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const amount  = interaction.options.getInteger('amount');
    const partner = interaction.options.getString('partner');
    const guild   = interaction.guild;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 1) build weighted pool
    const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
    if (!errandRole) {
      return interaction.editReply('❌ Errand role not found.');
    }

    const members = await guild.members.fetch({ withPresences: false });
    const pool    = [];

    for (const member of members.values()) {
      if (!member.roles.cache.has(errandRole.id)) continue;
      const link = await UserLink.findOne({ discordId: member.id });
      if (!link) continue;

      // role weight
      let roleW = 1;
      for (const [rid, w] of Object.entries(weightsConfig.roles)) {
        if (member.roles.cache.has(rid)) {
          roleW = Math.max(roleW, w);
        }
      }

      // registration weight (by order number)
      let regW = 1;
      for (const bucket of weightsConfig.registrationMultipliers) {
        if (link.registrationNumber >= bucket.min &&
           link.registrationNumber <= bucket.max) {
          regW = bucket.weight;
          break;
        }
      }

      const tickets = Math.floor(roleW * regW * 100);
      for (let i = 0; i < tickets; i++) {
        pool.push(member.id);
      }
    }

    if (!pool.length) {
      return interaction.editReply('⚠️ No eligible users found.');
    }

    // snapshot for odds
    const originalPool     = [...pool];
    const totalTickets     = originalPool.length;
    const countMap         = originalPool.reduce((m, id) => {
      m[id] = (m[id] || 0) + 1;
      return m;
    }, {});
    const participantCount = Object.keys(countMap).length;

    // pick winners
    const winners = pickWinners(pool, amount);
    if (!winners.length) {
      return interaction.editReply('⚠️ Not enough winners.');
    }

    // fetch announcement channel and role-ping
    const annCh = await guild.channels.fetch(process.env.CHANNEL_REWARDS_ID);
    const ping  = `<@&${process.env.ROLE_ERRAND_ID}>`;
    
    if (partner) {
      // ── Partner giveaway (no DB changes) ──
      const lines = winners.map((id, i) => `**${i+1}.** <@${id}>`);
      const embed = createEmbed({
        title: `🤝 Partner Giveaway: ${partner}`,
        description:
          `Total Errand that verified their wallet: **${participantCount}**\n` +
          `Total tickets after multiplier: **${totalTickets}**\n\n` +
          lines.join('\n') +
          `\n\n> Use \`/savewallet <address>\` to enter future raffles!`,
        interaction,
      });

      await annCh.send({
        content: `${ping} New partner giveaway for **${partner}**!`,
        embeds: [embed],
        allowed_mentions: { parse: ['roles'], users: winners },
      });

    } else {
      // ── Standard WL giveaway ──
      for (const id of winners) {
        await Whitelist.findOneAndUpdate(
          { discordId: id },
          {
            $inc: { whitelistsGiven: 1 },
            $push: { whitelistsLogs: {
              type:   'manual',
              amount: 1,
              reason: 'Giveaway',
              staffId: interaction.user.id,
            } }
          },
          { upsert: true }
        );
      }

      const lines = winners.map((id, i) => {
        const tickets = countMap[id] || 0;
        const chance  = ((tickets / totalTickets) * 100).toFixed(2);
        return `**${i+1}.** <@${id}> — +1 WL — ${chance}% chance`;
      });

      const embed = createEmbed({
        title: `🎉 ${amount} whitelist${amount > 1 ? 's' : ''} distributed!`,
        description:
          `> \n` +
          `Total Errand that verified their wallet: **${participantCount}**\n` +
          `Total tickets after multiplier: **${totalTickets}**\n\n` +
          lines.join('\n') +
          `\n\n> Use \`/savewallet <address>\` to enter future raffles!`,
        interaction,
      });

      await annCh.send({
        content: `${ping} New whitelist giveaway! 🤘🔥`,
        embeds: [embed],
        allowed_mentions: { parse: ['roles'], users: winners },
      });
    }

    // finish
    await interaction.editReply(`✅ Giveaway complete: ${winners.length} winner(s).`);
    // ── Optional explanation embed for users ──
    const infoEmbed = createEmbed({
      interaction,
      title: '📘 How Giveaways Work',
      description:
        `🎯 All **Errands** with a linked wallet get **100 tickets**.\n` +
        `💥 Higher roles multiply your odds (Mule = 1.25×, Boss = 2×).\n` +
        `🔢 Early registration = more chances via ticket boosts.\n\n` +
        `🧠 Use \`/sync\` to check your **tickets** and **registration number**.\n` +
        `🪙 Not linked yet? Use \`/savewallet <address>\` now to join raffles!`
    });

    await interaction.channel.send({ embeds: [infoEmbed] });

  },
};
