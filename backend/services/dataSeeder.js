// services/dataSeeder.js
const dataFetcher = require('./dataFetcher');
const Match       = require('../models/Match');

class DataSeeder {
  async seedInitialData() {
    console.log('Starting initial data seeding...');
    
    if (await Match.countDocuments()) {
      console.log('Already have data, skipping.');
      return;
    }

    const dumps = await dataFetcher.getAvailableDumps();
    console.log(`Found ${dumps.length} dumps`);
    
    // Sort dumps by start_date (newest first) and try the most recent ones
    const sortedDumps = dumps.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    const recentDumps = sortedDumps.slice(0, 10); // Try the 10 most recent dumps
    
    let successCount = 0;
    let targetCount = 4; // We want 4 successful dumps
    
    console.log(`Attempting to seed from the ${recentDumps.length} most recent dumps...`);
    
    for (const dump of recentDumps) {
      if (successCount >= targetCount) break;
      
      const result = await dataFetcher.syncWeeklyData(dump);
      if (result.success && !result.skipped) {
        successCount++;
      }
    }
    
    if (successCount === 0) {
      throw new Error('Failed to seed any data - all recent dumps failed');
    }
    
    console.log(`Initial data seeding completed - successfully seeded ${successCount} weeks`);
  }

  async seedSpecificWeek(dateRange) {
    console.log(`Seeding specific week: ${dateRange}`);
    
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
    
    console.log(`Successfully seeded ${dateRange}`);
  }

  async listAvailableDumps(limit = 20) {
    console.log('Available dumps:');
    
    const dumps = await dataFetcher.getAvailableDumps();
    const sortedDumps = dumps.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    console.log(`\nMost recent ${limit} dumps:`);
    for (const dump of sortedDumps.slice(0, limit)) {
      const dateRange = `${dump.start_date}_${dump.end_date}`;
      const isSeeded = await Match.countDocuments({ week_range: dateRange }) > 0;
      const status = isSeeded ? '✓ seeded' : '○ not seeded';
      console.log(`  ${dateRange} ${status}`);
    }
  }
}

module.exports = new DataSeeder();