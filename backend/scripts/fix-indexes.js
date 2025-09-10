// backend/scripts/fix-indexes.js
// Batched civLower backfill with retries + index creation

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const BATCH_SIZE = 1000;
const MAX_RETRIES = 5;

async function backfillCivLower(players) {
  console.log("Starting civLower backfill in batches...");

  // Only docs that need it
  const query = {
    civ: { $type: "string" },
    $or: [{ civLower: { $exists: false } }, { civLower: null }]
  };

  // Stream the docs — projection keeps payload small
  const cursor = players.find(query, { projection: { _id: 1, civ: 1 } }).batchSize(BATCH_SIZE);

  let batch = [];
  let processed = 0;
  for await (const doc of cursor) {
    const civLower = (doc.civ || "").toString().toLowerCase();

    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { civLower } }
      }
    });

    if (batch.length >= BATCH_SIZE) {
      await runBulk(players, batch);
      processed += batch.length;
      console.log(`  ✓ Updated ${processed} docs so far...`);
      batch = [];
    }
  }

  if (batch.length) {
    await runBulk(players, batch);
    processed += batch.length;
  }

  console.log(`Backfill complete. Total updated docs: ${processed}`);
}

async function runBulk(players, ops) {
  let attempt = 0;
  while (true) {
    try {
      await players.bulkWrite(ops, {
        ordered: false,
        // lighter writeConcern avoids stalls during elections
        writeConcern: { w: 1 }
      });
      return;
    } catch (err) {
      // Retry on replica state change (code 11602) or transient network
      const msg = String(err && err.message || "");
      const code = err && (err.code || (err.result && err.result.code));
      const isRetryable = code === 11602 || msg.includes("InterruptedDueToReplStateChange") || msg.includes("connection") || msg.includes("network");

      if (isRetryable && attempt < MAX_RETRIES) {
        attempt++;
        const delay = 300 * attempt; // simple backoff
        console.warn(`Bulk write interrupted (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

async function createIndexes(players) {
  console.log("Creating indexes...");
  await Promise.all([
    players.createIndex({ civLower: 1, game_id: 1 }),
    players.createIndex({ game_id: 1, civLower: 1 }),
    players.createIndex({ game_id: 1 })
  ]);
  const idx = await players.indexes();
  console.log("Current indexes:", idx);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set in .env");

  console.log("Connecting to:", uri.replace(/\/\/.*@/, "//<redacted>@"));
  await mongoose.connect(uri, { autoIndex: false });
  console.log("✅ Connected to MongoDB");

  // Use the raw collection (default name from model 'Player' is 'players')
  const players = mongoose.connection.db.collection("players");

  // 1) Backfill missing civLower in batches with retries
  await backfillCivLower(players);

  // 2) Create the indexes used by your matchup pipelines
  await createIndexes(players);

  await mongoose.disconnect();
  console.log("✅ Done.");
}

main().catch(async (err) => {
  console.error("❌ Script failed:", err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
