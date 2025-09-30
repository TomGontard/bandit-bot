// src/commands/whitelist.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Contract, isAddress } from 'ethers';
import WLAddress from '../services/models/WLAddress.js';
import UserLink from '../services/models/UserLink.js';
import { getGenesisCount } from '../services/genesisService.js';
import { getUtilityPassCount } from '../services/utilityService.js';
import { getBanditCount } from '../services/banditService.js';
import withTimeout from '../utils/withTimeout.js';
import { getProvider } from '../utils/providerPool.js';

function parseAddresses(input) {
  const rx = /0x[a-fA-F0-9]{40}/g;
  const found = (input || '').match(rx) || [];
  return [...new Set(found.map(a => a.toLowerCase()).filter(isAddress))];
}

// ---------------- Holders helpers ----------------
const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)',
];
const NEXT_ID_ABI = [
  'function nextTokenId() view returns (uint256)',
  'function _currentIndex() view returns (uint256)',
];

const GENESIS_ADDR = (process.env.NFT_GENESIS_CONTRACT || '').toLowerCase();
const UTILITY_ADDR = (process.env.NFT_UTILITY_PASS_CONTRACT || '').toLowerCase();

function envSupplyFor(addr) {
  const map = {
    [GENESIS_ADDR]: Number(process.env.NFT_GENESIS_SUPPLY || 0) || null,
    [UTILITY_ADDR]: Number(process.env.NFT_UTILITY_SUPPLY || 0) || null,
  };
  return map[addr] || null;
}

async function tryNextTokenId(addr) {
  try {
    const c = new Contract(addr, [...ERC721_ABI, ...NEXT_ID_ABI], getProvider(0));
    if (typeof c.nextTokenId === 'function') {
      const v = await withTimeout(c.nextTokenId(), 3000);
      return typeof v === 'bigint' ? Number(v) : Number(v?.toString?.() ?? v);
    }
    if (typeof c._currentIndex === 'function') {
      const v = await withTimeout(c._currentIndex(), 3000);
      return typeof v === 'bigint' ? Number(v) : Number(v?.toString?.() ?? v);
    }
    return null;
  } catch { return null; }
}

async function tryTotalSupply(addr) {
  try {
    const c = new Contract(addr, ERC721_ABI, getProvider(0));
    const ts = await withTimeout(c.totalSupply(), 3000);
    const n  = typeof ts === 'bigint' ? Number(ts) : Number(ts?.toString?.() ?? ts);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
}

async function detectStartIndex(addr, providerIdx = 0) {
  try {
    const c0 = new Contract(addr, ERC721_ABI, getProvider(providerIdx));
    await withTimeout(c0.ownerOf(0), 1500);
    return 0; // 0-based
  } catch { return 1; } // 1-based
}

async function enumerateOwnersRange(addr, startInclusive, endInclusive) {
  const holders = new Set();
  const CONCURRENCY = 200;
  const TIMEOUT_MS = 3000;

  for (let i = startInclusive; i <= endInclusive; i += CONCURRENCY) {
    const slice = Array.from({ length: Math.min(CONCURRENCY, endInclusive - i + 1) }, (_, k) => i + k);
    const c = new Contract(addr, ERC721_ABI, getProvider((i / CONCURRENCY) % 3));
    const res = await Promise.allSettled(slice.map(id => withTimeout(c.ownerOf(id), TIMEOUT_MS)));
    for (const r of res) {
      if (r.status === 'fulfilled') {
        const w = (r.value || '').toLowerCase();
        if (isAddress(w)) holders.add(w);
      }
    }
  }
  return holders;
}

async function holdersByNextId(addr) {
  const nextId = await tryNextTokenId(addr);
  if (!nextId || nextId <= 1) return new Set();
  const minted = nextId - 1;
  return enumerateOwnersRange(addr, 1, minted);
}

async function holdersByTotalSupply(addr) {
  let supply = envSupplyFor(addr);
  if (!supply) supply = await tryTotalSupply(addr);
  if (!supply) return new Set();
  const start = await detectStartIndex(addr);
  const end = start === 0 ? supply - 1 : supply;
  if (end < start) return new Set();
  return enumerateOwnersRange(addr, start, end);
}

// Genesis: nextTokenId → totalSupply → fallback “wallets liés” balanceOf
async function holdersGenesis(linkedWallets) {
  if (!isAddress(GENESIS_ADDR)) return new Set();
  let set = await holdersByNextId(GENESIS_ADDR);
  if (set.size === 0) set = await holdersByTotalSupply(GENESIS_ADDR);
  if (set.size > 0) return set;

  const out = new Set();
  const BATCH = 60, TIMEOUT_MS = 4000;
  for (let i = 0; i < linkedWallets.length; i += BATCH) {
    const slice = linkedWallets.slice(i, i + BATCH);
    const res = await Promise.allSettled(
      slice.map(w => withTimeout(getGenesisCount(w), TIMEOUT_MS).catch(() => 0))
    );
    res.forEach((r, k) => { if (r.status === 'fulfilled' && Number(r.value) > 0) out.add(slice[k]); });
  }
  return out;
}

// Utility: nextTokenId → totalSupply → fallback “wallets liés” balanceOf
async function holdersUtility(linkedWallets) {
  if (!isAddress(UTILITY_ADDR)) return new Set();
  let set = await holdersByNextId(UTILITY_ADDR);
  if (set.size === 0) set = await holdersByTotalSupply(UTILITY_ADDR);
  if (set.size > 0) return set;

  const out = new Set();
  const BATCH = 60, TIMEOUT_MS = 4000;
  for (let i = 0; i < linkedWallets.length; i += BATCH) {
    const slice = linkedWallets.slice(i, i + BATCH);
    const res = await Promise.allSettled(
      slice.map(w => withTimeout(getUtilityPassCount(w), TIMEOUT_MS).catch(() => 0))
    );
    res.forEach((r, k) => { if (r.status === 'fulfilled' && Number(r.value) > 0) out.add(slice[k]); });
  }
  return out;
}
// --------------------------------------------------

export const data = new SlashCommandBuilder()
  .setName('whitelist')
  .setDescription('Manage and audit whitelists')
  .addSubcommand(sc => sc
    .setName('set')
    .setDescription('Set FCFS or GTD flags for wallet addresses')
    .addStringOption(o =>
      o.setName('type')
       .setDescription('FCFS or GTD')
       .setRequired(true)
       .addChoices({ name: 'FCFS', value: 'fcfs' }, { name: 'GTD', value: 'gtd' })
    )
    .addStringOption(o =>
      o.setName('addresses')
       .setDescription('Comma/space/newline-separated EVM addresses')
       .setRequired(true)
    )
  )
  .addSubcommand(sc => sc
    .setName('total')
    .setDescription('Show totals and sync FCFS/GTD roles for members with a linked wallet')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();

  if (sub === 'set') {
    const kind = interaction.options.getString('type'); // 'fcfs' | 'gtd'
    const addrs = parseAddresses(interaction.options.getString('addresses'));
    if (!addrs.length) return interaction.editReply('⚠️ Aucune adresse valide détectée.');

    let ok = 0, fail = 0;
    await Promise.allSettled(addrs.map(async (a) => {
      const set = kind === 'fcfs' ? { fcfs: true } : { gtd: true };
      await WLAddress.findOneAndUpdate(
        { address: a },
        { $set: set, $setOnInsert: { address: a }, $push: { logs: { type: kind, staffId: interaction.user.id } } },
        { upsert: true }
      );
      ok++;
    })).then(res => { fail = res.filter(r => r.status === 'rejected').length; });

    return interaction.editReply(`✅ ${ok} mise(s) à jour. ${fail ? `❌ ${fail} échec(s).` : ''}`);
  }

  if (sub === 'total') {
    const guild = interaction.guild;

    const [manualFcfsDocs, manualGtdDocs] = await Promise.all([
      WLAddress.find({ fcfs: true }, 'address').lean(),
      WLAddress.find({ gtd: true }, 'address').lean(),
    ]);
    const manualFcfs = new Set(manualFcfsDocs.map(d => (d.address || '').toLowerCase()));
    const manualGtd  = new Set(manualGtdDocs.map(d => (d.address || '').toLowerCase()));

    const links = await UserLink.find({}, 'wallet discordId').lean();
    const walletToUser = new Map(); // wallet lc -> discordId
    const userToWallet = new Map(); // discordId -> wallet lc
    for (const l of links) {
      const w = (l.wallet || '').toLowerCase();
      if (isAddress(w)) { walletToUser.set(w, l.discordId); userToWallet.set(l.discordId, w); }
    }
    const linkedWallets = [...walletToUser.keys()];

    const allMembers = await guild.members.fetch({ withPresences: false });
    const inGuildUsers = new Set(allMembers.map(m => m.id));
    const isInGuildWallet = (w) => {
      const uid = walletToUser.get(w);
      return uid ? inGuildUsers.has(uid) : false;
    };

    const [utilHoldersAll, genHoldersAll] = await Promise.all([
      holdersUtility(linkedWallets),
      holdersGenesis(linkedWallets),
    ]);

    const banditHoldersAll = new Set();
    const BATCH = 60, TIMEOUT_MS = 4000;
    for (let i = 0; i < linkedWallets.length; i += BATCH) {
      const slice = linkedWallets.slice(i, i + BATCH);
      const res = await Promise.allSettled(
        slice.map(w => withTimeout(getBanditCount(w), TIMEOUT_MS).catch(() => 0))
      );
      res.forEach((r, k) => { if (r.status === 'fulfilled' && Number(r.value) > 0) banditHoldersAll.add(slice[k]); });
    }

    const fcfs_util_total = utilHoldersAll.size;
    let fcfs_util_on = 0; for (const w of utilHoldersAll) if (isInGuildWallet(w)) fcfs_util_on++;
    const fcfs_manual_total = manualFcfs.size;
    let fcfs_manual_on = 0; for (const w of manualFcfs) if (isInGuildWallet(w)) fcfs_manual_on++;
    const fcfs_dupe_total = fcfs_util_total + fcfs_manual_total;
    const fcfs_unique_wallets = new Set([...utilHoldersAll, ...manualFcfs]);
    let fcfs_unique_on = 0; for (const w of fcfs_unique_wallets) if (isInGuildWallet(w)) fcfs_unique_on++;

    const gtd_gen_total = genHoldersAll.size;
    let gtd_gen_on = 0; for (const w of genHoldersAll) if (isInGuildWallet(w)) gtd_gen_on++;
    const gtd_band_total = banditHoldersAll.size;
    let gtd_band_on = 0; for (const w of banditHoldersAll) if (isInGuildWallet(w)) gtd_band_on++;
    const gtd_manual_total = manualGtd.size;
    let gtd_manual_on = 0; for (const w of manualGtd) if (isInGuildWallet(w)) gtd_manual_on++;
    const gtd_dupe_total = gtd_gen_total + gtd_band_total + gtd_manual_total;
    const gtd_unique_wallets = new Set([...genHoldersAll, ...banditHoldersAll, ...manualGtd]);
    let gtd_unique_on = 0; for (const w of gtd_unique_wallets) if (isInGuildWallet(w)) gtd_unique_on++;

    const FCFS_ROLE_ID = process.env.ROLE_MAINNET_FCFS_WL_ID;
    const GTD_ROLE_ID  = process.env.ROLE_MAINNET_GTD_WL_ID;

    let fcfsAdded = 0, fcfsRemoved = 0, gtdAdded = 0, gtdRemoved = 0;

    const toMember = async (wallet) => {
      const uid = walletToUser.get(wallet);
      if (!uid) return null;
      try { return await guild.members.fetch(uid); } catch { return null; }
    };

    if (FCFS_ROLE_ID) {
      const B = 25;
      const wallets = [...fcfs_unique_wallets].filter(isInGuildWallet);
      for (let i = 0; i < wallets.length; i += B) {
        const slice = wallets.slice(i, i + B);
        const members = await Promise.all(slice.map(toMember));
        await Promise.allSettled(members.map(async (m) => {
          if (!m) return;
          const hasRole = m.roles.cache.has(FCFS_ROLE_ID);
          if (!hasRole) { await m.roles.add(FCFS_ROLE_ID, 'FCFS WL (utility/manual)'); fcfsAdded++; }
        }));
      }

      const holdersSet = new Set(wallets);
      const toRemove = allMembers
        .filter(m => m.roles.cache.has(FCFS_ROLE_ID))
        .filter(m => !holdersSet.has((userToWallet.get(m.id) || '').toLowerCase()));
      await Promise.allSettled(toRemove.map(async m => { await m.roles.remove(FCFS_ROLE_ID, 'No longer FCFS WL'); fcfsRemoved++; }));
    }

    if (GTD_ROLE_ID) {
      const B = 25;
      const wallets = [...gtd_unique_wallets].filter(isInGuildWallet);
      for (let i = 0; i < wallets.length; i += B) {
        const slice = wallets.slice(i, i + B);
        const members = await Promise.all(slice.map(toMember));
        await Promise.allSettled(members.map(async (m) => {
          if (!m) return;
          const hasRole = m.roles.cache.has(GTD_ROLE_ID);
          if (!hasRole) { await m.roles.add(GTD_ROLE_ID, 'GTD WL (genesis/bandit/manual)'); gtdAdded++; }
        }));
      }

      const holdersSet = new Set(wallets);
      const toRemove = allMembers
        .filter(m => m.roles.cache.has(GTD_ROLE_ID))
        .filter(m => !holdersSet.has((userToWallet.get(m.id) || '').toLowerCase()));
      await Promise.allSettled(toRemove.map(async m => { await m.roles.remove(GTD_ROLE_ID, 'No longer GTD WL'); gtdRemoved++; }));
    }

    const lines = [
      '**FCFS**',
      `• Hold Utility Pass : ${fcfs_util_total} | ${fcfs_util_on}`,
      `• Dans liste FCFS   : ${fcfs_manual_total} | ${fcfs_manual_on}`,
      `• Total             : ${fcfs_dupe_total} | ${fcfs_unique_on}`,
      `• Rôles ↗/↘         : +${fcfsAdded} / -${fcfsRemoved}`,
      '',
      '**GTD**',
      `• Hold Genesis      : ${gtd_gen_total} | ${gtd_gen_on}`,
      `• Hold Bandit       : ${gtd_band_total} | ${gtd_band_on}`,
      `• Dans liste GTD    : ${gtd_manual_total} | ${gtd_manual_on}`,
      `• Total             : ${gtd_dupe_total} | ${gtd_unique_on}`,
      `• Rôles ↗/↘         : +${gtdAdded} / -${gtdRemoved}`,
    ];

    return interaction.editReply(lines.join('\n'));
  }

  return interaction.editReply('❌ Subcommand inconnue.');
}
