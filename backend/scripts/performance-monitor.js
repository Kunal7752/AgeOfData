// scripts/performance-monitor.js - Monitor API endpoint performance
require('dotenv').config();
const axios = require('axios');
const connectDB = require('../config/database');

const API_BASE = 'http://localhost:3000/api';

// Test endpoints with their expected response times (in ms)
const ENDPOINTS_TO_TEST = [
  { path: '/stats/civilizations', maxTime: 3000, name: 'Civilization Stats' },
  { path: '/stats/civilizations/britons/complete', maxTime: 5000, name: 'Britons Complete' },
  { path: '/stats/civilizations/britons/best-against', maxTime: 2000, name: 'Britons Best Against' },
  { path: '/stats/civilizations/britons/worst-against', maxTime: 2000, name: 'Britons Worst Against' },
  { path: '/stats/civilizations/britons/rating', maxTime: 3000, name: 'Britons by Rating' },
  { path: '/stats/civilizations/britons/patch', maxTime: 3000, name: 'Britons by Patch' },
  { path: '/stats/civilizations/britons/duration', maxTime: 3000, name: 'Britons Duration' },
  { path: '/matches/stats/overview', maxTime: 4000, name: 'Match Overview' },
  { path: '/stats/trends', maxTime: 2000, name: 'Trends' },
  { path: '/stats/maps', maxTime: 5000, name: 'Map Stats' }
];

const testEndpoint = async (endpoint) => {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing ${endpoint.name}...`);
    
    const response = await axios.get(`${API_BASE}${endpoint.path}`, {
      timeout: endpoint.maxTime + 5000 // Give extra buffer for timeout
    });
    
    const responseTime = Date.now() - startTime;
    const status = response.status === 200 ? '✅' : '⚠️';
    const timeStatus = responseTime <= endpoint.maxTime ? '🟢' : '🔴';
    
    console.log(`   ${status} ${timeStatus} ${endpoint.name}: ${responseTime}ms (max: ${endpoint.maxTime}ms)`);
    
    // Check data quality
    let dataQuality = '✅';
    if (response.data.error) {
      dataQuality = '❌';
    } else if (response.data.meta?.fallback) {
      dataQuality = '⚠️';
    }
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      responseTime,
      maxTime: endpoint.maxTime,
      status: response.status,
      success: responseTime <= endpoint.maxTime && response.status === 200,
      dataQuality,
      dataSize: JSON.stringify(response.data).length,
      error: null
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ ${endpoint.name}: FAILED (${error.message})`);
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      responseTime,
      maxTime: endpoint.maxTime,
      status: error.response?.status || 0,
      success: false,
      dataQuality: '❌',
      dataSize: 0,
      error: error.message
    };
  }
};

const runPerformanceTest = async () => {
  console.log('🚀 Starting Performance Test Suite\n');
  console.log('=' .repeat(60));
  
  // Test database connection first
  try {
    await connectDB();
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('   Performance tests may fail due to DB issues\n');
  }
  
  const results = [];
  let totalTime = 0;
  
  // Test each endpoint
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    totalTime += result.responseTime;
    
    // Add delay between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 PERFORMANCE SUMMARY\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const slow = results.filter(r => r.responseTime > r.maxTime);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`🐌 Slow responses: ${slow.length}/${results.length}`);
  console.log(`⏱️  Total test time: ${totalTime}ms`);
  console.log(`📊 Average response time: ${Math.round(totalTime / results.length)}ms`);
  
  if (failed.length > 0) {
    console.log('\n🔴 FAILED ENDPOINTS:');
    failed.forEach(f => {
      console.log(`   • ${f.name}: ${f.error}`);
    });
  }
  
  if (slow.length > 0) {
    console.log('\n🐌 SLOW ENDPOINTS (exceeded max time):');
    slow.forEach(s => {
      console.log(`   • ${s.name}: ${s.responseTime}ms (max: ${s.maxTime}ms)`);
    });
  }
  
  // Performance recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (slow.length > 3) {
    console.log('   • Consider database optimization (indexes, query limits)');
  }
  
  if (failed.length > 0) {
    console.log('   • Fix failed endpoints before deployment');
  }
  
  const avgResponseTime = totalTime / results.length;
  if (avgResponseTime > 2000) {
    console.log('   • Overall response time is high - check server performance');
  }
  
  // Check for cache usage
  const uncachedEndpoints = results.filter(r => 
    r.dataSize > 50000 && r.responseTime > 1000
  );
  
  if (uncachedEndpoints.length > 0) {
    console.log('   • Consider adding caching to large/slow endpoints');
  }
  
  console.log('\n' + '=' .repeat(60));
  
  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
};

// Database health check
const checkDatabaseHealth = async () => {
  console.log('🏥 Database Health Check\n');
  
  try {
    await connectDB();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Check database stats
    const stats = await db.stats();
    console.log(`📊 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📊 Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📊 Index size: ${(stats.indexSize / 1024 / 1024).toFixed(1)} MB`);
    
    // Check collections
    const Player = require('../models/Player');
    const Match = require('../models/Match');
    
    const [playerCount, matchCount] = await Promise.all([
      Player.estimatedDocumentCount(),
      Match.estimatedDocumentCount()
    ]);
    
    console.log(`👥 Players: ${playerCount.toLocaleString()}`);
    console.log(`⚔️  Matches: ${matchCount.toLocaleString()}`);
    
    // Test a simple query
    const testStart = Date.now();
    await Player.findOne().limit(1);
    const testTime = Date.now() - testStart;
    console.log(`⚡ Simple query time: ${testTime}ms`);
    
    // Check indexes
    const playerIndexes = await db.collection('players').indexes();
    const matchIndexes = await db.collection('matches').indexes();
    console.log(`📋 Player indexes: ${playerIndexes.length}`);
    console.log(`📋 Match indexes: ${matchIndexes.length}`);
    
    console.log('\n✅ Database health check complete');
    
  } catch (error) {
    console.log('❌ Database health check failed:', error.message);
  }
};

// Quick endpoint test (just check if they respond)
const quickTest = async () => {
  console.log('⚡ Quick Endpoint Test\n');
  
  const quickEndpoints = [
    '/health',
    '/stats/civilizations',
    '/matches/stats/overview'
  ];
  
  for (const endpoint of quickEndpoints) {
    try {
      const start = Date.now();
      await axios.get(`${API_BASE}${endpoint}`, { timeout: 5000 });
      const time = Date.now() - start;
      console.log(`✅ ${endpoint}: ${time}ms`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
};

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'full':
    runPerformanceTest();
    break;
  case 'db':
    checkDatabaseHealth().then(() => process.exit(0));
    break;
  case 'quick':
    quickTest().then(() => process.exit(0));
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/performance-monitor.js full   # Full performance test');
    console.log('  node scripts/performance-monitor.js db     # Database health check');
    console.log('  node scripts/performance-monitor.js quick  # Quick endpoint test');
    process.exit(1);
}