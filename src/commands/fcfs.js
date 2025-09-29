import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isAddress } from 'ethers';
import WLAddress from '../services/models/WLAddress.js';
import UserLink from '../services/models/UserLink.js';
import { getUtilityPassCount } from '../services/utilityService.js';

export const data = new SlashCommandBuilder()
  .setName('fcfs')
  .setDescription('FCFS whitelist utilities')
  .addSubcommand(sc => sc
    .setName('number')
    .setDescription('Return current number of FCFS whitelists')
  );

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (interaction.options.getSubcommand() === 'number') {
    const manual = await WLAddress.find({ fcfs: true }, 'address').lean();
    const set = new Set(manual.map(a => a.address));

    const links = await UserLink.find({}, 'wallet').lean();
    await Promise.allSettled(
      links.map(async (l) => {
        const w = (l.wallet || '').toLowerCase();
        if (!isAddress(w)) return;
        try {
          if (await getUtilityPassCount(w)) set.add(w);
        } catch {}
      })
    );

    return interaction.editReply(`FCFS WLs: **${set.size}**`);
  }

  return interaction.editReply('❌ Subcommand inconnue.');
}
