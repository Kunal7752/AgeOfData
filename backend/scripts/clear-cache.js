require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Player = require('../models/Player');

const clearAllCaches = async () => {
  try {
    console.log('🧹 Starting cache clearing process...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Clear cached civilization stats
    console.log('🗑️  Clearing cached civilization statistics...');
    const civCacheResult = await db.collection('civ_stats_cache').deleteMany({});
    console.log(`   Deleted ${civCacheResult.deletedCount} cached civ stat records`);
    
    // 2. Clear cached rankings
    console.log('🗑️  Clearing cached rankings...');
    const rankingCacheResult = await db.collection('civ_rankings').deleteMany({});
    console.log(`   Deleted ${rankingCacheResult.deletedCount} cached ranking records`);
    
    // 3. Clear any other cached collections you might have
    const collections = await db.listCollections().toArray();
    const cacheCollections = collections.filter(col => 
      col.name.includes('cache') || 
      col.name.includes('stats_') ||
      col.name.includes('_temp')
    );
    
    for (const collection of cacheCollections) {
      if (!['civ_stats_cache', 'civ_rankings'].includes(collection.name)) {
        console.log(`🗑️  Clearing ${collection.name}...`);
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`   Deleted ${result.deletedCount} records`);
      }
    }
    
    // 4. Show current database stats
    console.log('\n📊 Current Database Statistics:');
    const [matchCount, playerCount, weekRanges] = await Promise.all([
      Match.countDocuments(),
      Player.countDocuments(),
      Match.distinct('week_range')
    ]);
    
    console.log(`   📋 Total Matches: ${matchCount.toLocaleString()}`);
    console.log(`   👥 Total Players: ${playerCount.toLocaleString()}`);
    console.log(`   📅 Week Ranges: ${weekRanges.length} weeks`);
    
    // Show recent weeks
    const recentWeeks = weekRanges.sort().slice(-5);
    console.log(`   📅 Most Recent Weeks: ${recentWeeks.join(', ')}`);
    
    // 5. Trigger immediate recalculation of basic stats
    console.log('\n🔄 Triggering immediate recalculation...');
    
    // Calculate basic civ stats to populate cache
    const civStats = await Player.aggregate([
      {
        $group: {
          _id: '$civ',
          totalPicks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalPicks'] }
        }
      },
      { $sort: { totalPicks: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('\n🎯 Top 5 Civilizations (Recalculated):');
    civStats.slice(0, 5).forEach((civ, index) => {
      console.log(`   ${index + 1}. ${civ._id}: ${civ.totalPicks.toLocaleString()} games, ${(civ.winRate * 100).toFixed(1)}% WR`);
    });
    
    // Save updated civ stats to cache
    console.log('\n💾 Rebuilding civilization cache...');
    const cacheData = civStats.map(civ => ({
      _id: civ._id,
      totalPicks: civ.totalPicks,
      wins: civ.wins,
      losses: civ.totalPicks - civ.wins,
      winRate: civ.winRate,
      avgRating: civ.avgRating || 0,
      updatedAt: new Date()
    }));
    
    if (cacheData.length > 0) {
      await db.collection('civ_stats_cache').insertMany(cacheData);
      console.log(`   ✅ Rebuilt cache with ${cacheData.length} civilizations`);
    }
    
    console.log('\n🎉 Cache clearing completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your API server');
    console.log('   2. Visit your frontend to see updated numbers');
    console.log('   3. Check /api/stats/civilizations endpoint');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cache clearing failed:', error);
    process.exit(1);
  }
};

// Command line interface
const command = process.argv[2];

const showUsage = () => {
  console.log(`
🧹 Cache Clearing Utility

Usage:
  npm run clear-cache           - Clear all caches and rebuild basic stats
  npm run clear-cache --force   - Force clear everything including temp data
  npm run clear-cache --stats   - Just show current stats without clearing
  npm run clear-cache --help    - Show this help
`);
};

const showStatsOnly = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('📊 Current Database Statistics:\n');
    
    const [matchCount, playerCount, weekRanges] = await Promise.all([
      Match.countDocuments(),
      Player.countDocuments(),  
      Match.distinct('week_range')
    ]);
    
    console.log(`📋 Total Matches: ${matchCount.toLocaleString()}`);
    console.log(`👥 Total Players: ${playerCount.toLocaleString()}`);
    console.log(`📅 Week Ranges: ${weekRanges.length} weeks`);
    
    // Check cache status
    const cacheCollections = await db.listCollections({ name: { $regex: /cache|stats_|rankings/ } }).toArray();
    console.log(`\n🗂️  Cache Collections:`);
    for (const col of cacheCollections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   ${col.name}: ${count.toLocaleString()} records`);
    }
    
    console.log(`\n📅 Recent Weeks:`);
    weekRanges.sort().slice(-10).forEach((week, index, arr) => {
      console.log(`   ${arr.length - 9 + index}. ${week}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Stats query failed:', error);
    process.exit(1);
  }
};

// Handle commands
switch (command) {
  case '--help':
  case '-h':
    showUsage();
    break;
  case '--stats':
    showStatsOnly();
    break;
  case '--force':
  case undefined:
    clearAllCaches();
    break;
  default:
    showUsage();
    process.exit(1);
}