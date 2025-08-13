// scripts/minimal-indexes.js - Only the most critical indexes
const mongoose = require('mongoose');
require('dotenv').config();

const createMinimalIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔧 Creating only essential indexes to save space...\n');

    const db = mongoose.connection.db;
    
    // Check current space usage
    const stats = await db.stats();
    console.log(`💾 Current usage: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB\n`);
    
    console.log('📈 Creating ONLY the most critical indexes...');
    
    // PLAYERS - Only the absolute essentials
    try {
      await db.collection('players').createIndex({ game_id: 1 });
      console.log('✅ players.game_id');
    } catch (e) { console.log('⚠️  players.game_id already exists'); }
    
    try {
      await db.collection('players').createIndex({ civ: 1 });
      console.log('✅ players.civ');
    } catch (e) { console.log('⚠️  players.civ already exists'); }
    
    // MATCHES - Only the absolute essentials  
    try {
      await db.collection('matches').createIndex({ game_id: 1 });
      console.log('✅ matches.game_id');
    } catch (e) { console.log('⚠️  matches.game_id already exists'); }
    
    // Skip compound indexes for now to save space
    
    const finalStats = await db.stats();
    console.log(`\n💾 Final usage: ${(finalStats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    
    if (finalStats.dataSize < 512 * 1024 * 1024) {
      console.log('✅ Under quota! You can now run queries.');
      console.log('💡 Consider upgrading MongoDB plan for full optimization.');
    } else {
      console.log('❌ Still over quota. You need to:');
      console.log('   1. Upgrade MongoDB plan, OR');
      console.log('   2. Archive/delete old data');
    }
    
  } catch (error) {
    console.error('❌ Minimal indexing failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createMinimalIndexes();