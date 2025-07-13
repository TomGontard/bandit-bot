import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import UserLink from '../services/models/UserLink.js';
import NFTHolding from '../services/models/NFTHolding.js';
import Whitelist from '../services/models/Whitelist.js';
import Player from '../services/models/Player.js';
import { createEmbed } from '../utils/createEmbed.js';
import weightsConfig from '../config/giveawayWeights.js';

function pickWinners(pool, n) {
  const winners = new Set();
  while (winners.size < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.add(pool.splice(idx, 1)[0]);
  }
  return [...winners];
}

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('🎉 Run a weighted raffle or partner giveaway (Genesis-based + level bonus)')
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
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const amount = interaction.options.getInteger('amount');
  const partner = interaction.options.getString('partner');
  const guild = interaction.guild;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const errandRole = guild.roles.cache.get(process.env.ROLE_ERRAND_ID);
  if (!errandRole) return interaction.editReply('❌ Errand role not found.');

  const members = await guild.members.fetch({ withPresences: false });
  const pool = [];

  for (const member of members.values()) {
    if (!member.roles.cache.has(errandRole.id)) continue;

    const [holding, player] = await Promise.all([
      NFTHolding.findOne({ discordId: member.id }),
      Player.findOne({ discordId: member.id })
    ]);

    const nftCount = holding?.genesis || 0;
    const level = player?.level || 1;

    if (nftCount === 0 && level <= 1) continue;

    let roleMult = 1;
    for (const [rid, w] of Object.entries(weightsConfig.roles)) {
      if (member.roles.cache.has(rid)) roleMult = Math.max(roleMult, w);
    }

    const ticketsFromNFTs = nftCount * 100 * roleMult;
    const ticketsFromLevel = level * 10;
    const totalTickets = ticketsFromNFTs + ticketsFromLevel;

    for (let i = 0; i < totalTickets; i++) pool.push(member.id);
  }

  if (!pool.length) return interaction.editReply('⚠️ No eligible users found.');

  const totalTickets = pool.length;
  const countMap = pool.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
  const participantCount = Object.keys(countMap).length;

  const winners = pickWinners([...pool], amount);
  if (!winners.length) return interaction.editReply('⚠️ Not enough winners.');

  const [annCh, logCh] = await Promise.all([
    guild.channels.fetch(process.env.CHANNEL_REWARDS_ID),
    guild.channels.fetch(process.env.CHANNEL_LOGS_ID)
  ]);
  const ping = `@everyone`;

  const winnerWallets = await UserLink.find({
    discordId: { $in: winners }
  }, 'wallet discordId');

  const walletMap = new Map(winnerWallets.map(w => [w.discordId, w.wallet]));

  const lines = winners.map((id, i) => {
    const chance = ((countMap[id] / totalTickets) * 100).toFixed(2);
    return partner
      ? `**${i + 1}.** <@${id}> – ${chance}% chance – ${countMap[id]} tickets`
      : `**${i + 1}.** <@${id}> — +1 WL — ${chance}% chance`;
  });

  if (!partner) {
    for (const id of winners) {
      await Whitelist.findOneAndUpdate(
        { discordId: id },
        {
          $inc: { whitelistsGiven: 1 },
          $push: {
            whitelistsLogs: {
              type: 'manual',
              amount: 1,
              reason: 'Giveaway',
              staffId: interaction.user.id
            }
          }
        },
        { upsert: true }
      );
    }
  }

  const embed = createEmbed({
    title: partner
      ? `🎁 Genesis & Level Giveaway: ${partner}`
      : `🎉 ${amount} whitelist${amount > 1 ? 's' : ''} distributed!`,
    description: [
      `> Total participants: **${participantCount}**`,
      `> Total tickets: **${totalTickets}**`,
      '',
      ...lines,
      '',
      partner
        ? '> Each Genesis NFT = 100 tickets × role multiplier + 10 per level in the game `/profile`.'
        : '> Each Genesis NFT = 100 tickets × role multiplier + 10 per level.\n> Use `/wallet` to enter future raffles.'
    ].join('\n'),
    interaction
  });

  await annCh.send({
    content: `${ping} ${partner ? 'Partner giveaway!' : 'New whitelist giveaway!'}`,
    embeds: [embed],
    allowed_mentions: { parse: ['roles'], users: winners }
  });

  const winnerAddresses = winners
    .map(id => walletMap.get(id))
    .filter(Boolean)
    .join('\n');

  await logCh.send({
    content: `📝 **Giveaway Winners Wallets**\n\`\`\`\n${winnerAddresses}\n\`\`\``
  });

  await interaction.editReply(`✅ Giveaway complete: ${winners.length} winner(s).`);
}
