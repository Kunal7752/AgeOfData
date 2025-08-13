// scripts/update-rankings.js - Standalone script for ranking computation
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
require('dotenv').config();

// ─── Main ranking computation function ─────────────────────────────
async function precomputeAllRankings() {
  try {
    console.log('🔄 Starting background rank precomputation...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all civs and recent patches
    const [civs, patches] = await Promise.all([
      Player.distinct('civ'),
      Match.aggregate([
        { $group: { _id: '$patch', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 5 },
        { $project: { _id: 1 } }
      ])
    ]);
    
    const patchList = patches.map(p => p._id);
    console.log(`📊 Computing for ${civs.length} civs across ${patchList.length} patches`);
    console.log(`🎯 Patches: ${patchList.join(', ')}`);
    
    // Clear existing rankings
    const db = mongoose.connection.db;
    await db.collection('civ_rankings').deleteMany({});
    console.log('🗑️  Cleared old rankings');
    
    // Process each patch
    for (let i = 0; i < patchList.length; i++) {
      const patch = patchList[i];
      console.log(`\n📈 Processing patch ${patch} (${i + 1}/${patchList.length})...`);
      
      try {
        const startTime = Date.now();
        
        // Get civ performance for this patch
        const civPerformance = await Player.aggregate([
          {
            $lookup: {
              from: 'matches',
              localField: 'game_id',
              foreignField: 'game_id',
              as: 'match',
              pipeline: [
                { $match: { patch: patch } },
                { $project: { patch: 1, duration: 1 } }
              ]
            }
          },
          { $unwind: '$match' },
          {
            $group: {
              _id: '$civ',
              games: { $sum: 1 },
              wins: { $sum: { $cond: ['$winner', 1, 0] } },
              avgRating: { $avg: '$old_rating' }
            }
          },
          {
            $match: { games: { $gte: 10 } } // Minimum games threshold
          },
          {
            $addFields: {
              winRate: { $divide: ['$wins', '$games'] }
            }
          },
          { $sort: { winRate: -1 } }
        ]).option({ maxTimeMS: 30000 });
        
        // Create ranking documents
        const rankingDocs = civPerformance.map((civ, index) => ({
          patch: patch,
          civ: civ._id,
          rank: index + 1,
          winRate: Math.round(civ.winRate * 10000) / 100, // Percentage with 2 decimals
          games: civ.games,
          wins: civ.wins,
          losses: civ.games - civ.wins,
          avgRating: Math.round(civ.avgRating || 0),
          lastUpdated: new Date(),
          totalCivs: civPerformance.length
        }));
        
        // Insert rankings for this patch
        if (rankingDocs.length > 0) {
          await db.collection('civ_rankings').insertMany(rankingDocs);
          
          const duration = Date.now() - startTime;
          console.log(`   ✅ Ranked ${rankingDocs.length} civs in ${duration}ms`);
          
          // Show top 5
          const top5 = rankingDocs.slice(0, 5);
          console.log(`   🏆 Top 5: ${top5.map(c => `${c.civ}(${c.winRate}%)`).join(', ')}`);
        } else {
          console.log(`   ⚠️  No data found for patch ${patch}`);
        }
        
      } catch (patchError) {
        console.error(`   ❌ Failed patch ${patch}:`, patchError.message);
      }
    }
    
    // Create index for fast queries
    try {
      await db.collection('civ_rankings').createIndex(
        { civ: 1, patch: 1 },
        { background: true }
      );
      await db.collection('civ_rankings').createIndex(
        { patch: 1, rank: 1 },
        { background: true }
      );
      console.log('\n📋 Created ranking indexes');
    } catch (indexError) {
      console.log('⚠️  Index creation failed:', indexError.message);
    }
    
    // Final stats
    const totalRankings = await db.collection('civ_rankings').countDocuments();
    console.log(`\n🎉 Precomputation complete!`);
    console.log(`📊 Total rankings created: ${totalRankings}`);
    console.log(`⏱️  Rankings are now cached and ready for instant queries`);
    
    return totalRankings;
    
  } catch (error) {
    console.error('❌ Precomputation failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// ─── Update function for live server ─────────────────────────────
async function updateRecentRankings() {
  try {
    console.log('🔄 Updating recent rankings...');
    
    // Get only the most recent patch
    const [latestPatch] = await Match.aggregate([
      { $group: { _id: '$patch', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 1 }
    ]);
    
    if (!latestPatch) {
      console.log('⚠️  No patches found');
      return;
    }
    
    const patch = latestPatch._id;
    console.log(`📈 Updating rankings for latest patch: ${patch}`);
    
    // Remove old rankings for this patch
    const db = mongoose.connection.db;
    await db.collection('civ_rankings').deleteMany({ patch });
    
    // Compute new rankings (same logic as above but for one patch)
    const civPerformance = await Player.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match',
          pipeline: [
            { $match: { patch } },
            { $project: { patch: 1 } }
          ]
        }
      },
      { $unwind: '$match' },
      {
        $group: {
          _id: '$civ',
          games: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' }
        }
      },
      { $match: { games: { $gte: 10 } } },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$games'] }
        }
      },
      { $sort: { winRate: -1 } }
    ]).option({ maxTimeMS: 30000 });
    
    const rankingDocs = civPerformance.map((civ, index) => ({
      patch,
      civ: civ._id,
      rank: index + 1,
      winRate: Math.round(civ.winRate * 10000) / 100,
      games: civ.games,
      wins: civ.wins,
      losses: civ.games - civ.wins,
      avgRating: Math.round(civ.avgRating || 0),
      lastUpdated: new Date(),
      totalCivs: civPerformance.length
    }));
    
    if (rankingDocs.length > 0) {
      await db.collection('civ_rankings').insertMany(rankingDocs);
      console.log(`✅ Updated ${rankingDocs.length} rankings for patch ${patch}`);
    }
    
  } catch (error) {
    console.error('❌ Recent rankings update failed:', error);
  }
}

// ─── Command line interface ─────────────────────────────────────
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'full':
      await precomputeAllRankings();
      break;
      
    case 'update':
      await mongoose.connect(process.env.MONGODB_URI);
      await updateRecentRankings();
      await mongoose.connection.close();
      break;
      
    case 'status':
      await mongoose.connect(process.env.MONGODB_URI);
      const count = await mongoose.connection.db.collection('civ_rankings').countDocuments();
      const latestUpdate = await mongoose.connection.db.collection('civ_rankings')
        .findOne({}, { sort: { lastUpdated: -1 } });
      console.log(`📊 Current rankings: ${count}`);
      console.log(`⏰ Last updated: ${latestUpdate?.lastUpdated || 'Never'}`);
      await mongoose.connection.close();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/update-rankings.js full    # Full recomputation');
      console.log('  node scripts/update-rankings.js update  # Update latest patch only');
      console.log('  node scripts/update-rankings.js status  # Check current status');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  precomputeAllRankings,
  updateRecentRankings
};