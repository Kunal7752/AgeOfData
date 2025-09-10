// scripts/precompute-fast-stats.js
// CORRECTED VERSION - No leaderboard processing to avoid timeouts

const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
require('dotenv').config();

async function precomputeFastStats() {
  try {
    console.log('🚀 Starting BASIC stats precomputation (no timeouts)...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Check current data size
    const stats = await db.stats();
    console.log(`💾 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB\n`);
    
    // STEP 1: Create basic civilization stats cache (ONLY)
    console.log('📊 Creating basic civilization stats cache...');
    
    try {
      await db.collection('civ_stats_cache').drop();
      console.log('🗑️  Dropped old cache');
    } catch (e) {
      console.log('📝 No existing cache to drop');
    }
    
    // Simple and fast aggregation - NO LOOKUPS
    const basicPipeline = [
      {
        $match: {
          civ: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$civ',
          totalPicks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' },
          avgFeudalTime: { $avg: '$feudal_age_uptime' },
          avgCastleTime: { $avg: '$castle_age_uptime' },
          avgImperialTime: { $avg: '$imperial_age_uptime' }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalPicks'] },
          losses: { $subtract: ['$totalPicks', '$wins'] }
        }
      },
      {
        $match: {
          totalPicks: { $gte: 10 } // Filter low-pick civilizations
        }
      },
      {
        $sort: { winRate: -1 }
      },
      {
        $out: 'civ_stats_cache'
      }
    ];
    
    console.log('⏳ Running basic stats aggregation (no lookups)...');
    await Player.aggregate(basicPipeline, { 
      allowDiskUse: true,
      maxTimeMS: 120000 // 2 minute timeout
    });
    
    // Create indexes on cache
    console.log('🔧 Creating cache indexes...');
    await db.collection('civ_stats_cache').createIndex({ winRate: -1 });
    await db.collection('civ_stats_cache').createIndex({ totalPicks: -1 });
    await db.collection('civ_stats_cache').createIndex({ '_id': 1 });
    
    const cacheCount = await db.collection('civ_stats_cache').countDocuments();
    console.log(`✅ Created basic cache with ${cacheCount} civilizations\n`);
    
    // STEP 2: Create essential indexes for fast queries
    console.log('🔧 Creating performance indexes...');
    
    const indexes = [
      // Player indexes
      { collection: 'players', index: { civ: 1, old_rating: 1 }, name: 'civ_rating_idx' },
      { collection: 'players', index: { game_id: 1, civ: 1 }, name: 'game_civ_idx' },
      { collection: 'players', index: { civ: 1, winner: 1 }, name: 'civ_winner_idx' },
      
      // Match indexes
      { collection: 'matches', index: { leaderboard: 1, game_id: 1 }, name: 'lb_game_idx' },
      { collection: 'matches', index: { patch: 1, leaderboard: 1 }, name: 'patch_lb_idx' },
      { collection: 'matches', index: { started_timestamp: -1 }, name: 'timestamp_desc_idx' }
    ];
    
    for (const idx of indexes) {
      try {
        await db.collection(idx.collection).createIndex(idx.index, { 
          name: idx.name, 
          background: true 
        });
        console.log(`   ✅ ${idx.collection}.${idx.name}`);
      } catch (e) {
        console.log(`   ⚠️  ${idx.collection}.${idx.name} already exists`);
      }
    }
    
    // STEP 3: Test performance
    console.log('\n🧪 Testing query performance...');
    
    const testQueries = [
      {
        name: 'Basic cache query',
        query: () => db.collection('civ_stats_cache').find({}).sort({ winRate: -1 }).limit(10).toArray()
      },
      {
        name: 'Player by civilization',
        query: () => Player.findOne({ civ: { $exists: true } })
      },
      {
        name: 'Match with leaderboard',
        query: () => Match.findOne({ leaderboard: { $exists: true } })
      }
    ];
    
    for (const test of testQueries) {
      try {
        const start = Date.now();
        const result = await test.query();
        const time = Date.now() - start;
        console.log(`   ✅ ${test.name}: ${time}ms`);
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
      }
    }
    
    // STEP 4: Show sample data
    console.log('\n📊 Sample cached civilizations:');
    try {
      const sampleCivs = await db.collection('civ_stats_cache')
        .find({})
        .sort({ winRate: -1 })
        .limit(10)
        .toArray();
      
      if (sampleCivs.length > 0) {
        sampleCivs.forEach((civ, i) => {
          console.log(`   ${i+1}. ${civ._id}: ${(civ.winRate * 100).toFixed(1)}% win rate (${civ.totalPicks.toLocaleString()} games)`);
        });
      } else {
        console.log('   ⚠️  No cached data found');
      }
    } catch (error) {
      console.log(`   ❌ Error reading cache: ${error.message}`);
    }
    
    // STEP 5: Check leaderboard values in your data
    console.log('\n🔍 Checking actual leaderboard values in your data...');
    try {
      const leaderboards = await Match.aggregate([
        { $group: { _id: '$leaderboard', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      if (leaderboards.length > 0) {
        console.log('   📊 Found leaderboards:');
        leaderboards.forEach(lb => {
          console.log(`      "${lb._id}": ${lb.count.toLocaleString()} matches`);
        });
      } else {
        console.log('   ⚠️  No leaderboard data found');
      }
    } catch (error) {
      console.log(`   ❌ Error checking leaderboards: ${error.message}`);
    }
    
    // STEP 6: Final summary
    const finalStats = await db.stats();
    console.log(`\n📊 Final database size: ${(finalStats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    
    const cacheSize = await db.collection('civ_stats_cache').estimatedDocumentCount();
    console.log(`📦 Main cache size: ${cacheSize} civilizations`);
    
    console.log('\n🎉 BASIC stats precomputation complete!');
    console.log('🚀 Your /civilizations endpoint should now be much faster for basic queries');
    console.log('\n💡 Next steps:');
    console.log('1. Restart your API server');
    console.log('2. Test: GET /api/stats/civilizations (should be ~50-100ms)');
    console.log('3. For leaderboard filtering, run: node scripts/simple-leaderboard-cache.js');
    console.log('4. Set up a daily cron job for this script');
    
  } catch (error) {
    console.error('❌ Precomputation failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the precomputation
precomputeFastStats();