// src/cron/whitelistNftSync.js
/**
 * Cron • Refresh NFT-based whitelists every 6 h
 */
import cron from 'node-cron';
import { checkAllPartners as partnerSvc } from '../services/partnerService.js';
import partnerCfg from '../config/partnerCollections.js';
import UserLink from '../services/models/UserLink.js';
import Whitelist from '../services/models/Whitelist.js';

const CRON_EXPR = process.env.NFT_WL_CRON || '0 */6 * * *'; // every 6 h

cron.schedule(CRON_EXPR, async () => {
  console.log('🕓  NFT-whitelist cron started');

  const totals  = {};   // { collectionName: sum }
  const holders = [];   // [ `${wallet} — id → count × name`, … ]

  // 1️⃣ Fetch all linked users
  const links = await UserLink.find({});
  for (const { discordId, wallet } of links) {
    // 2️⃣ Compute new eligible count
    const counts   = await partnerSvc.checkAllPartners(wallet);
    const newCount = Object.values(counts).reduce((a, b) => a + b, 0);

    // 3️⃣ Load old value
    const doc      = await Whitelist.findOne({ discordId });
    const oldCount = doc?.whitelistsNFTs || 0;
    const delta    = newCount - oldCount;

    // 4️⃣ Only update & log if changed
    if (delta !== 0) {
      await Whitelist.findOneAndUpdate(
        { discordId },
        { whitelistsNFTs: newCount },
        { upsert: true }
      );
      console.log(`🔄  Updated WL (NFT) for ${discordId}: Δ ${delta}`);
    }

    // 5️⃣ Accumulate totals & breakdown lines
    for (const [name, cnt] of Object.entries(counts)) {
      if (cnt > 0) {
        const slotInfo = partnerCfg.find(p => p.name === name)?.slots ?? '?';
        totals[name] = (totals[name] || 0) + cnt;
        holders.push(`• ${wallet} — ${discordId} → ${cnt} × ${name}`);
      }
    }
  }

  // 6️⃣ Final recap
  console.log('✅ NFT-whitelist cron complete');
  console.log('── Recap (partner NFTs) ──');
  for (const [name, sum] of Object.entries(totals)) {
    const slotInfo = partnerCfg.find(p => p.name === name)?.slots ?? '?';
    console.log(`› ${name}: ${sum} whitelist slot(s) out of ${slotInfo}`);
  }

  if (holders.length) {
    console.log('── Holder breakdown ──');
    holders.forEach(line => console.log(line));
  }
});
