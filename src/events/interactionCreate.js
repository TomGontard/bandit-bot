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

import {
  checkSelfTransferEnvio,
} from '../services/verificationService.js';

import withTimeout from '../utils/withTimeout.js';
import { formatUnits } from 'ethers';

const MODAL_ID = 'wallet_modal';
const INPUT_ID = 'wallet_input';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Si ce n'est pas un bouton, on revient pour traiter slash commands / modals
    if (!interaction.isButton()) {
      // ... ton code modal & slash commands ...
      // (si tu veux gérer d’autres interactions avant les boutons)
    } else {
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
            content: '❌ Wallet command missing.',
            ephemeral: true,
          });
        }
        return walletCmd.execute(interaction);
      }

      // — Verify / Check Self-Transfer
      if (id === 'wallet_verify' || id === 'check_self_transfer') {
        const link = await getUserLink(interaction.user.id);
        if (!link) {
          return interaction.reply({
            content: '❌ Aucun wallet lié à ton compte.',
            ephemeral: true,
          });
        }

        if (link.verified) {
          return interaction.reply({
            content: '✅ Ton wallet est déjà vérifié !',
            ephemeral: true,
          });
        }

        await interaction.deferReply({ ephemeral: true });

        await interaction.editReply({
          content: '🔍 Je vérifie si tu t’es bien auto-envoyé ≥ 0.1 MON dans les 10 dernières minutes (env. 1200 blocs)…',
        });

        let verified = false;
        try {
          verified = await withTimeout(checkSelfTransferEnvio(link.wallet), 30_000);
        } catch (e) {
          console.warn('checkSelfTransferEnvio error:', e.message);
          return interaction.followUp({
            content:
              e.message === 'TIMEOUT'
                ? '⏱️ Timeout RPC, réessaie dans une minute.'
                : '❌ Une erreur est survenue pendant la vérification.',
            ephemeral: true,
          });
        }

        if (verified) {
          await verifyUser(interaction.user.id);
          return interaction.followUp({
            content: '✅ Bravo, ton wallet a bien été vérifié ! Tu peux relancer `/wallet`.',
            ephemeral: true,
          });
        } else {
          return interaction.followUp({
            content: '❌ Aucun self-transfer ≥ 0.1 MON détecté récemment. Réessaie après avoir envoyé 0.1 MON à toi-même.',
            ephemeral: true,
          });
        }
      }

    }

    // ─── Gestion du submit du modal ───────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
      const address = interaction.fields
        .getTextInputValue(INPUT_ID)
        .trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return interaction.reply({
          content: '❌ Invalid address.',
          ephemeral: true,
        });
      }
      await interaction.deferReply({ ephemeral: true });
      await createOrUpdateUserLink(interaction.user.id, address);
      const walletCmd = client.commands.get('wallet');
      return walletCmd.execute(interaction);
    }

    // ─── Slash commands ───────────────────────────────────────────────
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
