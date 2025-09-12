// server.js - Main application server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const matchRoutes = require('./routes/matches');
const playerRoutes = require('./routes/player');
const statsRoutes = require('./routes/stats');
const { updateRecentRankings } = require('./scripts/update-rankings');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: false
})); // CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'AoE Stats API',
    version: '1.0.0',
    description: 'Age of Empires match and player statistics API',
    endpoints: {
      matches: '/api/matches',
      players: '/api/players',
      stats: '/api/stats'
    },
    documentation: {
      matches: {
        'GET /api/matches': 'Get recent matches with filters',
        'GET /api/matches/:gameId': 'Get specific match details',
        'GET /api/matches/stats/overview': 'Get match statistics overview',
        'GET /api/matches/search': 'Search matches',
        'GET /api/matches/range/:startDate/:endDate': 'Get matches in date range',
        'GET /api/matches/top/elo': 'Get top ELO matches'
      },
      players: {
        'GET /api/players/:profileId': 'Get player profile',
        'GET /api/players/:profileId/matches': 'Get player match history',
        'GET /api/players/rankings/:leaderboard': 'Get player rankings'
      },
      stats: {
        'GET /api/stats/civilizations': 'Civilization statistics',
        'GET /api/stats/maps': 'Map statistics',
        'GET /api/stats/trends': 'Meta trends over time',
        'GET /api/stats/elo-distribution': 'ELO distribution',
        'GET /api/stats/openings': 'Opening build orders analysis',
        'GET /api/stats/patches': 'Patch comparison',
        'GET /api/stats/analytics/performance': 'Performance analytics'
      }
    }
  });
});

// Routes
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.originalUrl,
    availableEndpoints: ['/api/matches', '/api/players', '/api/stats']
  });
});

// Error handling middleware
app.use(errorHandler);

const startBackgroundJobs = () => {
  console.log('🔄 Starting background jobs...');
  
  // Update rankings every 2 hours
  const updateInterval = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  
  // Recurring update every 2 hours
  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled ranking update...');
      await updateRecentRankings();
      console.log('✅ Scheduled ranking update completed');
    } catch (error) {
      console.error('❌ Scheduled ranking update failed:', error.message);
    }
  }, updateInterval);
  
  // Initial update after 5 minutes (give server time to start properly)
  setTimeout(async () => {
    try {
      console.log('🚀 Running initial ranking update...');
      await updateRecentRankings();
      console.log('✅ Initial ranking update completed');
    } catch (error) {
      console.error('❌ Initial ranking update failed:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes delay
  
  console.log('📅 Background jobs scheduled:');
  console.log('   - Initial update: in 5 minutes');
  console.log('   - Recurring updates: every 2 hours');
};

// STEP 4: Modify your app.listen() section
// Find where you have app.listen() and modify it like this:


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {

  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKGROUND_JOBS === 'true') {
    startBackgroundJobs();
    console.log('✅ Background jobs enabled');
  } else {
    console.log('💡 Background jobs disabled.');
    console.log('💡 To enable: set ENABLE_BACKGROUND_JOBS=true or NODE_ENV=production');
  }
  console.log(`
🎮 AoE Stats API Server Started
🚀 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 API Documentation: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/health

📋 Available Endpoints:
   • GET /api/matches - Recent matches with filters
   • GET /api/matches/:gameId - Specific match details  
   • GET /api/players/:profileId - Player profile
   • GET /api/stats/civilizations - Civ statistics
   • GET /api/stats/maps - Map statistics
   • GET /api/stats/trends - Meta trends
   
🛠️  To seed data: npm run seed
🧪 To test: npm run test
  `);
});