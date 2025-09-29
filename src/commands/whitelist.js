// src/commands/whitelist.js
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Contract, isAddress } from 'ethers';
import WLAddress from '../services/models/WLAddress.js';
import UserLink from '../services/models/UserLink.js';
import { getGenesisCount } from '../services/genesisService.js';
import { getUtilityPassCount } from '../services/utilityService.js';
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
  // variants frequently used
  'function _currentIndex() view returns (uint256)',
];

const GENESIS_ADDR = (process.env.NFT_GENESIS_CONTRACT || '').toLowerCase();
const UTILITY_ADDR = (process.env.NFT_UTILITY_PASS_CONTRACT || '').toLowerCase();

// supply depuis l'env (facultatif)
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
    // essaye plusieurs noms possibles
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
    return 0; // 0-based enumerable
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

// Comptage type “nextTokenId” (1-based, next unminted) → owners 1..nextId-1
async function holdersByNextId(addr) {
  const nextId = await tryNextTokenId(addr);
  if (!nextId || nextId <= 1) return new Set();
  const minted = nextId - 1;
  return enumerateOwnersRange(addr, 1, minted);
}

// Comptage via totalSupply + détection 0-based/1-based
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

  // fallback: sondage des wallets liés
  const out = new Set();
  const BATCH = 60, TIMEOUT_MS = 4000;
  for (let i = 0; i < linkedWallets.length; i += BATCH) {
    const slice = linkedWallets.slice(i, i + BATCH);
    const res = await Promise.allSettled(
      slice.map(w => withTimeout(getGenesisCount(w), TIMEOUT_MS).catch(() => 0))
    );
    res.forEach((r, k) => {
      if (r.status === 'fulfilled' && Number(r.value) > 0) out.add(slice[k]);
    });
  }
  return out;
}

// Utility: nextTokenId → totalSupply → fallback “wallets liés” balanceOf
async function holdersUtility(linkedWallets) {
  if (!isAddress(UTILITY_ADDR)) return new Set();
  let set = await holdersByNextId(UTILITY_ADDR);
  if (set.size === 0) set = await holdersByTotalSupply(UTILITY_ADDR);
  if (set.size > 0) return set;

  // fallback: sondage des wallets liés
  const out = new Set();
  const BATCH = 60, TIMEOUT_MS = 4000;
  for (let i = 0; i < linkedWallets.length; i += BATCH) {
    const slice = linkedWallets.slice(i, i + BATCH);
    const res = await Promise.allSettled(
      slice.map(w => withTimeout(getUtilityPassCount(w), TIMEOUT_MS).catch(() => 0))
    );
    res.forEach((r, k) => {
      if (r.status === 'fulfilled' && Number(r.value) > 0) out.add(slice[k]);
    });
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
    .setDescription('Show FCFS/GTD totals: per-source totals and present-on-server uniques')
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
        { $set: set, $push: { logs: { type: kind, staffId: interaction.user.id } } },
        { upsert: true }
      );
      ok++;
    })).then(res => { fail = res.filter(r => r.status === 'rejected').length; });

    return interaction.editReply(`✅ ${ok} mise(s) à jour. ${fail ? `❌ ${fail} échec(s).` : ''}`);
  }

  if (sub === 'total') {
    const guild = interaction.guild;

    // Listes manuelles
    const [manualFcfsDocs, manualGtdDocs] = await Promise.all([
      WLAddress.find({ fcfs: true }, 'address').lean(),
      WLAddress.find({ gtd: true }, 'address').lean(),
    ]);
    const manualFcfs = new Set(manualFcfsDocs.map(d => (d.address || '').toLowerCase()));
    const manualGtd  = new Set(manualGtdDocs.map(d => (d.address || '').toLowerCase()));

    // Wallets liés et présence serveur
    const links = await UserLink.find({}, 'wallet discordId').lean();
    const walletToUser = new Map();
    for (const l of links) {
      const w = (l.wallet || '').toLowerCase();
      if (isAddress(w)) walletToUser.set(w, l.discordId);
    }
    const linkedWallets = [...walletToUser.keys()];

    const allMembers = await guild.members.fetch({ withPresences: false });
    const inGuildUsers = new Set(allMembers.map(m => m.id));
    const isInGuildWallet = (w) => {
      const uid = walletToUser.get(w);
      return uid ? inGuildUsers.has(uid) : false;
    };

    // Holders globaux (ou fallback liés)
    const [utilHoldersAll, genHoldersAll] = await Promise.all([
      holdersUtility(linkedWallets),
      holdersGenesis(linkedWallets),
    ]);
    const banditHoldersAll = new Set(); // Bandit absent → 0

    // FCFS
    const fcfs_util_total = utilHoldersAll.size;
    let fcfs_util_on = 0; for (const w of utilHoldersAll) if (isInGuildWallet(w)) fcfs_util_on++;
    const fcfs_manual_total = manualFcfs.size;
    let fcfs_manual_on = 0; for (const w of manualFcfs) if (isInGuildWallet(w)) fcfs_manual_on++;
    const fcfs_dupe_total = fcfs_util_total + fcfs_manual_total;
    const fcfs_unique_on = (() => {
      const uni = new Set([...utilHoldersAll, ...manualFcfs]);
      let on = 0; for (const w of uni) if (isInGuildWallet(w)) on++; return on;
    })();

    // GTD
    const gtd_gen_total = genHoldersAll.size;
    let gtd_gen_on = 0; for (const w of genHoldersAll) if (isInGuildWallet(w)) gtd_gen_on++;
    const gtd_band_total = banditHoldersAll.size;
    let gtd_band_on = 0;
    const gtd_manual_total = manualGtd.size;
    let gtd_manual_on = 0; for (const w of manualGtd) if (isInGuildWallet(w)) gtd_manual_on++;
    const gtd_dupe_total = gtd_gen_total + gtd_band_total + gtd_manual_total;
    const gtd_unique_on = (() => {
      const uni = new Set([...genHoldersAll, ...banditHoldersAll, ...manualGtd]);
      let on = 0; for (const w of uni) if (isInGuildWallet(w)) on++; return on;
    })();

    // Output
    const lines = [
      '**FCFS**',
      `• Hold Utility Pass : ${fcfs_util_total} | ${fcfs_util_on}`,
      `• Dans liste FCFS   : ${fcfs_manual_total} | ${fcfs_manual_on}`,
      `• Total             : ${fcfs_dupe_total} | ${fcfs_unique_on}`,
      '',
      '**GTD**',
      `• Hold Genesis      : ${gtd_gen_total} | ${gtd_gen_on}`,
      `• Hold Bandit       : ${gtd_band_total} | ${gtd_band_on}`,
      `• Dans liste GTD    : ${gtd_manual_total} | ${gtd_manual_on}`,
      `• Total             : ${gtd_dupe_total} | ${gtd_unique_on}`,
    ];

    return interaction.editReply(lines.join('\n'));
  }

  return interaction.editReply('❌ Subcommand inconnue.');
}
