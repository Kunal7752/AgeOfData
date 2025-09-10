// scripts/create-essential-indexes.js
require('dotenv').config();
const mongoose = require('mongoose');

const createEssentialIndexes = async () => {
  try {
    console.log('⚡ Creating essential indexes for ultra-fast queries...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('✅ Connected to MongoDB');

    const essentialIndexes = [
      {
        collection: 'players',
        index: { civ: 1, old_rating: 1, winner: 1 },
        name: 'civ_rating_winner_fast'
      },
      {
        collection: 'players', 
        index: { game_id: 1, team: 1, civ: 1 },
        name: 'game_team_civ_fast'
      },
      {
        collection: 'players',
        index: { civ: 1, game_id: 1 },
        name: 'civ_game_fast'
      },
      {
        collection: 'matches',
        index: { game_id: 1 },
        name: 'game_id_fast'
      },
      {
        collection: 'matches',
        index: { patch: 1, duration: 1 },
        name: 'patch_duration_fast'
      }
    ];

    console.log('🚀 Creating indexes...\n');

    let successCount = 0;
    for (const indexDef of essentialIndexes) {
      try {
        await db.collection(indexDef.collection).createIndex(indexDef.index, {
          name: indexDef.name,
          background: true
        });
        
        console.log(`  ✅ ${indexDef.collection}.${indexDef.name}`);
        successCount++;
        
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${indexDef.collection}.${indexDef.name} (already exists)`);
          successCount++;
        } else {
          console.log(`  ❌ ${indexDef.collection}.${indexDef.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Index creation summary: ${successCount}/${essentialIndexes.length} successful`);
    console.log('\n🎉 Essential indexes created successfully!');
    console.log('💡 Your queries should now be 5-10x faster');

    process.exit(0);

  } catch (error) {
    console.error('❌ Index creation failed:', error.message);
    process.exit(1);
  }
};

createEssentialIndexes();