// src/cron/genesisRoleSync.js
// ------------------------------------------------------------
// ➜ Cron hourly: sync Genesis role + Mainnet FCFS/GTD WL roles
//    - Genesis: on-chain balance > 0
//    - FCFS WL: link.verified && (UtilityPass holder OR WLAddress.fcfs)
//    - GTD  WL: link.verified && (Genesis holder OR Bandit holder OR WLAddress.gtd)
// ------------------------------------------------------------

import 'dotenv/config';
import cron from 'node-cron';
import { ethers } from 'ethers';
import { Client, GatewayIntentBits } from 'discord.js';

import connectDB from '../services/mongo.js';
import UserLink from '../services/models/UserLink.js';
import WLAddress from '../services/models/WLAddress.js';
import logger from '../utils/logger.js';

const RPC_URL          = process.env.MONAD_RPC_URL;
const GUILD_ID         = process.env.GUILD_ID;
const GENESIS_CONTRACT = (process.env.NFT_GENESIS_CONTRACT || '').toLowerCase();
const GENESIS_ROLE_ID  = process.env.ROLE_GENESIS_ID;

const FCFS_ROLE_ID     = process.env.ROLE_MAINNET_FCFS_WL_ID; // optional
const GTD_ROLE_ID      = process.env.ROLE_MAINNET_GTD_WL_ID;  // optional

const UTILITY_CONTRACT = (process.env.NFT_UTILITY_PASS_CONTRACT || '').toLowerCase();
const BANDIT_CONTRACTS = (process.env.NFT_BANDIT_CONTRACTS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(a => a && ethers.isAddress(a));

if (!GUILD_ID || !GENESIS_CONTRACT || !GENESIS_ROLE_ID) {
  throw new Error('GUILD_ID, NFT_GENESIS_CONTRACT ou ROLE_GENESIS_ID manquant dans .env');
}

const erc721Abi = ['function balanceOf(address owner) view returns (uint256)'];

const provider        = new ethers.JsonRpcProvider(RPC_URL);
const genesisContract = new ethers.Contract(GENESIS_CONTRACT, erc721Abi, provider);
const utilityContract = ethers.isAddress(UTILITY_CONTRACT)
  ? new ethers.Contract(UTILITY_CONTRACT, erc721Abi, provider)
  : null;
const banditContracts = BANDIT_CONTRACTS.map(addr => new ethers.Contract(addr, erc721Abi, provider));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const CONCURRENCY = 10;

async function syncGenesisRoles() {
  logger.info('GenesisRoleSync: started');

  await connectDB();
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(GUILD_ID);

  const links = await UserLink.find({}, 'discordId wallet verified').lean();

  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const slice = links.slice(i, i + CONCURRENCY);

    await Promise.all(slice.map(async (link) => {
      try {
        const wallet = (link.wallet || '').toLowerCase();
        if (!ethers.isAddress(wallet)) return;

        // Parallel fetch: member, WL doc, balances
        const [member, wlDoc, genesisBal] = await Promise.all([
          guild.members.fetch(link.discordId).catch(() => null),
          WLAddress.findOne({ address: wallet }).lean().catch(() => null),
          genesisContract.balanceOf(wallet).catch(() => 0n),
        ]);
        if (!member) return;

        // ---- Genesis role sync
        const hasGenesis = genesisBal > 0n;
        const hasGenesisRole = member.roles.cache.has(GENESIS_ROLE_ID);
        if (hasGenesis && !hasGenesisRole) {
          await member.roles.add(GENESIS_ROLE_ID, 'Owns Genesis Pass');
          logger.info(`+ Genesis role added to ${member.user.tag}`);
        } else if (!hasGenesis && hasGenesisRole) {
          await member.roles.remove(GENESIS_ROLE_ID, 'No Genesis Pass');
          logger.info(`- Genesis role removed from ${member.user.tag}`);
        }

        // ---- FCFS / GTD WL roles (require verified link)
        const isVerified = !!link.verified;

        // Utility holder?
        let hasUtility = false;
        if (isVerified && utilityContract) {
          const ub = await utilityContract.balanceOf(wallet).catch(() => 0n);
          hasUtility = ub > 0n;
        }

        // Bandit holder?
        let hasBandit = false;
        if (isVerified && banditContracts.length) {
          const res = await Promise.allSettled(banditContracts.map(c => c.balanceOf(wallet)));
          const sum = res.reduce((acc, r) => acc + (r.status === 'fulfilled' ? r.value : 0n), 0n);
          hasBandit = sum > 0n;
        }

        const fcfsEligible = isVerified && (hasUtility || !!wlDoc?.fcfs);
        const gtdEligible  = isVerified && ((hasGenesis || hasBandit) || !!wlDoc?.gtd);

        // FCFS role
        if (FCFS_ROLE_ID) {
          const hasFcfsRole = member.roles.cache.has(FCFS_ROLE_ID);
          if (fcfsEligible && !hasFcfsRole) {
            await member.roles.add(FCFS_ROLE_ID, 'Mainnet FCFS WL');
            logger.info(`+ FCFS WL role added to ${member.user.tag}`);
          } else if (!fcfsEligible && hasFcfsRole) {
            await member.roles.remove(FCFS_ROLE_ID, 'No longer FCFS eligible or not verified');
            logger.info(`- FCFS WL role removed from ${member.user.tag}`);
          }
        }

        // GTD role
        if (GTD_ROLE_ID) {
          const hasGtdRole = member.roles.cache.has(GTD_ROLE_ID);
          if (gtdEligible && !hasGtdRole) {
            await member.roles.add(GTD_ROLE_ID, 'Mainnet GTD WL');
            logger.info(`+ GTD WL role added to ${member.user.tag}`);
          } else if (!gtdEligible && hasGtdRole) {
            await member.roles.remove(GTD_ROLE_ID, 'No longer GTD eligible or not verified');
            logger.info(`- GTD WL role removed from ${member.user.tag}`);
          }
        }
      } catch (err) {
        logger.info(`GenesisRoleSync: ${link.discordId} – ${err.message}`);
      }
    }));
  }

  await client.destroy();
  logger.info('GenesisRoleSync: completed');
}

// Hourly
cron.schedule('0 * * * *', () => {
  syncGenesisRoles().catch(err => logger.error('GenesisRoleSync fatal', err));
});

export default syncGenesisRoles;
