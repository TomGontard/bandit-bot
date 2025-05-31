// src/utils/walletEmbed.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } from 'discord.js';
  
  /* hiérarchie “puissance” des rôles côté serveur */
  const POWER_ROLES = [
    process.env.ROLE_BOSS_ID,
    process.env.ROLE_UNDERBOSS_ID,
    process.env.ROLE_GANGSTER_ID,
    process.env.ROLE_MULE_ID,
    process.env.ROLE_ERRAND_ID,
  ];
  
  /* construit la ligne « Roles » */
  function buildRolesLine(member, hasGenesis, hasEarly) {
    const arr = [];
  
    const top = POWER_ROLES.find((id) => member.roles.cache.has(id));
    if (top) arr.push(`<@&${top}>`);
    if (hasGenesis) arr.push(`<@&${process.env.ROLE_GENESIS_ID}>`);
    if (hasEarly) arr.push(`<@&${process.env.ROLE_EARLY_GANG_ID}>`);
  
    return arr.join(' • ') || '_None_';
  }
  
  export default function walletEmbed(opts) {
    const { member, link, verified, genesisCount, tickets, banditHeld, soonHeld } = opts;
  
    const rolesLine = buildRolesLine(
      member,
      genesisCount > 0,
      member.roles.cache.has(process.env.ROLE_EARLY_GANG_ID)
    );
  
    const desc = [
      `**Roles :** ${rolesLine}`,
      `**Wallet :** \`${link.wallet}\``,
      '',
      `**Wallet information :** #${link.registrationNumber ?? '–'}  —  **Verified :** ${verified ? '✅' : '❌'}  —  **Tickets :** ${tickets}`,
      '',
      `**Genesis Pass :** ${genesisCount}`,
      `**Bandit NFT :** ${banditHeld ?? '–'}`,
      `**Soon… :** ${soonHeld ?? '–'}`,
    ].join('\n');
  
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${member.displayName} — Wallet Profile`,
        iconURL: member.displayAvatarURL(),
      })
      .setColor(0xff7133)
      .setDescription(desc);
  
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('wallet_verify')
        .setLabel('Verify Wallet')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
        .setDisabled(verified),
      new ButtonBuilder()
        .setCustomId('wallet_change')
        .setLabel('Change Wallet')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  
    return { embed, buttons };
  }
  