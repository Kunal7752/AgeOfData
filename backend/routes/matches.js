const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Player = require('../models/Player');
const cache = require('../middleware/cache');
const { validatePagination, validateGameId } = require('../middleware/validation');

// Get match by game_id
router.get('/:gameId', validateGameId, cache(600), async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get match details
    const match = await Match.findOne({ game_id: gameId }).lean();
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Get all players in this match
    const players = await Player.find({ game_id: gameId })
      .sort({ team: 1, profile_id: 1 })
      .lean();
    
    // Group players by team
    const teams = players.reduce((acc, player) => {
      if (!acc[player.team]) acc[player.team] = [];
      acc[player.team].push(player);
      return acc;
    }, {});
    
    res.json({
      match,
      players,
      teams,
      playerCount: players.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent matches with filters
router.get('/', validatePagination, cache(300), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      map, 
      leaderboard, 
      minElo, 
      maxElo,
      patch,
      gameType,
      playerCount,
      duration
    } = req.query;

    // Build filter
    const filter = {};
    if (map) filter.map = new RegExp(map, 'i');
    if (leaderboard) filter.leaderboard = leaderboard;
    if (patch) filter.patch = parseInt(patch);
    if (gameType) filter.game_type = gameType;
    if (playerCount) filter.num_players = parseInt(playerCount);
    
    if (minElo || maxElo) {
      filter.avg_elo = {};
      if (minElo) filter.avg_elo.$gte = parseInt(minElo);
      if (maxElo) filter.avg_elo.$lte = parseInt(maxElo);
    }
    
    if (duration) {
      const [minDur, maxDur] = duration.split('-').map(d => parseInt(d) * 60); // Convert minutes to seconds
      filter.duration = {};
      if (minDur) filter.duration.$gte = minDur;
      if (maxDur) filter.duration.$lte = maxDur;
    }

    const matches = await Match.find(filter)
      .sort({ started_timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Match.countDocuments(filter);

    res.json({
      matches: matches.map(match => ({
        ...match,
        durationMinutes: Math.round(match.duration / 60),
        startedAt: match.started_timestamp
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMatches: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      appliedFilters: {
        map, leaderboard, minElo, maxElo, patch, gameType, playerCount, duration
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get match statistics
router.get('/stats/overview', cache(1800), async (req, res) => {
  try {
    const { timeframe = 7, leaderboard } = req.query;
    
    // Build time filter
    const timeFilter = {};
    if (timeframe !== 'all') {
      const days = parseInt(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      timeFilter.started_timestamp = { $gte: cutoffDate };
    }
    
    // Build base filter
    const baseFilter = { ...timeFilter };
    if (leaderboard) baseFilter.leaderboard = leaderboard;

    // Parallel queries for efficiency
    const [
      totalMatches,
      avgStats,
      mapDistribution,
      eloDistribution,
      durationStats,
      recentActivity
    ] = await Promise.all([
      // Total matches
      Match.countDocuments(baseFilter),
      
      // Average statistics
      Match.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            avgElo: { $avg: '$avg_elo' },
            avgDuration: { $avg: '$duration' },
            avgPlayers: { $avg: '$num_players' }
          }
        }
      ]),
      
      // Map distribution
      Match.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$map', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // ELO distribution
      Match.aggregate([
        { $match: baseFilter },
        {
          $bucket: {
            groupBy: '$avg_elo',
            boundaries: [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 3000],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      
      // Duration statistics  
      Match.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            minDuration: { $min: '$duration' },
            maxDuration: { $max: '$duration' },
            avgDuration: { $avg: '$duration' }
          }
        }
      ]),
      
      // Recent activity (matches per day)
      Match.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: {
              year: { $year: '$started_timestamp' },
              month: { $month: '$started_timestamp' },
              day: { $dayOfMonth: '$started_timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ])
    ]);

    res.json({
      overview: {
        totalMatches,
        averages: avgStats[0] || { avgElo: 0, avgDuration: 0, avgPlayers: 0 },
        timeframe: timeframe === 'all' ? 'all time' : `last ${timeframe} days`
      },
      distributions: {
        maps: mapDistribution,
        elo: eloDistribution,
        duration: durationStats[0] || { minDuration: 0, maxDuration: 0, avgDuration: 0 }
      },
      activity: recentActivity.map(day => ({
        date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
        matches: day.count
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard statistics
router.get('/stats/leaderboards', cache(3600), async (req, res) => {
  try {
    const leaderboardStats = await Match.aggregate([
      {
        $group: {
          _id: '$leaderboard',
          totalMatches: { $sum: 1 },
          avgElo: { $avg: '$avg_elo' },
          avgDuration: { $avg: '$duration' },
          avgPlayers: { $avg: '$num_players' },
          minElo: { $min: '$avg_elo' },
          maxElo: { $max: '$avg_elo' }
        }
      },
      { $sort: { totalMatches: -1 } }
    ]);

    res.json({
      leaderboards: leaderboardStats.map(lb => ({
        ...lb,
        avgDurationMinutes: Math.round(lb.avgDuration / 60),
        name: lb._id,
        id: lb._id
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search matches
router.get('/search', validatePagination, cache(300), async (req, res) => {
  try {
    const { 
      q, 
      page = 1, 
      limit = 20,
      sortBy = 'started_timestamp',
      sortOrder = 'desc'
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Build search filter
    const searchRegex = new RegExp(q.trim(), 'i');
    const filter = {
      $or: [
        { game_id: searchRegex },
        { map: searchRegex },
        { game_type: searchRegex },
        { leaderboard: searchRegex }
      ]
    };

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortDirection };

    const matches = await Match.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Match.countDocuments(filter);

    res.json({
      query: q,
      matches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMatches: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get matches by date range
router.get('/range/:startDate/:endDate', validatePagination, cache(600), async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const filter = {
      started_timestamp: {
        $gte: start,
        $lte: end
      }
    };

    const matches = await Match.find(filter)
      .sort({ started_timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Match.countDocuments(filter);

    // Calculate daily statistics
    const dailyStats = await Match.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$started_timestamp' },
            month: { $month: '$started_timestamp' },
            day: { $dayOfMonth: '$started_timestamp' }
          },
          count: { $sum: 1 },
          avgElo: { $avg: '$avg_elo' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      dateRange: { startDate, endDate },
      matches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMatches: total
      },
      dailyStats: dailyStats.map(day => ({
        date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`,
        matches: day.count,
        avgElo: Math.round(day.avgElo || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top performing matches
router.get('/top/elo', cache(1800), async (req, res) => {
  try {
    const { limit = 100, leaderboard, timeframe } = req.query;
    
    const filter = {};
    if (leaderboard) filter.leaderboard = leaderboard;
    
    if (timeframe) {
      const days = parseInt(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filter.started_timestamp = { $gte: cutoffDate };
    }

    const topMatches = await Match.find(filter)
      .sort({ avg_elo: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      topMatches: topMatches.map(match => ({
        ...match,
        durationMinutes: Math.round(match.duration / 60)
      })),
      criteria: 'highest average ELO',
      filters: { leaderboard, timeframe }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;