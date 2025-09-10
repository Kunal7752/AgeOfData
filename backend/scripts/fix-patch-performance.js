require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');

const fixPatchPerformance = async () => {
  try {
    console.log('🔧 Fixing patch query performance...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. First, let's see what patches we have
    console.log('📊 Analyzing patch data...');
    const patches = await Match.distinct('patch');
    console.log(`   Found ${patches.length} unique patches: ${patches.slice(-5).join(', ')}`);
    
    // 2. Create the specific indexes needed for patch queries
    console.log('\n🔧 Creating patch-specific indexes...');
    
    const patchIndexes = [
      // Critical compound index for the lookup in patch queries
      { 
        collection: 'players', 
        index: { civ: 1, game_id: 1 }, 
        name: 'civ_game_patch_lookup' 
      },
      // Patch sorting index
      { 
        collection: 'matches', 
        index: { patch: -1, game_id: 1 }, 
        name: 'patch_game_sort' 
      },
      // Winner calculation index
      { 
        collection: 'players', 
        index: { game_id: 1, winner: 1, civ: 1 }, 
        name: 'game_winner_civ' 
      }
    ];
    
    for (const idx of patchIndexes) {
      try {
        await db.collection(idx.collection).createIndex(idx.index, { 
          name: idx.name, 
          background: true 
        });
        console.log(`   ✅ ${idx.name} on ${idx.collection}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  ${idx.name} already exists`);
        } else {
          console.log(`   ❌ Failed ${idx.name}:`, error.message);
        }
      }
    }
    
    // 3. Test the problematic patch query with a sample
    console.log('\n🧪 Testing patch query performance...');
    const sampleCiv = 'britons'; // or whatever civ is being tested
    
    const testStart = Date.now();
    
    // This simulates your problematic patch endpoint
    const patchData = await Player.aggregate([
      { $match: { civ: sampleCiv } },
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.patch': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$match.patch',
          games: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } }
        }
      },
      {
        $addFields: {
          civWin: { $multiply: [{ $divide: ['$wins', '$games'] }, 100] }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 20 } // Limit results to avoid massive responses
    ], { maxTimeMS: 30000 });
    
    const testTime = Date.now() - testStart;
    
    if (patchData.length > 0) {
      console.log(`   ✅ Patch query completed in ${testTime}ms`);
      console.log(`   📊 Found data for ${patchData.length} patches`);
      console.log(`   📈 Sample: Patch ${patchData[0]._id} - ${patchData[0].games} games, ${patchData[0].civWin.toFixed(1)}% WR`);
    } else {
      console.log(`   ⚠️  Patch query returned no results in ${testTime}ms`);
    }
    
    // 4. Alternative: Pre-compute patch stats for problematic civs
    console.log('\n💾 Creating patch statistics cache...');
    
    const topCivs = await Player.aggregate([
      { $group: { _id: '$civ', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log(`   Processing patch data for top ${topCivs.length} civilizations...`);
    
    let cacheEntries = [];
    for (const civ of topCivs) {
      try {
        const civPatchData = await Player.aggregate([
          { $match: { civ: civ._id } },
          {
            $lookup: {
              from: 'matches',
              localField: 'game_id', 
              foreignField: 'game_id',
              as: 'match',
              pipeline: [{ $project: { patch: 1, _id: 0 } }]
            }
          },
          { $unwind: '$match' },
          { $match: { 'match.patch': { $exists: true, $ne: null } } },
          {
            $group: {
              _id: { civ: civ._id, patch: '$match.patch' },
              games: { $sum: 1 },
              wins: { $sum: { $cond: ['$winner', 1, 0] } }
            }
          },
          {
            $addFields: {
              civWin: { $multiply: [{ $divide: ['$wins', '$games'] }, 100] }
            }
          }
        ], { maxTimeMS: 15000 });
        
        cacheEntries = cacheEntries.concat(civPatchData.map(entry => ({
          civ: entry._id.civ,
          patch: entry._id.patch,
          games: entry.games,
          wins: entry.wins,
          civWin: entry.civWin,
          lastUpdated: new Date()
        })));
        
        console.log(`     ✅ ${civ._id}: ${civPatchData.length} patches processed`);
      } catch (error) {
        console.log(`     ⚠️  ${civ._id}: Skipped due to timeout`);
      }
    }
    
    // Save cache if we have data
    if (cacheEntries.length > 0) {
      await db.collection('civ_patch_cache').deleteMany({});
      await db.collection('civ_patch_cache').insertMany(cacheEntries);
      
      // Create index on cache
      await db.collection('civ_patch_cache').createIndex(
        { civ: 1, patch: 1 },
        { name: 'civ_patch_cache_idx' }
      );
      
      console.log(`   💾 Cached ${cacheEntries.length} civ-patch combinations`);
    }
    
    console.log('\n✅ Patch performance optimization complete!');
    console.log('💡 Test the patch endpoint again - it should be much faster');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Patch optimization failed:', error);
    process.exit(1);
  }
};

fixPatchPerformance();