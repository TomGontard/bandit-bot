// src/commands/tweet.js
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import { TwitterApi } from 'twitter-api-v2';
import { buildTwitterButtons } from '../utils/twitterButtons.js';
import { createEmbed } from '../utils/createEmbed.js';
import TweetState from '../services/models/TweetState.js';

const twitter = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// ───── helper ─────
function safeRespond(interaction, action) {
  return action().catch((err) => {
    // 10062 = "Unknown interaction" → it simply expired, ignore silently
    if (err?.code === 10062) {
      console.warn('⚠️ Interaction expired – response skipped');
    } else {
      throw err;
    }
  });
}

// ───── command data ─────
export const data = new SlashCommandBuilder()
  .setName('tweet')
  .setDescription('Fetch or post the latest tweet')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName('get').setDescription('Fetch & store the latest tweet')
  )
  .addSubcommand((sub) =>
    sub
      .setName('post')
      .setDescription('Post the stored tweet (or a given ID)')
      .addStringOption((opt) =>
        opt.setName('id').setDescription('Specific tweet ID to post').setRequired(false)
      )
  );

// ───── execute ─────
export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'get') return handleGet(interaction);
  if (sub === 'post') return handlePost(interaction);
}

// ──────────────────────────────────────────────────────────────
//  /tweet get  – fetch & store latest tweet
// ──────────────────────────────────────────────────────────────
async function handleGet(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // fetch latest tweet / retweet from account
  const { data } = await twitter.v2.userByUsername(process.env.TWITTER_HANDLE);
  const uid = data.id;
  const timeline = await twitter.v2.userTimeline(uid, {
    exclude: 'replies',
    max_results: 5,
    'tweet.fields': 'id,created_at',
  });

  const tweet = timeline.data?.[0];
  if (!tweet) {
    return safeRespond(interaction, () =>
      interaction.editReply('❌ No tweet found.')
    );
  }

  // store ID in DB
  await TweetState.findOneAndUpdate(
    {},
    { lastId: tweet.id },
    { upsert: true, new: true }
  );

  const url = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweet.id}`;
  const embed = createEmbed({
    title: '🐦 Latest Tweet stored',
    description: `[Open tweet](${url})\n\nUse \`/tweet post\` to relay it.`,
    interaction,
  });

  return safeRespond(interaction, () =>
    interaction.editReply({ embeds: [embed] })
  );
}

// ──────────────────────────────────────────────────────────────
//  /tweet post [id]  – preview & require /confirm
// ──────────────────────────────────────────────────────────────
async function handlePost(interaction) {
  const explicitId = interaction.options.getString('id');
  let tweetId = explicitId;

  if (!tweetId) {
    // get stored ID
    const state = await TweetState.findOne({});
    if (!state?.lastId) {
      return interaction.reply({
        content: '❌ No tweet stored. Run `/tweet get` first.',
        flags: 64,
      });
    }
    tweetId = state.lastId;
  }

  const url = `https://twitter.com/${process.env.TWITTER_HANDLE}/status/${tweetId}`;

  // preview + confirm buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm')
      .setLabel('Confirm post')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [
      createEmbed({
        title: '📢 Post this tweet?',
        description: url,
        interaction,
      }),
    ],
    components: [row],
    flags: 64,
  });

  // collector for 60 s
  const msg = await interaction.fetchReply();
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  collector.once('collect', async (btnInt) => {
    if (btnInt.customId === 'cancel') {
      collector.stop();
      return safeRespond(interaction, () =>
        interaction.editReply({
          content: '⏳ Post cancelled (no /confirm).',
          embeds: [],
          components: [],
        })
      );
    }

    // confirm
    await safeRespond(btnInt, () => btnInt.deferUpdate());

    const channel = await interaction.guild.channels.fetch(process.env.CHANNEL_TWITTER_ID);
    const ping  = `@everyone`;
    await channel.send({
      content: `${ping}New tweet gang ! 🤘🔥\n${url}`,
      components: [buildTwitterButtons(tweetId)],
    });

    await safeRespond(interaction, () =>
      interaction.editReply({
        content: '✅ Tweet posted.',
        embeds: [],
        components: [],
      })
    );
    collector.stop();
  });

  collector.once('end', async (_, reason) => {
    if (reason === 'time') {
      await safeRespond(interaction, () =>
        interaction.editReply({
          content: '⌛ Post cancelled (no Confirm).',
          embeds: [],
          components: [],
        })
      );
    }
  });
}
