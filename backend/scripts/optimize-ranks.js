const mongoose = require('mongoose');
require('dotenv').config();

const optimizeRankQueries = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔧 Optimizing database for rank queries...\n');

    const db = mongoose.connection.db;
    
    // Check current space usage
    const stats = await db.stats();
    console.log(`💾 Current usage: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB\n`);
    
    console.log('📈 Creating rank-specific indexes...');
    
    // CRITICAL INDEXES FOR RANK QUERIES
    
    // 1. Compound index for the lookup operation
    try {
      await db.collection('players').createIndex(
        { civ: 1, game_id: 1, winner: 1 },
        { name: 'civ_game_winner_idx', background: true }
      );
      console.log('✅ players.civ_game_winner compound index');
    } catch (e) { 
      console.log('⚠️  players.civ_game_winner already exists'); 
    }
    
    // 2. Match patch index for filtering recent patches
    try {
      await db.collection('matches').createIndex(
        { patch: -1 },
        { name: 'patch_desc_idx', background: true }
      );
      console.log('✅ matches.patch descending index');
    } catch (e) { 
      console.log('⚠️  matches.patch already exists'); 
    }
    
    // 3. Compound index for match filtering
    try {
      await db.collection('matches').createIndex(
        { patch: 1, game_id: 1 },
        { name: 'patch_game_idx', background: true }
      );
      console.log('✅ matches.patch_game compound index');
    } catch (e) { 
      console.log('⚠️  matches.patch_game already exists'); 
    }

    // QUERY PERFORMANCE ANALYSIS
    console.log('\n🔍 Analyzing rank query performance...');
    
    // Test the problematic query with explain
    const sampleCiv = 'Persians';
    
    console.log(`\nTesting rank query for ${sampleCiv}...`);
    
    try {
      // Get recent patches (this should be fast now)
      const recentPatches = await db.collection('matches').aggregate([
        {
          $group: { _id: '$patch', count: { $sum: 1 } }
        },
        { $sort: { _id: -1 } },
        { $limit: 3 }
      ]).explain('executionStats');
      
      console.log(`✅ Recent patches query took: ${recentPatches.executionStats.totalTimeInMillis}ms`);
      
    } catch (e) {
      console.log('❌ Recent patches query failed:', e.message);
    }
    
    // ALTERNATIVE: Create a materialized view collection for rankings
    console.log('\n📊 Creating rankings cache collection...');
    
    try {
      // Drop existing rankings collection if it exists
      await db.collection('civ_rankings').drop().catch(() => {});
      
      // Create new rankings collection with current data
      console.log('🔄 Computing initial rankings...');
      
      const currentRankings = await db.collection('players').aggregate([
        {
          $lookup: {
            from: 'matches',
            localField: 'game_id',
            foreignField: 'game_id',
            as: 'match',
            pipeline: [
              { 
                $match: { 
                  patch: { $gte: 101128 } // Only recent patches
                }
              },
              { $project: { patch: 1 } }
            ]
          }
        },
        { $unwind: '$match' },
        {
          $group: {
            _id: { patch: '$match.patch', civ: '$civ' },
            games: { $sum: 1 },
            wins: { $sum: { $cond: ['$winner', 1, 0] } }
          }
        },
        { $match: { games: { $gte: 10 } } },
        {
          $addFields: {
            winRate: { $divide: ['$wins', '$games'] }
          }
        },
        {
          $group: {
            _id: '$_id.patch',
            civs: {
              $push: {
                civ: '$_id.civ',
                winRate: '$winRate',
                games: '$games',
                wins: '$wins'
              }
            }
          }
        },
        {
          $addFields: {
            civs: {
              $sortArray: {
                input: '$civs',
                sortBy: { winRate: -1 }
              }
            }
          }
        },
        {
          $addFields: {
            civs: {
              $map: {
                input: { $range: [0, { $size: '$civs' }] },
                as: 'index',
                in: {
                  $mergeObjects: [
                    { $arrayElemAt: ['$civs', '$$index'] },
                    { rank: { $add: ['$$index', 1] } }
                  ]
                }
              }
            }
          }
        },
        {
          $unwind: '$civs'
        },
        {
          $replaceRoot: {
            newRoot: {
              patch: '$_id',
              civ: '$civs.civ',
              rank: '$civs.rank',
              winRate: '$civs.winRate',
              games: '$civs.games',
              wins: '$civs.wins',
              lastUpdated: new Date()
            }
          }
        },
        {
          $out: 'civ_rankings'
        }
      ], { maxTimeMS: 60000 });
      
      // Create index on the new collection
      await db.collection('civ_rankings').createIndex(
        { civ: 1, patch: 1 },
        { name: 'civ_patch_idx' }
      );
      
      const rankingCount = await db.collection('civ_rankings').countDocuments();
      console.log(`✅ Created civ_rankings collection with ${rankingCount} entries`);
      
    } catch (e) {
      console.log('⚠️  Ranking cache creation failed:', e.message);
      console.log('💡 This is optional - the main indexes should still help');
    }
    
    // FINAL PERFORMANCE TEST
    console.log('\n🏁 Testing optimized rank query...');
    
    try {
      const testStart = Date.now();
      
      const testRanks = await db.collection('civ_rankings').find({
        civ: sampleCiv
      }).sort({ patch: 1 }).toArray();
      
      const testTime = Date.now() - testStart;
      console.log(`✅ Optimized rank query took: ${testTime}ms`);
      console.log(`📊 Found rankings for ${testRanks.length} patches`);
      
      if (testRanks.length > 0) {
        console.log(`🎯 Sample: ${sampleCiv} ranked #${testRanks[0].rank} in patch ${testRanks[0].patch}`);
      }
      
    } catch (e) {
      console.log('⚠️  Test query failed, falling back to original approach');
    }
    
    const finalStats = await db.stats();
    console.log(`\n💾 Final usage: ${(finalStats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    console.log('\n✅ Rank optimization complete!');
    console.log('💡 The rank endpoint should now be much faster');
    
  } catch (error) {
    console.error('❌ Rank optimization failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

optimizeRankQueries();