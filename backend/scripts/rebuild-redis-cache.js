require('dotenv').config();
const redis = require('redis');
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

const rebuildCache = async () => {
  try {
    console.log('🔄 Rebuilding Redis Cache...\n');
    
    // Connect to Redis
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { connectTimeout: 10000 }
    });
    
    await client.connect();
    console.log('✅ Connected to Redis');
    
    // Check if Redis is empty
    const keyCount = await client.dbSize();
    console.log(`📊 Current Redis keys: ${keyCount}`);
    
    if (keyCount > 100) {
      console.log('ℹ️  Cache appears to already have data. Continuing anyway...\n');
    }
    
    // List of endpoints to warm up the cache
    const endpointsToWarm = [
      '/stats/civilizations',
      '/matches/stats/overview', 
      '/stats/trends',
      '/stats/maps',
      // Top civilizations - these are commonly accessed
      '/stats/civilizations/britons/complete',
      '/stats/civilizations/franks/complete', 
      '/stats/civilizations/mongols/complete',
      '/stats/civilizations/persians/complete',
      '/stats/civilizations/spanish/complete',
      // Individual components for top civs
      '/stats/civilizations/britons/rating',
      '/stats/civilizations/britons/duration', 
      '/stats/civilizations/britons/best-against',
      '/stats/civilizations/britons/worst-against',
      '/stats/civilizations/franks/rating',
      '/stats/civilizations/franks/duration',
      '/stats/civilizations/mongols/rating', 
      '/stats/civilizations/mongols/duration'
    ];
    
    console.log(`🔥 Warming up cache for ${endpointsToWarm.length} endpoints...\n`);
    
    let successCount = 0;
    let totalTime = 0;
    
    for (let i = 0; i < endpointsToWarm.length; i++) {
      const endpoint = endpointsToWarm[i];
      const progress = `[${i + 1}/${endpointsToWarm.length}]`;
      
      try {
        console.log(`${progress} 🔄 ${endpoint}`);
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE}${endpoint}`, {
          timeout: 30000 // 30 second timeout
        });
        
        const responseTime = Date.now() - startTime;
        totalTime += responseTime;
        
        if (response.status === 200) {
          successCount++;
          console.log(`${progress} ✅ ${endpoint} (${responseTime}ms)`);
        } else {
          console.log(`${progress} ⚠️  ${endpoint} - HTTP ${response.status}`);
        }
        
        // Small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`${progress} ❌ ${endpoint} - ${error.message}`);
        
        if (error.message.includes('timeout')) {
          console.log(`     💡 Endpoint timed out - will be slow until optimized`);
        }
      }
    }
    
    // Check final Redis key count
    const finalKeyCount = await client.dbSize();
    console.log(`\n📊 Cache Rebuild Summary:`);
    console.log(`   ✅ Successful requests: ${successCount}/${endpointsToWarm.length}`);
    console.log(`   ⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`   📈 Redis keys: ${keyCount} → ${finalKeyCount} (+${finalKeyCount - keyCount})`);
    console.log(`   📊 Average response time: ${Math.round(totalTime / endpointsToWarm.length)}ms`);
    
    if (finalKeyCount > keyCount + 10) {
      console.log('\n🎉 Cache rebuild successful!');
      console.log('💡 Test your performance again - should be much faster');
    } else {
      console.log('\n⚠️  Cache rebuild may be incomplete');
      console.log('💡 Some endpoints may still be slow until they get cached');
    }
    
    await client.disconnect();
    
    // Immediate performance test
    console.log('\n🧪 Running immediate performance test...');
    const testEndpoints = [
      '/stats/civilizations',
      '/stats/civilizations/britons/complete', 
      '/stats/trends'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const start = Date.now();
        await axios.get(`${API_BASE}${endpoint}`, { timeout: 5000 });
        const time = Date.now() - start;
        console.log(`   ${time < 1000 ? '✅' : '⚠️'} ${endpoint}: ${time}ms`);
      } catch (error) {
        console.log(`   ❌ ${endpoint}: ${error.message}`);
      }
    }
    
    console.log('\n🚀 Cache rebuild complete!');
    console.log('💡 Run: node scripts/performance-monitor.js full');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cache rebuild failed:', error);
    
    if (error.code === 'ECONNREFUSED' && error.message.includes('6379')) {
      console.log('\n💡 Redis connection failed. Make sure Redis is running:');
      console.log('   npm run redis:start');
    }
    
    process.exit(1);
  }
};

// Command line options
const command = process.argv[2];

if (command === '--help' || command === '-h') {
  console.log(`
🔄 Redis Cache Rebuilder

Usage:
  node scripts/rebuild-redis-cache.js        - Rebuild cache for common endpoints
  node scripts/rebuild-redis-cache.js --help - Show this help

This script will:
✅ Connect to Redis
✅ Make requests to common endpoints to populate cache
✅ Test cache performance after rebuild
✅ Show cache statistics

Make sure your API server is running before using this script.
`);
  process.exit(0);
}

rebuildCache();