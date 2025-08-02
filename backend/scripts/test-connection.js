require('dotenv').config();
const connectDB = require('../config/database');
const dataFetcher = require('../services/dataFetcher');
const Match = require('../models/Match');
const Player = require('../models/Player');

const testConnection = async () => {
  console.log('🧪 Testing AoE Stats API Connections\n');
  
  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing MongoDB connection...');
    await connectDB();
    console.log('✅ MongoDB connected successfully\n');
    
    // Test 2: Check existing data
    console.log('2️⃣ Checking existing data...');
    const matchCount = await Match.countDocuments();
    const playerCount = await Player.countDocuments();
    console.log(`📊 Found ${matchCount.toLocaleString()} matches and ${playerCount.toLocaleString()} players\n`);
    
    // Test 3: AoE Stats API connection
    console.log('3️⃣ Testing AoE Stats API connection...');
    const testResult = await dataFetcher.testConnection();
    if (testResult.success) {
      console.log(`✅ API connected - ${testResult.dumpCount} dumps available\n`);
    } else {
      console.log(`❌ API connection failed: ${testResult.error}\n`);
    }
    
    // Test 4: Modern parquet libraries
    console.log('4️⃣ Testing parquet libraries...');
    try {
      await dataFetcher.initialize();
      console.log('✅ Parquet libraries loaded successfully\n');
    } catch (error) {
      console.log(`❌ Parquet library error: ${error.message}\n`);
    }
    
    // Test 5: Sample data processing (if no data exists)
    if (matchCount === 0) {
      console.log('5️⃣ No data found - testing sample data fetch...');
      try {
        const dumps = await dataFetcher.getAvailableDumps();
        const latestDump = dumps.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
        
        if (latestDump) {
          console.log(`📥 Latest dump available: ${latestDump.start_date}_${latestDump.end_date}`);
          console.log('💡 Run "npm run seed" to import data\n');
        } else {
          console.log('❌ No dumps available\n');
        }
      } catch (error) {
        console.log(`❌ Failed to fetch dumps: ${error.message}\n`);
      }
    } else {
      // Test 6: Sample database queries
      console.log('5️⃣ Testing database queries...');
      
      // Test basic match query
      const sampleMatch = await Match.findOne().lean();
      if (sampleMatch) {
        console.log(`✅ Sample match found: ${sampleMatch.game_id}`);
      }
      
      // Test basic aggregation
      const civStats = await Player.aggregate([
        { $group: { _id: '$civ', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      if (civStats.length > 0) {
        console.log('✅ Aggregation working - Top civs:');
        civStats.forEach((civ, index) => {
          console.log(`   ${index + 1}. ${civ._id}: ${civ.count.toLocaleString()} games`);
        });
      }
      console.log();
    }
    
    // Test 7: Environment check
    console.log('6️⃣ Environment check...');
    const requiredEnvVars = ['MONGODB_URI'];
    const optionalEnvVars = ['REDIS_URL', 'PORT', 'NODE_ENV'];
    
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing (required)`);
      }
    });
    
    optionalEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`⚠️  ${envVar} is not set (optional)`);
      }
    });
    
    console.log('\n🎉 Connection test completed!');
    
    // Provide next steps
    console.log('\n📋 Next Steps:');
    if (matchCount === 0) {
      console.log('   1. Run "npm run seed" to import initial data');
      console.log('   2. Start the server with "npm run dev"');
      console.log('   3. Visit http://localhost:3000/api for documentation');
    } else {
      console.log('   1. Start the server with "npm run dev"');
      console.log('   2. Visit http://localhost:3000/api for documentation');
      console.log('   3. Try some API endpoints like /api/matches or /api/stats/civilizations');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting:');
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('   • Check your MongoDB connection string in .env');
      console.log('   • Ensure MongoDB is running');
    }
    if (error.message.includes('parquet')) {
      console.log('   • Install parquet dependencies: npm install parquet-wasm apache-arrow');
    }
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('   • Check your internet connection');
      console.log('   • Try again in a few moments');
    }
    
    process.exit(1);
  }
};

// Helper function to test specific endpoint
const testEndpoint = async (endpoint) => {
  try {
    console.log(`🧪 Testing ${endpoint}...`);
    // This would require the server to be running
    // You could add axios calls here to test actual endpoints
    console.log(`✅ ${endpoint} test completed`);
  } catch (error) {
    console.log(`❌ ${endpoint} test failed:`, error.message);
  }
};

// Run the test
testConnection();