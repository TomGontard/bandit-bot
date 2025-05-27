// src/commands/sync.js – version simplifiée (plus de partenaires/whitelists)
const { SlashCommandBuilder } = require('discord.js');
const { ethers } = require('ethers');
const { getWalletByDiscordId } = require('../services/userLinkService');
const NFTHolding  = require('../services/models/NFTHolding');
const { createEmbed } = require('../utils/createEmbed');
const { roles: roleWeights } = require('../config/giveawayWeights');

// ENV
const GENESIS_CONTRACT = process.env.NFT_GENESIS_CONTRACT;
const GENESIS_ROLE_ID  = process.env.ROLE_GENESIS_ID;
const RPC_URL          = process.env.MONAD_RPC_URL;
const provider         = new ethers.JsonRpcProvider(RPC_URL);
const erc721Abi        = [ 'function balanceOf(address) view returns (uint256)' ];
const contract         = new ethers.Contract(GENESIS_CONTRACT, erc721Abi, provider);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync your Genesis holdings & role'),

  async execute(interaction) {
    // 1. Wallet linked ?
    const wallet = await getWalletByDiscordId(interaction.user.id);
    if (!wallet) {
      return interaction.reply({ embeds:[createEmbed({
        title:'❌ No Wallet Linked',
        description:'Use `/savewallet` to link a wallet first.',
        interaction })], ephemeral:true });
    }

    await interaction.deferReply({ ephemeral:true });

    // 2. On‑chain Genesis balance
    let nftCount = 0;
    try {
      const bal = await contract.balanceOf(wallet);
      nftCount  = typeof bal === 'bigint' ? Number(bal) : bal.toNumber();
    } catch (e) {
      console.warn('Genesis balance error:', e.message);
    }

    // 3. Role update
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasRole = member.roles.cache.has(GENESIS_ROLE_ID);
    if (nftCount > 0 && !hasRole) await member.roles.add(GENESIS_ROLE_ID, 'Owns Genesis');
    if (nftCount === 0 && hasRole) await member.roles.remove(GENESIS_ROLE_ID, 'No Genesis');

    // 4. Tickets calculation
    let roleMultiplier = 1;
    for (const [rid, w] of Object.entries(roleWeights)) {
      if (member.roles.cache.has(rid)) roleMultiplier = Math.max(roleMultiplier, w);
    }
    const tickets = nftCount * 100 * roleMultiplier;

    // 5. Persist snapshot (optional)
    await NFTHolding.findOneAndUpdate(
      { discordId:interaction.user.id },
      { genesis:nftCount, updatedAt:new Date() },
      { upsert:true }
    );

    // 6. Embed
    const description = [
      `🔗 **Wallet:** \`${wallet}\``,
      `🥷 **Genesis NFTs:** **${nftCount}**`,
      `🎫 **Tickets:** **${tickets}** (100 × NFTs × role multiplier)`
    ].join('\n');

    await interaction.editReply({ embeds:[createEmbed({ title:'🔄 Sync Complete', description, interaction })] });
  }
};
