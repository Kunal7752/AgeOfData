const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
require('dotenv').config();

async function precomputeStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Drop old collection if exists
    try {
      await db.collection('civ_stats_cache').drop();
    } catch (e) {
      // Collection doesn't exist, that's fine
    }
    
    console.log('Pre-computing civilization stats...');
    
    // Simple aggregation without lookups
    const pipeline = [
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
        $sort: { winRate: -1 }
      },
      {
        $out: 'civ_stats_cache'  // Save to a new collection
      }
    ];
    
    await Player.aggregate(pipeline).allowDiskUse(true);
    
    console.log('✅ Stats pre-computed and cached');
    
    // Create index on the cache
    await db.collection('civ_stats_cache').createIndex({ winRate: -1 });
    await db.collection('civ_stats_cache').createIndex({ totalPicks: -1 });
    
    // Check results
    const count = await db.collection('civ_stats_cache').countDocuments();
    console.log(`📊 Cached stats for ${count} civilizations`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

precomputeStats();