// src/events/interactionCreate.js
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import {
  createOrUpdateUserLink,
  getUserLink,
  verifyUser,
} from '../services/userLinkService.js';
import { checkSelfTransferEnvio } from '../services/verificationService.js';
import withTimeout from '../utils/withTimeout.js';

const MODAL_ID = 'wallet_modal';
const INPUT_ID = 'wallet_input';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ─── Button handling ───────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // — Link / Change Wallet
      if (id === 'link_wallet' || id === 'wallet_change') {
        const modal = new ModalBuilder()
          .setCustomId(MODAL_ID)
          .setTitle('🔐 Enter Your Wallet Address')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId(INPUT_ID)
                .setLabel('EVM wallet (starts with 0x…)')
                .setPlaceholder('0x…')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }

      // — Your Wallet
      if (id === 'your_wallet') {
        const walletCmd = client.commands.get('wallet');
        if (!walletCmd) {
          return interaction.reply({
            content: '❌ Wallet command is missing.',
            ephemeral: true,
          });
        }
        // The /wallet command handles its own deferReply, so call it directly
        return walletCmd.execute(interaction);
      }

      // — Verify / Check Self-Transfer
      if (id === 'wallet_verify' || id === 'check_self_transfer') {
        const link = await getUserLink(interaction.user.id);
        if (!link) {
          return interaction.reply({
            content: '❌ No wallet linked to your account.',
            ephemeral: true,
          });
        }

        if (link.verified) {
          return interaction.reply({
            content: '✅ Your wallet is already verified!',
            ephemeral: true,
          });
        }

        // Defer the reply here
        await interaction.deferReply({ ephemeral: true });
        // Initial status message
        await interaction.editReply({
          content:
            '🔍 Checking if you have self-transferred ≥ 0.1 MON to yourself in the last 10 minutes…',
        });

        let verified = false;
        try {
          verified = await withTimeout(checkSelfTransferEnvio(link.wallet), 30_000);
        } catch (e) {
          console.warn('checkSelfTransferEnvio error:', e.message);
          return interaction.followUp({
            content:
              e.message === 'TIMEOUT'
                ? '⏱️ RPC timeout. Please try again in a minute.'
                : '❌ An error occurred during verification.',
            ephemeral: true,
          });
        }

        if (verified) {
          await verifyUser(interaction.user.id);
          return interaction.followUp({
            content:
              '✅ Congratulations! Your wallet has been verified. You can now re-run `/wallet`.',
            ephemeral: true,
          });
        } else {
          return interaction.followUp({
            content:
              '❌ No self-transfer ≥ 0.1 MON detected recently. Please try again after sending 0.1 MON to yourself.',
            ephemeral: true,
          });
        }
      }

      return;
    }

    // ─── Modal submit handling ───────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
      const address = interaction.fields.getTextInputValue(INPUT_ID).trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return interaction.reply({
          content: '❌ Invalid address.',
          ephemeral: true,
        });
      }

      // Do not defer here, as /wallet will defer itself
      await createOrUpdateUserLink(interaction.user.id, address);
      const walletCmd = client.commands.get('wallet');
      return walletCmd.execute(interaction);
    }

    // ─── Slash commands ──────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: '❌ Internal error.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  },
};
