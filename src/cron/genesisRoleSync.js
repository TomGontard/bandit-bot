// src/cron/genesisRoleSync.js – sans p-limit
// ------------------------------------------------------------
// ➜ Cron hourly that checks Genesis Pass ownership and grants
//    (or removes) the Discord role defined in ROLE_GENESIS_ID.
// ------------------------------------------------------------

require('dotenv').config();
const cron = require('node-cron');
const { ethers } = require('ethers');
const { Client, GatewayIntentBits } = require('discord.js');

const connectDB = require('../services/mongo.js');
const UserLink = require('../services/models/UserLink');
const logger = require('../utils/logger');

const GENESIS_CONTRACT = process.env.NFT_GENESIS_CONTRACT;
const GENESIS_ROLE_ID  = process.env.ROLE_GENESIS_ID;
const GUILD_ID         = process.env.GUILD_ID;
const RPC_URL          = process.env.MONAD_RPC_URL;

if (!GENESIS_CONTRACT || !GENESIS_ROLE_ID || !GUILD_ID) {
  throw new Error('NFT_GENESIS_CONTRACT, ROLE_GENESIS_ID ou GUILD_ID manquant dans .env');
}

// Minimal ABI
const erc721Abi = [
  'function balanceOf(address owner) external view returns (uint256)'
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const genesisContract = new ethers.Contract(GENESIS_CONTRACT, erc721Abi, provider);

// Discord client (no presence intent needed)
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const CONCURRENCY = 10; // max RPC/Discord ops in parallel

async function syncGenesisRoles() {
  logger.info('GenesisRoleSync: started');

  await connectDB();
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(GUILD_ID);

  const links = await UserLink.find({}, 'discordId wallet').lean();

  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const slice = links.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map(async link => {
      try {
        const bal = await genesisContract.balanceOf(link.wallet);
        const hasNFT = bal && bal > 0n; // BigInt > 0

        const member = await guild.members.fetch(link.discordId).catch(() => null);
        if (!member) return;

        const hasRole = member.roles.cache.has(GENESIS_ROLE_ID);

        if (hasNFT && !hasRole) {
          await member.roles.add(GENESIS_ROLE_ID, 'Owns Genesis Pass');
          logger.info(`+ Role added to ${member.user.tag}`);
        }
        if (!hasNFT && hasRole) {
          await member.roles.remove(GENESIS_ROLE_ID, 'No Genesis Pass');
          logger.info(`- Role removed from ${member.user.tag}`);
        }
      } catch (err) {
        logger.warn(`GenesisRoleSync: ${link.discordId} – ${err.message}`);
      }
    }));
  }

  await client.destroy();
  logger.info('GenesisRoleSync: completed');
}

// Schedule: at minute 0 of every hour
cron.schedule('0 * * * *', () => {
  syncGenesisRoles().catch(err => logger.error('GenesisRoleSync fatal', err));
});

module.exports = syncGenesisRoles;
