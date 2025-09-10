// scripts/precompute-stats.js - REQUIRED for the working endpoint
const mongoose = require('mongoose');
const Player = require('../models/Player');
require('dotenv').config();

async function precomputeStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Drop old collection if exists
    try {
      await db.collection('civ_stats_cache').drop();
      console.log('Dropped old cache collection');
    } catch (e) {
      console.log('No existing cache collection to drop');
    }
    
    console.log('Pre-computing civilization stats...');
    
    // Use the EXACT SAME pipeline as your working code
    const pipeline = [
      {
        $match: {
          civ: { $exists: true, $ne: null, $ne: '' }
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
        $out: 'civ_stats_cache'  // Save to cache collection
      }
    ];
    
    console.log('Running aggregation pipeline...');
    await Player.aggregate(pipeline).allowDiskUse(true);
    
    console.log('Stats pre-computed and cached');
    
    // Create indexes on the cache
    await db.collection('civ_stats_cache').createIndex({ winRate: -1 });
    await db.collection('civ_stats_cache').createIndex({ totalPicks: -1 });
    console.log('Created indexes on cache collection');
    
    // Check results
    const count = await db.collection('civ_stats_cache').countDocuments();
    console.log(`Cached stats for ${count} civilizations`);
    
    // Show sample data
    const sampleCivs = await db.collection('civ_stats_cache')
      .find({})
      .sort({ winRate: -1 })
      .limit(5)
      .toArray();
    
    console.log('Top 5 civilizations by win rate:');
    sampleCivs.forEach((civ, index) => {
      console.log(`${index + 1}. ${civ._id}: ${(civ.winRate * 100).toFixed(1)}% (${civ.totalPicks} games)`);
    });
    
    console.log('Cache creation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

precomputeStats();