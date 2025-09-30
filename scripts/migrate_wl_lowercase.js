// scripts/migrate_wl_lowercase.mjs
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const isAddr = (s) => typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/.test(s);

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || undefined });
  const col = mongoose.connection.collection('wladdresses'); // nom = modèle WLAddress

  console.log('1) Lecture des documents…');
  const docs = await col.find({}, { projection: { address: 1, fcfs: 1, gtd: 1, logs: 1 } }).toArray();

  // Regroupement par adresse minuscule
  const groups = new Map();
  for (const d of docs) {
    const raw = d.address ?? '';
    const lc = isAddr(raw) ? raw.toLowerCase() : String(raw).toLowerCase();
    if (!groups.has(lc)) groups.set(lc, []);
    groups.get(lc).push(d);
  }

  console.log(`2) Groupes trouvés: ${groups.size}. Fusion des doublons si nécessaire…`);
  const updates = [];
  const deletes = [];
  let mergedCount = 0;

  for (const [lc, arr] of groups.entries()) {
    // Garde un doc, supprime les autres. Fusionne flags/logs.
    const keep = arr[0];
    const rest = arr.slice(1);
    if (rest.length) mergedCount += rest.length;

    const fcfs = arr.some(x => !!x.fcfs);
    const gtd  = arr.some(x => !!x.gtd);
    const logs = arr.flatMap(x => Array.isArray(x.logs) ? x.logs : []);

    updates.push({
      updateOne: {
        filter: { _id: keep._id },
        update: {
          $set: { address: lc, fcfs, gtd, logs },
        }
      }
    });

    for (const d of rest) {
      deletes.push({ deleteOne: { filter: { _id: d._id } } });
    }
  }

  console.log(`3) Écriture: ${updates.length} updates, ${deletes.length} deletes…`);
  // Exécuter en batchs pour éviter un payload trop gros
  const bulk = async (ops) => {
    const CHUNK = 500;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const slice = ops.slice(i, i + CHUNK);
      if (slice.length) await col.bulkWrite(slice, { ordered: false });
    }
  };

  await bulk(updates);
  if (deletes.length) await bulk(deletes);

  console.log('4) Index unique sur address…');
  // Supprime l’index existant si besoin puis recrée proprement
  try { await col.dropIndex('address_1'); } catch {}
  await col.createIndex({ address: 1 }, { unique: true });

  console.log(`Terminé. Doublons fusionnés: ${mergedCount}. Total restants: ${groups.size}.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
