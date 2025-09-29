import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import UserLink from '../services/models/UserLink.js';
import NFTHolding from '../services/models/NFTHolding.js';
import Whitelist from '../services/models/Whitelist.js';
import Player from '../services/models/Player.js';
import { createEmbed } from '../utils/createEmbed.js';
import { getRoleMultiplier, computeTickets } from '../utils/tickets.js';

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
  .setDescription('🎉 Run a weighted raffle (Genesis + Level based)')
  .addIntegerOption(opt =>
    opt.setName('amount').setDescription('Number of winners').setRequired(true).setMinValue(1)
  )
  .addStringOption(opt =>
    opt.setName('partner').setDescription('Optional partner name (no DB update)').setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const amount  = interaction.options.getInteger('amount');
  const partner = interaction.options.getString('partner');
  const guild   = interaction.guild;

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

    const nftCount = holding?.genesis || 0; // tu peux additionner bandit ici si tu le souhaites
    const level = player?.level || 1;
    const roleMult = getRoleMultiplier(member);

    const tickets = computeTickets(nftCount, level, roleMult);
    if (tickets <= 0) continue;

    for (let i = 0; i < tickets; i++) pool.push(member.id);
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
  if (!annCh || !logCh) return interaction.editReply('❌ Channels not found.');

  const ping = '@everyone';

  const winnerWallets = await UserLink.find(
    { discordId: { $in: winners } }, 'wallet discordId'
  );
  const walletMap = new Map(winnerWallets.map(w => [w.discordId, w.wallet]));

  const lines = winners.map((id, i) => {
    const chance = ((countMap[id] / totalTickets) * 100).toFixed(2);
    return partner
      ? `**${i + 1}.** <@${id}> – ${chance}% chance – ${countMap[id]} tickets`
      : `**${i + 1}.** <@${id}> — +1 WL — ${chance}% chance`;
  });

  if (!partner) {
    await Promise.all(winners.map((id) =>
      Whitelist.findOneAndUpdate(
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
      )
    ));
  }

  const embed = createEmbed({
    title: partner
      ? `🎁 Genesis Pass holders Giveaway (${partner})`
      : `🎉 ${amount} whitelist${amount > 1 ? 's' : ''} distributed!`,
    description: [
      `> Total participants: **${participantCount}**`,
      `> Total tickets: **${totalTickets}**`,
      '',
      ...lines,
      '',
      '> Each Genesis = 100 tickets, Level = 25, × role multiplier.\n> Use `/wallet` to enter future raffles.'
    ].join('\n'),
    interaction
  });

  await annCh.send({
    content: `${ping} ${partner ? 'Partner giveaway!' : 'New whitelist giveaway!'}`,
    embeds: [embed],
    allowedMentions: { parse: [], users: winners }
  });

  const walletList = winners.map(id => walletMap.get(id)).filter(Boolean).join('\n');
  await logCh.send({ content: `📝 **Wallets gagnants :**\n\`\`\`\n${walletList}\n\`\`\`` });

  await interaction.editReply(`✅ Giveaway complete: ${winners.length} winner(s).`);
}
