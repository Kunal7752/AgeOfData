// scripts/optimize-complete-endpoint.js
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const optimizeCompleteEndpoint = async () => {
  console.log('🚀 Optimizing database for /civilizations/complete endpoint\n');
  
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    // Create optimized indexes
    console.log('🔧 Creating optimized indexes...');
    
    const indexOperations = [
      // Primary civilization lookup index
      {
        collection: 'players',
        index: { civLower: 1 },
        options: { 
          name: 'civLower_1',
          background: true,
          partialFilterExpression: { civLower: { $exists: true, $ne: "" } }
        }
      },
      
      // Civilization + rating analysis
      {
        collection: 'players',
        index: { civLower: 1, old_rating: 1 },
        options: { 
          name: 'civLower_rating_1',
          background: true,
          partialFilterExpression: { 
            civLower: { $exists: true },
            old_rating: { $gte: 0, $lte: 3000 }
          }
        }
      },
      
      // Game lookup for match data
      {
        collection: 'players',
        index: { game_id: 1, team: 1 },
        options: { 
          name: 'gameId_team_1',
          background: true
        }
      },
      
      // Match data optimization
      {
        collection: 'matches',
        index: { game_id: 1, patch: 1, duration: 1 },
        options: { 
          name: 'gameId_patch_duration_1',
          background: true,
          partialFilterExpression: { 
            duration: { $exists: true, $gt: 0 }
          }
        }
      }
    ];

    for (const { collection, index, options } of indexOperations) {
      try {
        console.log(`   Creating index on ${collection}:`, Object.keys(index));
        await db.collection(collection).createIndex(index, options);
        console.log(`   ✅ Index created: ${options.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️ Index already exists: ${options.name}`);
        } else {
          console.error(`   ❌ Failed to create index ${options.name}:`, error.message);
        }
      }
    }

    console.log('\n✅ Database optimization complete!');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

optimizeCompleteEndpoint();