// scripts/cleanup-database.js
const mongoose = require('mongoose');
require('dotenv').config();

const cleanupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🧹 Starting database cleanup...\n');

    const db = mongoose.connection.db;
    
    // Get current database stats
    const stats = await db.stats();
    console.log(`💾 Current database size: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📊 Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📁 Index size: ${(stats.indexSize / 1024 / 1024).toFixed(1)} MB\n`);
    
    // ═══════════════════════════════════════════════════════════
    // OPTION 1: Remove old/duplicate data
    // ═══════════════════════════════════════════════════════════
    
    console.log('🔍 Analyzing data for cleanup opportunities...\n');
    
    // Check for duplicate matches
    const duplicateMatches = await db.collection('matches').aggregate([
      {
        $group: {
          _id: '$game_id',
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicateMatches.length > 0) {
      console.log(`🔄 Found ${duplicateMatches.length} duplicate matches`);
      console.log('💡 Consider removing duplicates to save space\n');
    }
    
    // Check for old data
    const oldestMatch = await db.collection('matches').findOne({}, { sort: { started_timestamp: 1 } });
    const newestMatch = await db.collection('matches').findOne({}, { sort: { started_timestamp: -1 } });
    
    if (oldestMatch && newestMatch) {
      const daysDiff = (newestMatch.started_timestamp - oldestMatch.started_timestamp) / (1000 * 60 * 60 * 24);
      console.log(`📅 Data spans ${Math.round(daysDiff)} days`);
      
      if (daysDiff > 365) {
        console.log('💡 Consider archiving data older than 6-12 months\n');
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // OPTION 2: Archive old data (older than 6 months)
    // ═══════════════════════════════════════════════════════════
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldMatches = await db.collection('matches').countDocuments({
      started_timestamp: { $lt: sixMonthsAgo }
    });
    
    const oldPlayers = await db.collection('players').aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.started_timestamp': { $lt: sixMonthsAgo } } },
      { $count: 'total' }
    ]).toArray();
    
    const oldPlayerCount = oldPlayers[0]?.total || 0;
    
    if (oldMatches > 0 || oldPlayerCount > 0) {
      console.log(`📦 Archive candidates:`);
      console.log(`   - ${oldMatches.toLocaleString()} matches older than 6 months`);
      console.log(`   - ${oldPlayerCount.toLocaleString()} player records from old matches`);
      console.log(`💾 This could free up significant space\n`);
    }
    
    // ═══════════════════════════════════════════════════════════
    // OPTION 3: Compact collections
    // ═══════════════════════════════════════════════════════════
    
    console.log('🗜️  Running database compaction...');
    
    try {
      await db.command({ compact: 'matches' });
      console.log('✅ Matches collection compacted');
    } catch (err) {
      console.log('⚠️  Compact not supported on this MongoDB version/tier');
    }
    
    try {
      await db.command({ compact: 'players' });
      console.log('✅ Players collection compacted');
    } catch (err) {
      console.log('⚠️  Compact not supported on this MongoDB version/tier');
    }
    
    // ═══════════════════════════════════════════════════════════
    // FINAL STATS
    // ═══════════════════════════════════════════════════════════
    
    const finalStats = await db.stats();
    console.log(`\n📊 Final database size: ${(finalStats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📊 Storage size: ${(finalStats.storageSize / 1024 / 1024).toFixed(1)} MB`);
    
    const savedSpace = (stats.storageSize - finalStats.storageSize) / 1024 / 1024;
    if (savedSpace > 0.1) {
      console.log(`💾 Space saved: ${savedSpace.toFixed(1)} MB`);
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. If still over quota, consider upgrading your MongoDB plan');
    console.log('2. Or archive old data to free more space');
    console.log('3. Then run: node scripts/optimize-database.js');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

cleanupDatabase();