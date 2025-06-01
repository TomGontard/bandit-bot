// src/utils/walletEmbedFactory.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } from 'discord.js';
  
  export default function walletEmbedFactory(interaction, link, invitedCount = 0, isBooster = false) {
    const verifiedTxt = link.verified ? '✅ **yes**' : '❌ **no**';
    const boosterTxt = isBooster ? '✨ **Yes**' : 'No';
    const inviteTxt = `📬 **Invited Users:** ${invitedCount}`;
  
    const lines = [
      `**Address:** \`${link.wallet}\``,
      `**Verified:** ${verifiedTxt}`,
      '',
      inviteTxt,
      `**Server Booster:** ${boosterTxt}`,
    ];
  
    if (!link.verified) {
      lines.push(
        '',
        '-# **To verify your wallet, send 0.1 MON to your own address**, then click **Check Self-Transfer** below.'
      );
    }
  
    const embed = new EmbedBuilder()
      .setColor(0xff7133)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle('👁️ Your EVM Wallet')
      .setDescription(lines.join('\n'));
  
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('check_self_transfer')
        .setLabel('Check Self-Transfer')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔍')
        .setDisabled(link.verified),
      new ButtonBuilder()
        .setCustomId('link_wallet')
        .setLabel('Change Wallet')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );
  
    return { embed, buttons };
  }
  