// scripts/precompute-filter-views.js - Create pre-computed views for each filter
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
require('dotenv').config();

async function precomputeFilterViews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Find actual leaderboard values in your database
    console.log('🔍 Finding actual leaderboard values...');
    const leaderboards = await Match.distinct('leaderboard');
    console.log('Found leaderboards:', leaderboards);
    
    // 2. Pre-compute stats for each leaderboard
    for (const leaderboard of leaderboards.slice(0, 5)) { // Limit to 5 most common
      if (!leaderboard) continue;
      
      console.log(`\n📊 Pre-computing stats for leaderboard: ${leaderboard}`);
      
      try {
        // Drop existing collection
        await db.collection(`civ_stats_${leaderboard}`).drop().catch(() => {});
        
        // Create filtered stats for this leaderboard
        const pipeline = [
          // Step 1: Get all players
          {
            $match: {
              civ: { $exists: true, $ne: null, $ne: '' }
            }
          },
          
          // Step 2: Join with matches to filter by leaderboard
          {
            $lookup: {
              from: 'matches',
              localField: 'game_id',
              foreignField: 'game_id',
              as: 'match',
              pipeline: [
                { $match: { leaderboard: leaderboard } },
                { $project: { _id: 1 } }
              ]
            }
          },
          
          // Step 3: Only keep players who played in this leaderboard
          { $match: { 'match.0': { $exists: true } } },
          
          // Step 4: Aggregate by civilization
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
          
          // Step 5: Add calculated fields
          {
            $addFields: {
              winRate: { $divide: ['$wins', '$totalPicks'] },
              losses: { $subtract: ['$totalPicks', '$wins'] },
              leaderboard: leaderboard
            }
          },
          
          // Step 6: Filter minimum games
          { $match: { totalPicks: { $gte: 10 } } },
          
          // Step 7: Sort by win rate
          { $sort: { winRate: -1 } },
          
          // Step 8: Save to collection
          { $out: `civ_stats_${leaderboard}` }
        ];
        
        await Player.aggregate(pipeline)
          .allowDiskUse(true)
          .option({ maxTimeMS: 120000 }); // 2 minute timeout
        
        // Check results
        const count = await db.collection(`civ_stats_${leaderboard}`).countDocuments();
        console.log(`✅ Created civ_stats_${leaderboard} with ${count} civilizations`);
        
        // Create index
        await db.collection(`civ_stats_${leaderboard}`).createIndex({ winRate: -1 });
        
      } catch (error) {
        console.error(`❌ Failed to create stats for ${leaderboard}:`, error.message);
      }
    }
    
    console.log('\n🎉 Pre-computation completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

precomputeFilterViews();