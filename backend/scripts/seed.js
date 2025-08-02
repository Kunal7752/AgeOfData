// scripts/seed.js - Enhanced Manual Seeding Script
require('dotenv').config();
const connectDB = require('../config/database');
const dataSeeder = require('../services/dataSeeder');

const showUsage = () => {
  console.log(`
Usage:
  npm run seed                    - Seed initial data (4 most recent available weeks)
  npm run seed <date_range>       - Seed specific week (e.g., 2024-01-01_2024-01-07)
  npm run seed --list             - List available dumps and their status
  npm run seed --help             - Show this help message
`);
};

const runSeed = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      showUsage();
      process.exit(0);
    }
    
    if (args.includes('--list') || args.includes('-l')) {
      await dataSeeder.listAvailableDumps();
      process.exit(0);
    }
    
    if (args.length > 0 && !args[0].startsWith('--')) {
      // Seed specific week
      const dateRange = args[0];
      if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
        console.error('Invalid date range format. Use: YYYY-MM-DD_YYYY-MM-DD');
        process.exit(1);
      }
      await dataSeeder.seedSpecificWeek(dateRange);
    } else {
      // Seed initial data
      await dataSeeder.seedInitialData();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    
    if (error.message.includes('404')) {
      console.error('\nThis usually means the dump is too old and no longer available.');
      console.error('Try running: npm run seed --list');
      console.error('Then pick a more recent date range.');
    }
    
    if (error.message.includes('invalid parquet version')) {
      console.error('\nThis dump appears to be corrupted or in an incompatible format.');
      console.error('Try a different date range.');
    }
    
    process.exit(1);
  }
};

runSeed();