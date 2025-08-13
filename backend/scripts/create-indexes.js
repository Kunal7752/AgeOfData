const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('📊 Creating/verifying indexes...\n');
    
    // Helper function to safely create indexes
    async function createIndexSafe(collection, index, name) {
      try {
        await db.collection(collection).createIndex(index, { name, background: true });
        console.log(`✅ Created index: ${name} on ${collection}`);
      } catch (error) {
        if (error.code === 85 || error.code === 86) {
          console.log(`✓ Index already exists: ${name} on ${collection}`);
        } else {
          console.error(`❌ Failed to create ${name}: ${error.message}`);
        }
      }
    }
    
    // PLAYER INDEXES
    console.log('📁 Player Collection Indexes:');
    await createIndexSafe('players', { civ: 1, old_rating: 1 }, 'civ_rating_idx');
    await createIndexSafe('players', { game_id: 1 }, 'game_id_idx');
    await createIndexSafe('players', { winner: 1 }, 'winner_idx');
    await createIndexSafe('players', { profile_id: 1 }, 'profile_idx');
    await createIndexSafe('players', { civ: 1, winner: 1 }, 'civ_winner_idx');
    
    // MATCH INDEXES
    console.log('\n📁 Match Collection Indexes:');
    await createIndexSafe('matches', { game_id: 1 }, 'game_id_idx');
    await createIndexSafe('matches', { leaderboard: 1, started_timestamp: -1 }, 'leaderboard_time_idx');
    await createIndexSafe('matches', { started_timestamp: -1 }, 'timestamp_idx');
    await createIndexSafe('matches', { avg_elo: 1 }, 'avg_elo_idx');
    await createIndexSafe('matches', { patch: 1 }, 'patch_idx');
    await createIndexSafe('matches', { map: 1 }, 'map_idx');
    
    // COMPOUND INDEXES for complex queries
    console.log('\n📁 Compound Indexes:');
    await createIndexSafe('matches', 
      { leaderboard: 1, patch: 1, started_timestamp: -1 }, 
      'compound_filter_idx'
    );
    await createIndexSafe('players', 
      { civ: 1, old_rating: 1, winner: 1 }, 
      'compound_civ_idx'
    );
    
    // List all indexes
    console.log('\n📋 Verifying all indexes...\n');
    
    const playerIndexes = await db.collection('players').indexes();
    const matchIndexes = await db.collection('matches').indexes();
    
    console.log('Player indexes:', playerIndexes.length);
    playerIndexes.forEach(idx => {
      if (idx.name !== '_id_') {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      }
    });
    
    console.log('\nMatch indexes:', matchIndexes.length);
    matchIndexes.forEach(idx => {
      if (idx.name !== '_id_') {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      }
    });
    
    // Check database stats
    const stats = await db.stats();
    console.log('\n📊 Database Stats:');
    console.log(`  - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  - Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  - Total Size: ${((stats.dataSize + stats.indexSize) / 1024 / 1024).toFixed(1)} MB of 5000 MB`);
    
    console.log('\n✅ Index optimization complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

createIndexes();