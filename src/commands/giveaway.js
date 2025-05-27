// src/commands/giveaway.js – tickets basés sur le nombre de Genesis NFT
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const UserLink        = require('../services/models/UserLink');
const NFTHolding      = require('../services/models/NFTHolding');
const Whitelist       = require('../services/models/Whitelist');
const { createEmbed } = require('../utils/createEmbed');
const weightsConfig   = require('../config/giveawayWeights');

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
    .setDescription('🎉 Run a weighted raffle or partner giveaway (Genesis-based)')
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

    // rôle de base requis
    const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
    if (!errandRole) {
      return interaction.editReply('❌ Errand role not found.');
    }

    const members = await guild.members.fetch({ withPresences: false });
    const pool    = [];

    for (const member of members.values()) {
      if (!member.roles.cache.has(errandRole.id)) continue;

      // comptes NFT (genesis) à partir du snapshot NFTHolding
      const holding = await NFTHolding.findOne({ discordId: member.id });
      const nftCount = holding?.genesis || 0;
      if (nftCount === 0) continue; // pas de ticket si aucun Genesis

      // multiplicateur de rôle (le plus grand)
      let roleMul = 1;
      for (const [rid, w] of Object.entries(weightsConfig.roles)) {
        if (member.roles.cache.has(rid)) {
          roleMul = Math.max(roleMul, w);
        }
      }

      const tickets = nftCount * 100 * roleMul;
      for (let i = 0; i < tickets; i++) pool.push(member.id);
    }

    if (!pool.length) return interaction.editReply('⚠️ No eligible users found.');

    // snapshot
    const totalTickets = pool.length;
    const countMap = pool.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
    const participantCount = Object.keys(countMap).length;

    const winners = pickWinners([...pool], amount);
    if (!winners.length) return interaction.editReply('⚠️ Not enough winners.');

    const annCh = await guild.channels.fetch(process.env.CHANNEL_REWARDS_ID);
    const ping  = `@everyone`;

    if (partner) {
      // partner giveaway (aucune MAJ DB)
      const lines = winners.map((id,i)=>`**${i+1}.** <@${id}> – ${(countMap[id]/totalTickets*100).toFixed(2)}% chance - holding ${countMap[id]} tickets`);
      const embed = createEmbed({
        title:`<:BANDIT_LOGO:1376648073643688077>enesis Pass holders Giveaway: ${partner}`,
        description:[
          `Total Errands with Genesis: **${participantCount}**`,
          `Total tickets: **${totalTickets}**`,
          '',
          ...lines,
          '',
          '> Each Genesis NFT = 100 tickets × role multiplier.'
        ].join('\n'),
        interaction
      });
      await annCh.send({ content:`${ping} Bandit Genesis holders giveaway for **${partner}**!`, embeds:[embed], allowed_mentions:{parse:['roles'],users:winners} });
    } else {
      // standard WL giveaway
      for (const id of winners) {
        await Whitelist.findOneAndUpdate(
          { discordId:id },
          { $inc:{ whitelistsGiven:1 }, $push:{ whitelistsLogs:{ type:'manual', amount:1, reason:'Giveaway', staffId:interaction.user.id } } },
          { upsert:true }
        );
      }
      const lines = winners.map((id,i)=>{
        const chance=((countMap[id]/totalTickets)*100).toFixed(2);
        return `**${i+1}.** <@${id}> — +1 WL — ${chance}% chance`;
      });
      const embed = createEmbed({
        title:`🎉 ${amount} whitelist${amount>1?'s':''} distributed!`,
        description:[
          `Total Genesis holders on the discord : **${participantCount}**`,
          `Total tickets: **${totalTickets}**`,
          '',
          ...lines,
          '',
          '> 100 tickets per Genesis NFT × role multiplier.',
          '-# You hold a Bandit Genesis Pass ? Link your waller to enter GiveAways.'
        ].join('\n'),
        interaction
      });
      await annCh.send({ content:`${ping} New whitelist giveaway! 🤘🔥`, embeds:[embed], allowed_mentions:{parse:['roles'],users:winners} });
    }

    await interaction.editReply(`✅ Giveaway complete: ${winners.length} winner(s).`);
  }
};
