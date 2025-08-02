// services/dataFetcher.js - Updated with modern parquet reading
const axios = require('axios');
const Match = require('../models/Match');
const Player = require('../models/Player');

class DataFetcher {
  constructor() {
    this.parquet = null;
    this.arrow = null;
  }

  async initialize() {
    if (this.parquet && this.arrow) return;
    
    console.log('📦 Initializing parquet libraries...');
    try {
      this.parquet = require('parquet-wasm');
      this.arrow = require('apache-arrow');
      console.log('✅ Libraries loaded');
    } catch (error) {
      console.error('❌ Failed to load parquet libraries:', error.message);
      throw new Error('Please install: npm install parquet-wasm apache-arrow');
    }
  }

  async getAvailableDumps() {
    try {
      const { data } = await axios.get('https://aoestats.io/api/db_dumps', {
        timeout: 10000
      });
      return data.db_dumps;
    } catch (error) {
      console.error('Failed to fetch available dumps:', error.message);
      throw error;
    }
  }

  async syncWeeklyData(dump) {
    const dateRange = `${dump.start_date}_${dump.end_date}`;
    console.log(`🔄 Syncing data for ${dateRange}`);
    
    // Check if already seeded
    const existingMatches = await Match.countDocuments({ week_range: dateRange });
    if (existingMatches > 0) {
      console.log(`  • Already seeded (${existingMatches} matches), skipping`);
      return { success: true, skipped: true };
    }

    try {
      await this.initialize();
      
      const matchResult = await this.processMatches(dump, dateRange);
      const playerResult = await this.processPlayers(dump, dateRange);
      
      console.log(`  ✅ Completed ${dateRange} - ${matchResult.count} matches, ${playerResult.count} players`);
      return { 
        success: true, 
        matchCount: matchResult.count,
        playerCount: playerResult.count
      };
    } catch (error) {
      console.error(`  ❌ Failed ${dateRange}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async processMatches(dump, dateRange) {
    const url = `https://aoestats.io${dump.matches_url}`;
    console.log(`  📥 Fetching matches from: ${url}`);
    
    try {
      // Download parquet file
      const { data } = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minute timeout for large files
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percent % 25 === 0) {
              console.log(`    📊 ${percent}% downloaded`);
            }
          }
        }
      });
      
      if (!data || data.byteLength === 0) {
        throw new Error('Empty response received');
      }

      console.log(`  📦 Downloaded ${(data.byteLength / 1024 / 1024).toFixed(2)} MB`);
      
      // Parse with parquet-wasm
      const uint8Array = new Uint8Array(data);
      const wasmTable = this.parquet.readParquet(uint8Array);
      const ipcStream = wasmTable.intoIPCStream();
      const jsTable = this.arrow.tableFromIPC(ipcStream);
      
      console.log(`  📖 Parsed ${jsTable.numRows.toLocaleString()} match records`);
      
      // Convert to JavaScript objects and insert
      const matches = this.convertTableToMatches(jsTable, dateRange);
      
      // Insert in batches
      const batchSize = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        try {
          await Match.insertMany(batch, { ordered: false });
          insertedCount += batch.length;
        } catch (error) {
          // Handle duplicate key errors gracefully
          if (error.code === 11000) {
            console.log(`    ⚠️  Skipped ${batch.length} duplicate matches`);
          } else {
            throw error;
          }
        }
        
        if (i % (batchSize * 5) === 0) {
          console.log(`    💾 Inserted ${insertedCount}/${matches.length} matches`);
        }
      }
      
      console.log(`  ✅ Inserted ${insertedCount} match records`);
      return { count: insertedCount };
      
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Match data not found (404) - dump may be too old or unavailable`);
      }
      if (error.message.includes('invalid parquet') || error.message.includes('parquet version')) {
        throw new Error(`Invalid parquet format - dump may be corrupted`);
      }
      throw error;
    }
  }

  async processPlayers(dump, dateRange) {
    const url = `https://aoestats.io${dump.players_url}`;
    console.log(`  📥 Fetching players from: ${url}`);
    
    try {
      const { data } = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 120000,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percent % 25 === 0) {
              console.log(`    📊 ${percent}% downloaded`);
            }
          }
        }
      });
      
      if (!data || data.byteLength === 0) {
        throw new Error('Empty response received');
      }

      console.log(`  📦 Downloaded ${(data.byteLength / 1024 / 1024).toFixed(2)} MB`);
      
      // Parse with parquet-wasm
      const uint8Array = new Uint8Array(data);
      const wasmTable = this.parquet.readParquet(uint8Array);
      const ipcStream = wasmTable.intoIPCStream();
      const jsTable = this.arrow.tableFromIPC(ipcStream);
      
      console.log(`  📖 Parsed ${jsTable.numRows.toLocaleString()} player records`);
      
      // Convert to JavaScript objects and insert
      const players = this.convertTableToPlayers(jsTable, dateRange);
      
      // Insert in batches
      const batchSize = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < players.length; i += batchSize) {
        const batch = players.slice(i, i + batchSize);
        try {
          await Player.insertMany(batch, { ordered: false });
          insertedCount += batch.length;
        } catch (error) {
          // Handle duplicate key errors gracefully
          if (error.code === 11000) {
            console.log(`    ⚠️  Skipped ${batch.length} duplicate players`);
          } else {
            throw error;
          }
        }
        
        if (i % (batchSize * 5) === 0) {
          console.log(`    💾 Inserted ${insertedCount}/${players.length} players`);
        }
      }
      
      console.log(`  ✅ Inserted ${insertedCount} player records`);
      return { count: insertedCount };
      
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Player data not found (404) - dump may be too old or unavailable`);
      }
      if (error.message.includes('invalid parquet') || error.message.includes('parquet version')) {
        throw new Error(`Invalid parquet format - dump may be corrupted`);
      }
      throw error;
    }
  }

  convertTableToMatches(table, dateRange) {
    const columnNames = table.schema.fields.map(field => field.name);
    const matches = [];
    
    for (let i = 0; i < table.numRows; i++) {
      const match = { week_range: dateRange };
      
      for (const columnName of columnNames) {
        const column = table.getChild(columnName);
        let value = column.get(i);
        
        // Handle BigInt values
        if (typeof value === 'bigint') {
          if (columnName.includes('timestamp')) {
            // Convert nanoseconds to milliseconds, then to Date
            value = new Date(Number(value) / 1000000);
          } else {
            value = Number(value);
          }
        }
        
        // Handle specific field transformations
        if (columnName === 'started_timestamp' && !(value instanceof Date)) {
          value = new Date(value);
        }
        
        // Skip null/undefined values
        if (value !== null && value !== undefined) {
          match[columnName] = value;
        }
      }
      
      matches.push(match);
    }
    
    return matches;
  }

  convertTableToPlayers(table, dateRange) {
    const columnNames = table.schema.fields.map(field => field.name);
    const players = [];
    
    for (let i = 0; i < table.numRows; i++) {
      const player = { week_range: dateRange };
      
      for (const columnName of columnNames) {
        const column = table.getChild(columnName);
        let value = column.get(i);
        
        // Handle BigInt values
        if (typeof value === 'bigint') {
          value = Number(value);
        }
        
        // Skip null/undefined values
        if (value !== null && value !== undefined) {
          player[columnName] = value;
        }
      }
      
      players.push(player);
    }
    
    return players;
  }

  // Utility method to test connection and get sample data
  async testConnection(dateRange = null) {
    try {
      await this.initialize();
      
      const dumps = await this.getAvailableDumps();
      console.log(`✅ Found ${dumps.length} available dumps`);
      
      if (dateRange) {
        const [start, end] = dateRange.split('_');
        const dump = dumps.find(d => d.start_date === start && d.end_date === end);
        
        if (dump) {
          console.log(`✅ Found specific dump: ${dateRange}`);
          return { success: true, dump };
        } else {
          console.log(`❌ Dump not found: ${dateRange}`);
          return { success: false, error: 'Dump not found' };
        }
      }
      
      return { success: true, dumpCount: dumps.length };
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DataFetcher();