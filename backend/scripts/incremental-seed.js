// scripts/incremental-seed.js - Add more data to existing database
require('dotenv').config();
const connectDB = require('../config/database');
const dataFetcher = require('../services/dataFetcher');
const Match = require('../models/Match');
const Player = require('../models/Player');

const showUsage = () => {
  console.log(`
🎯 Incremental Data Seeder - Add more data to existing database

Usage:
  npm run incremental-seed                    - Add latest 3 weeks available
  npm run incremental-seed <date_range>       - Add specific week (e.g., 2024-01-01_2024-01-07)
  npm run incremental-seed --recent <count>   - Add recent N weeks (e.g., --recent 5)
  npm run incremental-seed --list             - List available dumps and their status
  npm run incremental-seed --help             - Show this help message

Examples:
  npm run incremental-seed --recent 5         # Add 5 most recent weeks
  npm run incremental-seed 2024-12-23_2024-12-29  # Add Christmas week 2024
  npm run incremental-seed --list             # See what's available vs what you have
`);
};

const runIncrementalSeed = async () => {
  try {
    await connectDB();
    console.log('🔌 Connected to MongoDB');
    
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      showUsage();
      process.exit(0);
    }
    
    if (args.includes('--list') || args.includes('-l')) {
      await listAvailableVsExisting();
      process.exit(0);
    }
    
    // Check current data
    const existingMatchCount = await Match.countDocuments();
    const existingPlayerCount = await Player.countDocuments();
    const existingWeeks = await Match.distinct('week_range');
    
    console.log(`📊 Current Database Status:`);
    console.log(`   • Matches: ${existingMatchCount.toLocaleString()}`);
    console.log(`   • Players: ${existingPlayerCount.toLocaleString()}`);
    console.log(`   • Weeks: ${existingWeeks.length} (${existingWeeks.slice(0, 3).join(', ')}...)`);
    console.log('');
    
    // Determine what to seed
    if (args.includes('--recent')) {
      const countIndex = args.indexOf('--recent') + 1;
      const count = parseInt(args[countIndex]) || 3;
      await seedRecentWeeks(count, existingWeeks);
    } else if (args.length > 0 && !args[0].startsWith('--')) {
      // Seed specific week
      const dateRange = args[0];
      if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
        console.error('❌ Invalid date range format. Use: YYYY-MM-DD_YYYY-MM-DD');
        process.exit(1);
      }
      await seedSpecificWeek(dateRange, existingWeeks);
    } else {
      // Default: Add latest 3 weeks
      await seedRecentWeeks(3, existingWeeks);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Incremental seeding failed:', error.message);
    
    if (error.message.includes('404')) {
      console.error('\n💡 This usually means the dump is too old and no longer available.');
      console.error('Try running: npm run incremental-seed --list');
      console.error('Then pick a more recent date range.');
    }
    
    process.exit(1);
  }
};

const seedRecentWeeks = async (count, existingWeeks) => {
  console.log(`🎯 Adding ${count} most recent available weeks...`);
  
  // Initialize data fetcher
  await dataFetcher.initialize();
  
  // Get all available dumps
  const dumps = await dataFetcher.getAvailableDumps();
  console.log(`📥 Found ${dumps.length} dumps available on aoestats.io`);
  
  // Sort by date (newest first) and filter out existing ones
  const sortedDumps = dumps.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const newDumps = sortedDumps.filter(dump => {
    const weekRange = `${dump.start_date}_${dump.end_date}`;
    return !existingWeeks.includes(weekRange);
  });
  
  if (newDumps.length === 0) {
    console.log('✅ No new data available - your database is up to date!');
    return;
  }
  
  console.log(`🆕 Found ${newDumps.length} new weeks available`);
  console.log('📋 New weeks to process:');
  newDumps.slice(0, count).forEach((dump, index) => {
    console.log(`   ${index + 1}. ${dump.start_date}_${dump.end_date}`);
  });
  console.log('');
  
  // Process the requested number of weeks
  let successCount = 0;
  const weeksToProcess = newDumps.slice(0, count);
  
  for (let i = 0; i < weeksToProcess.length; i++) {
    const dump = weeksToProcess[i];
    const weekRange = `${dump.start_date}_${dump.end_date}`;
    
    console.log(`\n🔄 Processing week ${i + 1}/${weeksToProcess.length}: ${weekRange}`);
    
    try {
      const result = await dataFetcher.syncWeeklyData(dump);
      
      if (result.success && !result.skipped) {
        successCount++;
        console.log(`✅ Week ${weekRange} added successfully`);
        console.log(`   📊 Matches: +${result.matches?.count || 0}`);
        console.log(`   👥 Players: +${result.players?.count || 0}`);
      } else {
        console.log(`⚠️  Week ${weekRange} skipped: ${result.error || 'Already exists'}`);
      }
    } catch (error) {
      console.log(`❌ Week ${weekRange} failed: ${error.message}`);
      
      if (error.message.includes('404')) {
        console.log('   💡 Dump may be too old or temporarily unavailable');
      }
    }
  }
  
  console.log(`\n🎉 Incremental seeding completed!`);
  console.log(`   ✅ Successfully added: ${successCount}/${weeksToProcess.length} weeks`);
  
  // Show updated stats
  const newMatchCount = await Match.countDocuments();
  const newPlayerCount = await Player.countDocuments();
  console.log(`   📈 Database growth: +${(newMatchCount - existingMatchCount).toLocaleString()} matches, +${(newPlayerCount - existingPlayerCount).toLocaleString()} players`);
};

const seedSpecificWeek = async (dateRange, existingWeeks) => {
  if (existingWeeks.includes(dateRange)) {
    console.log(`⚠️  Week ${dateRange} already exists in database`);
    console.log('🔄 Use --force flag to re-seed this week (not implemented yet)');
    return;
  }
  
  console.log(`🎯 Adding specific week: ${dateRange}`);
  
  // Initialize data fetcher
  await dataFetcher.initialize();
  
  const dumps = await dataFetcher.getAvailableDumps();
  const [start, end] = dateRange.split('_');
  const dump = dumps.find(d => d.start_date === start && d.end_date === end);
  
  if (!dump) {
    throw new Error(`No dump found for ${dateRange}`);
  }
  
  const result = await dataFetcher.syncWeeklyData(dump);
  
  if (!result.success) {
    throw new Error(`Failed to seed ${dateRange}: ${result.error}`);
  }
  
  console.log(`✅ Successfully added ${dateRange}`);
  console.log(`   📊 Matches: +${result.matches?.count || 0}`);
  console.log(`   👥 Players: +${result.players?.count || 0}`);
};

const listAvailableVsExisting = async () => {
  console.log('📋 Available Dumps vs Existing Data\n');
  
  // Initialize data fetcher
  await dataFetcher.initialize();
  
  const [dumps, existingWeeks] = await Promise.all([
    dataFetcher.getAvailableDumps(),
    Match.distinct('week_range')
  ]);
  
  const sortedDumps = dumps.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  
  console.log(`📥 Total available on aoestats.io: ${dumps.length} weeks`);
  console.log(`💾 Already in your database: ${existingWeeks.length} weeks\n`);
  
  console.log('Status Legend: ✅ In DB | ⭐ New Available | ❌ Missing/Old\n');
  console.log('Most Recent 15 Weeks:');
  console.log('─'.repeat(50));
  
  for (const dump of sortedDumps.slice(0, 15)) {
    const weekRange = `${dump.start_date}_${dump.end_date}`;
    const status = existingWeeks.includes(weekRange) ? '✅ In DB' : '⭐ New';
    const matchCount = existingWeeks.includes(weekRange) 
      ? await Match.countDocuments({ week_range: weekRange })
      : 0;
    
    const matchInfo = status === '✅ In DB' ? `(${matchCount.toLocaleString()} matches)` : '';
    console.log(`  ${weekRange} ${status} ${matchInfo}`);
  }
  
  const newAvailable = sortedDumps.filter(dump => {
    const weekRange = `${dump.start_date}_${dump.end_date}`;
    return !existingWeeks.includes(weekRange);
  }).length;
  
  console.log('─'.repeat(50));
  console.log(`🆕 New weeks available to add: ${newAvailable}`);
  
  if (newAvailable > 0) {
    console.log('\n💡 To add recent data:');
    console.log('   npm run incremental-seed --recent 5');
    console.log('   npm run incremental-seed 2024-12-23_2024-12-29');
  }
};

// Add this to package.json scripts:
console.log('💡 Add to your package.json scripts:');
console.log('"incremental-seed": "node scripts/incremental-seed.js"');

runIncrementalSeed();