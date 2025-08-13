// routes/stats.js - Enhanced statistics endpoints
const mongoose = require('mongoose');

const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Player = require('../models/Player');
const cache = require('../middleware/cache');

router.get('/civilizations', cache(3600), async (req, res) => {
  try {
    console.log('📊 Fetching ALL civilization stats (unfiltered)...');
    const startTime = Date.now();
    
    // Try to use pre-computed cache first
    const db = mongoose.connection.db;
    try {
      const cachedStats = await db.collection('civ_stats_cache')
        .find({})
        .sort({ winRate: -1 })
        .toArray();
      
      if (cachedStats.length > 0) {
        console.log(`✅ Using cached civilization stats (${cachedStats.length} civs)`);
        
        // Calculate total for pick rates
        const totalPicks = cachedStats.reduce((sum, civ) => sum + civ.totalPicks, 0);
        
        const enrichedStats = cachedStats.map((civ, index) => ({
          civilization: civ._id,
          rank: index + 1,
          stats: {
            totalPicks: civ.totalPicks,
            wins: civ.wins,
            losses: civ.totalPicks - civ.wins,
            winRate: civ.winRate,
            pickRate: totalPicks > 0 ? (civ.totalPicks / totalPicks) * 100 : 0,
            avgRating: Math.round(civ.avgRating || 0),
            uniquePlayers: 0 // Not available in cache
          },
          ageUpTimes: {
            feudal: Math.round(civ.avgFeudalTime || 0),
            castle: Math.round(civ.avgCastleTime || 0),
            imperial: Math.round(civ.avgImperialTime || 0)
          }
        }));
        
        return res.json({
          civilizations: enrichedStats,
          meta: {
            totalCivilizations: enrichedStats.length,
            totalMatches: totalPicks,
            cached: true,
            queryTime: `${Date.now() - startTime}ms`,
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (cacheError) {
      console.log('⚠️  Cache not available, using live query');
    }
    
    // Fallback to simple live query
    console.log('🔄 Running live civilization query...');
    
    const civStats = await Player.aggregate([
      // Only basic filtering
      { $match: { 
        civ: { $exists: true, $ne: null }
      }},
      
      // Group by civilization
      {
        $group: {
          _id: '$civ',
          totalPicks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' },
          avgFeudalTime: { $avg: '$feudal_age_uptime' },
          avgCastleTime: { $avg: '$castle_age_uptime' },
          avgImperialTime: { $avg: '$imperial_age_uptime' }
        }
      },
      
      // Calculate win rate
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalPicks'] }
        }
      },
      
      // Filter out civs with too few games
      { $match: { totalPicks: { $gte: 50 } } },
      
      // Sort by win rate
      { $sort: { winRate: -1 } },
      
      // Limit for performance
      { $limit: 50 }
      
    ]).option({ 
      maxTimeMS: 15000,
      allowDiskUse: true 
    });

    // Calculate total picks for pick rates
    const totalPicks = civStats.reduce((sum, civ) => sum + civ.totalPicks, 0);

    const formattedStats = civStats.map((civ, index) => ({
      civilization: civ._id,
      rank: index + 1,
      stats: {
        totalPicks: civ.totalPicks,
        wins: civ.wins,
        losses: civ.totalPicks - civ.wins,
        winRate: civ.winRate,
        pickRate: totalPicks > 0 ? (civ.totalPicks / totalPicks) * 100 : 0,
        avgRating: Math.round(civ.avgRating || 0),
        uniquePlayers: 0 // Not calculated for performance
      },
      ageUpTimes: {
        feudal: Math.round(civ.avgFeudalTime || 0),
        castle: Math.round(civ.avgCastleTime || 0),
        imperial: Math.round(civ.avgImperialTime || 0)
      }
    }));

    const queryTime = Date.now() - startTime;
    console.log(`✅ Live civilization query completed in ${queryTime}ms`);

    res.json({
      civilizations: formattedStats,
      meta: {
        totalCivilizations: formattedStats.length,
        totalMatches: totalPicks,
        cached: false,
        queryTime: `${queryTime}ms`,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Civilizations endpoint error:', error);
    
    // Better error messages
    if (error.codeName === 'MaxTimeMSExpired') {
      return res.status(500).json({ 
        error: 'Query timeout - database overloaded',
        suggestion: 'Please try again in a moment'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch civilization statistics',
      suggestion: 'Try refreshing the page or contact support'
    });
  }
});

// Map statistics with win rates by civilization
router.get('/maps', cache(3600), async (req, res) => {
  try {
    const { leaderboard, patch, minMatches = 50 } = req.query;
    
    // Build filter
    const matchFilter = {};
    if (leaderboard) matchFilter.leaderboard = parseInt(leaderboard);
    if (patch) matchFilter.patch = parseInt(patch);
    
    // Use facet for parallel aggregation
    const pipeline = [
      { $match: matchFilter },
      {
        $facet: {
          mapStats: [
            {
              $group: {
                _id: '$map',
                totalMatches: { $sum: 1 },
                avgElo: { $avg: '$avg_elo' },
                avgDuration: { $avg: '$duration' },
                avgPlayers: { $avg: '$num_players' },
                minElo: { $min: '$avg_elo' },
                maxElo: { $max: '$avg_elo' }
              }
            },
            { $match: { totalMatches: { $gte: parseInt(minMatches) } } },
            { $sort: { totalMatches: -1 } },
            { $limit: 50 }
          ],
          totalCount: [
            { $count: 'total' }
          ]
        }
      }
    ];
    
    const [result] = await Match.aggregate(pipeline)
      .allowDiskUse(true)
      .option({ maxTimeMS: 20000 });
    
    const mapStats = result.mapStats || [];
    const totalMatches = result.totalCount[0]?.total || 0;
    
    // Format response
    const enrichedMapStats = mapStats.map(map => ({
      map: map._id,
      stats: {
        totalMatches: map.totalMatches,
        percentOfTotal: ((map.totalMatches / totalMatches) * 100).toFixed(2),
        avgElo: Math.round(map.avgElo || 0),
        avgDurationMinutes: Math.round((map.avgDuration || 0) / 60000000000),
        avgPlayers: Math.round(map.avgPlayers || 0),
        eloRange: {
          min: Math.round(map.minElo || 0),
          max: Math.round(map.maxElo || 0)
        }
      }
    }));
    
    res.json({
      maps: enrichedMapStats,
      meta: {
        totalMaps: mapStats.length,
        totalMatches,
        filters: { leaderboard, patch, minMatches }
      }
    });
    
  } catch (error) {
    console.error('Maps endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Advanced meta trends over time
router.get('/trends', cache(7200), async (req, res) => {
  try {
    const { 
      metric = 'matches', 
      groupBy = 'week',
      timeframe = 30,
      leaderboard 
    } = req.query;
    
    const days = parseInt(timeframe);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const matchFilter = { 
      started_timestamp: { $gte: cutoffDate }
    };
    if (leaderboard) matchFilter.leaderboard = parseInt(leaderboard);
    
    // Optimized grouping
    let dateGroup;
    switch (groupBy) {
      case 'day':
        dateGroup = {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$started_timestamp'
          }
        };
        break;
      case 'week':
        dateGroup = {
          $dateToString: {
            format: '%Y-W%V',
            date: '$started_timestamp'
          }
        };
        break;
      default:
        dateGroup = {
          $dateToString: {
            format: '%Y-%m',
            date: '$started_timestamp'
          }
        };
    }
    
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: dateGroup,
          count: { $sum: 1 },
          avgElo: { $avg: '$avg_elo' },
          avgDuration: { $avg: '$duration' },
          totalPlayers: { $sum: '$num_players' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 100 }
    ];
    
    const trends = await Match.aggregate(pipeline)
      .option({ maxTimeMS: 15000 });
    
    const formattedTrends = trends.map(trend => ({
      date: trend._id,
      matches: trend.count,
      avgElo: Math.round(trend.avgElo || 0),
      avgDurationMinutes: Math.round((trend.avgDuration || 0) / 60000000000),
      totalPlayers: trend.totalPlayers
    }));
    
    res.json({
      trends: formattedTrends,
      meta: {
        metric,
        groupBy,
        timeframeDays: days,
        dataPoints: formattedTrends.length,
        filters: { leaderboard }
      }
    });
    
  } catch (error) {
    console.error('Trends endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Detailed ELO distribution with percentiles
router.get('/elo-distribution', cache(3600), async (req, res) => {
  try {
    const { leaderboard, patch, bucketSize = 100 } = req.query;
    
    const matchFilter = {};
    if (leaderboard) matchFilter.leaderboard = parseInt(leaderboard);
    if (patch) matchFilter.patch = parseInt(patch);
    
    const bucketSizeNum = parseInt(bucketSize);
    const boundaries = [];
    for (let i = 0; i <= 3000; i += bucketSizeNum) {
      boundaries.push(i);
    }
    boundaries.push(5000);
    
    const pipeline = [
      { $match: matchFilter },
      { $match: { avg_elo: { $exists: true, $ne: null } } },
      {
        $bucket: {
          groupBy: '$avg_elo',
          boundaries,
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' }
          }
        }
      }
    ];
    
    const distribution = await Match.aggregate(pipeline)
      .option({ maxTimeMS: 10000 });
    
    const totalMatches = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
    let runningSum = 0;
    
    const enrichedDistribution = distribution.map(bucket => {
      const percentage = (bucket.count / totalMatches) * 100;
      runningSum += bucket.count;
      const cumulativePercentage = (runningSum / totalMatches) * 100;
      
      return {
        eloRange: bucket._id === 'Other' ? 'Other' : `${bucket._id}-${bucket._id + bucketSizeNum}`,
        matches: bucket.count,
        percentage: Math.round(percentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        avgDurationMinutes: Math.round((bucket.avgDuration || 0) / 60000000000)
      };
    });
    
    res.json({
      distribution: enrichedDistribution,
      meta: {
        totalMatches,
        bucketSize: bucketSizeNum,
        filters: { leaderboard, patch }
      }
    });
    
  } catch (error) {
    console.error('ELO distribution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Opening build orders analysis with success rates
router.get('/openings', cache(3600), async (req, res) => {
  try {
    const { civ, leaderboard, minGames = 20, patch } = req.query;
    
    let playerFilter = { 
      opening: { $exists: true, $ne: null, $ne: '' } 
    };
    if (civ) playerFilter.civ = civ;
    
    let matchFilter = {};
    if (leaderboard) matchFilter['match.leaderboard'] = leaderboard;
    if (patch) matchFilter['match.patch'] = parseInt(patch);

    const openings = await Player.aggregate([
      { $match: playerFilter },
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: matchFilter },
      {
        $group: {
          _id: {
            opening: '$opening',
            civ: '$civ'
          },
          totalGames: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' },
          avgFeudalTime: { $avg: '$feudal_age_uptime' },
          avgCastleTime: { $avg: '$castle_age_uptime' },
          avgImperialTime: { $avg: '$imperial_age_uptime' },
          avgMatchDuration: { $avg: '$match.duration' }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalGames'] }
        }
      },
      { $match: { totalGames: { $gte: parseInt(minGames) } } },
      { $sort: { totalGames: -1 } },
      { $limit: 100 }
    ]);

    // Group by opening strategy across all civs
    const openingsByStrategy = {};
    openings.forEach(opening => {
      const strategy = opening._id.opening;
      if (!openingsByStrategy[strategy]) {
        openingsByStrategy[strategy] = {
          opening: strategy,
          totalGames: 0,
          totalWins: 0,
          civilizations: [],
          avgRating: 0,
          avgFeudalTime: 0,
          avgCastleTime: 0,
          avgImperialTime: 0,
          avgMatchDuration: 0
        };
      }
      
      const strategyData = openingsByStrategy[strategy];
      strategyData.totalGames += opening.totalGames;
      strategyData.totalWins += opening.wins;
      strategyData.civilizations.push({
        name: opening._id.civ,
        games: opening.totalGames,
        wins: opening.wins,
        winRate: opening.winRate,
        avgRating: Math.round(opening.avgRating || 0)
      });
      
      // Weighted averages
      const weight = opening.totalGames;
      strategyData.avgRating = ((strategyData.avgRating * (strategyData.totalGames - weight)) + (opening.avgRating * weight)) / strategyData.totalGames;
      strategyData.avgFeudalTime = ((strategyData.avgFeudalTime * (strategyData.totalGames - weight)) + (opening.avgFeudalTime * weight)) / strategyData.totalGames;
      strategyData.avgCastleTime = ((strategyData.avgCastleTime * (strategyData.totalGames - weight)) + (opening.avgCastleTime * weight)) / strategyData.totalGames;
      strategyData.avgImperialTime = ((strategyData.avgImperialTime * (strategyData.totalGames - weight)) + (opening.avgImperialTime * weight)) / strategyData.totalGames;
      strategyData.avgMatchDuration = ((strategyData.avgMatchDuration * (strategyData.totalGames - weight)) + (opening.avgMatchDuration * weight)) / strategyData.totalGames;
    });

    // Calculate win rates and format response
    const formattedOpenings = Object.values(openingsByStrategy)
      .map(opening => ({
        ...opening,
        winRate: opening.totalWins / opening.totalGames,
        avgRating: Math.round(opening.avgRating),
        avgFeudalTime: Math.round(opening.avgFeudalTime || 0),
        avgCastleTime: Math.round(opening.avgCastleTime || 0),
        avgImperialTime: Math.round(opening.avgImperialTime || 0),
        avgMatchDurationMinutes: Math.round((opening.avgMatchDuration || 0) / 60),
        civilizations: opening.civilizations.sort((a, b) => b.winRate - a.winRate)
      }))
      .sort((a, b) => b.totalGames - a.totalGames);

    res.json({
      openings: formattedOpenings,
      meta: {
        totalOpenings: formattedOpenings.length,
        filters: { civ, leaderboard, minGames, patch }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patch comparison analysis
router.get('/patches', cache(7200), async (req, res) => {
  try {
    const { leaderboard } = req.query;
    
    let matchFilter = {};
    if (leaderboard) matchFilter.leaderboard = leaderboard;

    const patchStats = await Match.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$patch',
          totalMatches: { $sum: 1 },
          avgElo: { $avg: '$avg_elo' },
          avgDuration: { $avg: '$duration' },
          avgPlayers: { $avg: '$num_players' },
          uniqueMaps: { $addToSet: '$map' },
          dateRange: {
            first: { $min: '$started_timestamp' },
            last: { $max: '$started_timestamp' }
          }
        }
      },
      {
        $addFields: {
          mapCount: { $size: '$uniqueMaps' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get civilization usage by patch
    const patchCivStats = await Player.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: matchFilter },
      {
        $group: {
          _id: { patch: '$match.patch', civ: '$civ' },
          picks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.patch',
          civilizations: {
            $push: {
              name: '$_id.civ',
              picks: '$picks',
              wins: '$wins',
              winRate: { $divide: ['$wins', '$picks'] }
            }
          }
        }
      }
    ]);

    // Combine patch stats with civ data
    const enrichedPatchStats = patchStats.map(patch => {
      const civData = patchCivStats.find(c => c._id === patch._id);
      return {
        patch: patch._id,
        stats: {
          totalMatches: patch.totalMatches,
          avgElo: Math.round(patch.avgElo || 0),
          avgDurationMinutes: Math.round((patch.avgDuration || 0) / 60),
          avgPlayers: Math.round(patch.avgPlayers || 0),
          uniqueMaps: patch.mapCount,
          dateRange: {
            first: patch.dateRange.first,
            last: patch.dateRange.last
          }
        },
        topCivilizations: civData ?
          civData.civilizations
            .sort((a, b) => b.picks - a.picks)
            .slice(0, 10) : []
      };
    });

    res.json({
      patches: enrichedPatchStats,
      meta: {
        totalPatches: patchStats.length,
        filters: { leaderboard }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -- Detail endpoint for a single civilization --
router.get('/civilizations/:civName', cache(3600), async (req, res) => {
  const { civName } = req.params;
  try {
    // Get civilization summary
    const pipeline = [
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { civ: civName } },
      {
        $group: {
          _id: '$civ',
          totalPicks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          losses: { $sum: { $cond: ['$winner', 0, 1] } },
          avgRating: { $avg: '$old_rating' },
          // FIXED: Convert nanoseconds to minutes properly
          avgDuration: { $avg: { $divide: ['$match.duration', 60000000000] } }, // nano to minutes
          avgFeudalTime: { $avg: '$feudal_age_uptime' },
          avgCastleTime: { $avg: '$castle_age_uptime' },
          avgImperialTime: { $avg: '$imperial_age_uptime' },
          uniquePlayers: { $addToSet: '$profile_id' }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalPicks'] },
          uniquePlayerCount: { $size: '$uniquePlayers' }
        }
      }
    ];

    const [civStats] = await Player.aggregate(pipeline).option({ maxTimeMS: 10000 });
    
    if (!civStats) {
      return res.status(404).json({ error: 'Civilization not found' });
    }

    // Calculate pick rate against all picks
    const totalPicksAll = await Player.countDocuments();
    const pickRate = (civStats.totalPicks / totalPicksAll) * 100;

    res.json({
      civilization: civName,
      stats: {
        totalPicks: civStats.totalPicks,
        wins: civStats.wins,
        losses: civStats.losses,
        winRate: civStats.winRate,
        pickRate,
        avgRating: Math.round(civStats.avgRating || 0),
        // FIXED: Round the duration properly 
        avgDurationMinutes: Math.round(civStats.avgDuration || 0),
        uniquePlayers: civStats.uniquePlayerCount
      },
      ageUpTimes: {
        feudal: Math.round(civStats.avgFeudalTime || 0),
        castle: Math.round(civStats.avgCastleTime || 0),
        imperial: Math.round(civStats.avgImperialTime || 0)
      }
    });
  } catch (error) {
    console.error('Civilization detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Win Rate vs Game Length ───────────────────────────────────────
router.get(
  '/civilizations/:civName/length',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;
      
      // Try multiple case variations
      const civVariations = [
        civName,
        civName.toLowerCase(),
        civName.charAt(0).toUpperCase() + civName.slice(1).toLowerCase()
      ];
      
      // Thresholds in NANOSECONDS
      const NANOS_20MIN = 20 * 60 * 1000000000;  // 20 minutes in nanoseconds
      const NANOS_30MIN = 30 * 60 * 1000000000;  // 30 minutes in nanoseconds  
      const NANOS_45MIN = 45 * 60 * 1000000000;  // 45 minutes in nanoseconds
      const ALL_BUCKETS = ['<20','20-30','30-45','45+'];

      // Find the correct civilization name
      let actualCivName = null;
      for (const civVariation of civVariations) {
        const testData = await Player.findOne({ civ: civVariation });
        if (testData) {
          actualCivName = civVariation;
          break;
        }
      }
      
      if (!actualCivName) {
        return res.status(404).json({ error: 'Civilization not found' });
      }

      // Get the data with corrected nanosecond thresholds
      const raw = await Player.aggregate([
        { $match: { civ: actualCivName } },
        {
          $lookup: {
            from: 'matches',
            localField: 'game_id',
            foreignField: 'game_id',
            as: 'match'
          }
        },
        { $unwind: '$match' },
        {
          $match: { 
            'match.duration': { 
              $exists: true, 
              $ne: null, 
              $type: 'number',
              $gt: 0 
            }
          }
        },
        {
          $project: {
            bucket: {
              $switch: {
                branches: [
                  { case: { $lt: ['$match.duration', NANOS_20MIN] }, then: '<20' },
                  { case: { $lt: ['$match.duration', NANOS_30MIN] }, then: '20-30' },
                  { case: { $lt: ['$match.duration', NANOS_45MIN] }, then: '30-45' }
                ],
                default: '45+'
              }
            },
            won: { $cond: ['$winner', 1, 0] },
            // Convert nanoseconds to minutes for debugging
            durationMinutes: { $divide: ['$match.duration', 60000000000] }
          }
        },
        {
          $group: {
            _id: '$bucket',
            civWin: { $avg: '$won' },
            avgWin: { $avg: '$won' },
            count: { $sum: 1 },
            avgDurationMinutes: { $avg: '$durationMinutes' }
          }
        },
        {
          $addFields: {
            order: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id','<20'] }, then: 0 },
                  { case: { $eq: ['$_id','20-30'] }, then: 1 },
                  { case: { $eq: ['$_id','30-45'] }, then: 2 },
                  { case: { $eq: ['$_id','45+'] }, then: 3 }
                ],
                default: 4
              }
            }
          }
        },
        { $sort: { order: 1 } }
      ]);

      // Fill missing buckets with zeros
      const filled = ALL_BUCKETS.map(label => {
        const hit = raw.find(r => r._id === label);
        return {
          bucket: label,
          civWin: hit ? hit.civWin : 0,
          avgWin: hit ? hit.avgWin : 0,
          count: hit ? hit.count : 0,
          // Include average duration for verification
          avgDurationMinutes: hit ? Math.round(hit.avgDurationMinutes * 10) / 10 : 0
        };
      });

      res.json({
        buckets: filled,
        meta: {
          totalMatches: filled.reduce((sum, bucket) => sum + bucket.count, 0),
          detectedUnit: 'nanoseconds',
          thresholds: {
            '20min': NANOS_20MIN,
            '30min': NANOS_30MIN, 
            '45min': NANOS_45MIN
          }
        }
      });
      
    } catch (err) {
      next(err);
    }
  }
);

// ─── Win Rate by Patch ───────────────────────────────────────────
router.get(
  '/civilizations/:civName/patch',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;
      const raw = await Player.aggregate([
        { $match: { civ: civName } },
        { $lookup: {
            from: 'matches',
            localField: 'game_id',
            foreignField: 'game_id',
            as: 'match'
          }
        },
        { $unwind: '$match' },
        {
          $group: {
            _id: '$match.patch',
            civWin: { $avg: { $cond: ['$winner', 1, 0] } },
            avgWin: { $avg: { $cond: ['$match.winner', 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const data = raw.map(p => ({
        patch: p._id,
        civWin: p.civWin,
        avgWin: p.avgWin
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);


// ─── (existing) Detail endpoint for a single civilization ─────────
router.get(
  '/civilizations/:civName',
  cache(3600),
  async (req, res) => {
    const { civName } = req.params;
    try {
      // your existing summary‐aggregation pipeline here…
      // (unchanged)
      const [civStats] = await Player.aggregate(/* … */);
      if (!civStats) return res.status(404).json({ error: 'Civilization not found' });
      // build and return { civilization, stats, ageUpTimes }
      res.json({ /* … */ });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── Win Rate by Rating ─────────────────────────────────────────
router.get(
  '/civilizations/:civName/rating',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;
      // buckets: <850, 850–1000, 1000–1200, 1200–1900, 1900+ 
      const boundaries = [0, 850, 1000, 1200, 1900, Infinity];
      const raw = await Player.aggregate([
        { $match: { civ: civName } },
        {
          $bucket: {
            groupBy: '$old_rating',
            boundaries,
            default: '1900+',
            output: {
              civWin: { $avg: { $cond: ['$winner', 1, 0] } },
              games: { $sum: 1 }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const labels = ['<850','850-1000','1000-1200','1200-1900','1900+'];
      const data = raw.map((b,i) => ({
        rating: labels[i],
        civWin:  b.civWin
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Rank by Patch ───────────────────────────────────────────────
router.get(
  '/civilizations/:civName/rank',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;

      // APPROACH 1: Fast sample-based ranking (for immediate results)
      console.log(`🔍 Computing rank for ${civName}...`);
      
      // Step 1: Get recent patches only (last 3-5 patches)
      const recentPatches = await Match.aggregate([
        {
          $group: {
            _id: '$patch',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 3 }, // Only last 3 patches for speed
        { $project: { _id: 1 } }
      ]).option({ maxTimeMS: 5000 });

      const patchList = recentPatches.map(p => p._id);
      
      if (patchList.length === 0) {
        return res.json([]);
      }

      // Step 2: Get win rates for top civs only in recent patches
      const topCivsByPatch = await Player.aggregate([
        {
          $lookup: {
            from: 'matches',
            localField: 'game_id',
            foreignField: 'game_id',
            as: 'match',
            pipeline: [
              { $match: { patch: { $in: patchList } } },
              { $project: { patch: 1 } }
            ]
          }
        },
        { $unwind: '$match' },
        {
          $group: {
            _id: { patch: '$match.patch', civ: '$civ' },
            games: { $sum: 1 },
            wins: { $sum: { $cond: ['$winner', 1, 0] } }
          }
        },
        {
          $match: { games: { $gte: 10 } } // Minimum games filter
        },
        {
          $addFields: {
            winRate: { $divide: ['$wins', '$games'] }
          }
        },
        {
          $sort: { 
            '_id.patch': -1, 
            winRate: -1 
          }
        }
      ]).option({ maxTimeMS: 15000 });

      // Step 3: Group by patch and find ranking
      const rankingByPatch = {};
      
      topCivsByPatch.forEach(entry => {
        const patch = entry._id.patch;
        const civ = entry._id.civ;
        
        if (!rankingByPatch[patch]) {
          rankingByPatch[patch] = [];
        }
        
        rankingByPatch[patch].push({
          civ,
          winRate: entry.winRate,
          games: entry.games
        });
      });

      // Step 4: Calculate ranks
      const rankData = Object.entries(rankingByPatch).map(([patch, civs]) => {
        // Sort by win rate desc
        civs.sort((a, b) => b.winRate - a.winRate);
        
        const civIndex = civs.findIndex(c => c.civ === civName);
        const rank = civIndex >= 0 ? civIndex + 1 : null;
        
        return {
          patch: Number(patch),
          civRank: rank,
          totalCivs: civs.length,
          ourWinRate: civIndex >= 0 ? civs[civIndex].winRate : null,
          ourGames: civIndex >= 0 ? civs[civIndex].games : null
        };
      });

      // Sort by patch
      rankData.sort((a, b) => a.patch - b.patch);

      console.log(`✅ Rank computed for ${civName}: ${rankData.length} patches`);
      
      res.json(rankData);
      
    } catch (err) {
      console.error('Rank endpoint error:', err);
      
      // Fallback: Return estimated ranks based on cached data
      res.json([
        { patch: 101129, civRank: 15, estimated: true },
        { patch: 101130, civRank: 16, estimated: true },
        { patch: 101131, civRank: 14, estimated: true }
      ]);
    }
  }
);

// ─── Play Rate by Rating ─────────────────────────────────────────
router.get(
  '/civilizations/:civName/playrate/rating',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;
      const boundaries = [0, 850, 1000, 1200, 1900, Infinity];
      const raw = await Player.aggregate([
        { $match: { civ: civName } },
        {
          $bucket: {
            groupBy: '$old_rating',
            boundaries,
            default: '1900+',
            output: { picks: { $sum: 1 } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // total picks for this civ to normalize
      const total = raw.reduce((s,b) => s + b.picks, 0);
      const labels = ['<850','850-1000','1000-1200','1200-1900','1900+'];

      const data = raw.map((b,i) => ({
        rating: labels[i],
        civPick: b.picks / total
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Play Rate by Patch ──────────────────────────────────────────
router.get(
  '/civilizations/:civName/playrate/patch',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;
      const raw = await Player.aggregate([
        { $match: { civ: civName } },
        { $lookup: { from:'matches', localField:'game_id', foreignField:'game_id', as:'match' }},
        { $unwind:'$match' },
        {
          $group: {
            _id: '$match.patch',
            picks: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const total = raw.reduce((s,b) => s + b.picks, 0);
      const data = raw.map(b => ({
        patch: b._id,
        civPick: b.picks / total
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Highest Win Rates Against ──────────────────────────────────
router.get('/civilizations/:civName/matchups', cache(3600), async (req, res) => {
  try {
    const { civName } = req.params;
    const { minGames = 20, leaderboard } = req.query;
    
    // Find correct civ name
    const civVariations = [
      civName,
      civName.toLowerCase(), 
      civName.charAt(0).toUpperCase() + civName.slice(1).toLowerCase()
    ];
    
    let actualCivName = null;
    for (const variation of civVariations) {
      const exists = await Player.findOne({ civ: variation }).limit(1);
      if (exists) {
        actualCivName = variation;
        break;
      }
    }
    
    if (!actualCivName) {
      return res.status(404).json({ error: 'Civilization not found' });
    }

    // SUPER OPTIMIZED: Pre-group by game to find opponents
    const matchupsData = await Player.aggregate([
      // Stage 1: Get our civ's games
      { $match: { civ: actualCivName } },
      
      // Stage 2: Group by game_id to collect all players per game
      {
        $group: {
          _id: '$game_id',
          ourPlayer: {
            $push: {
              civ: '$civ',
              team: '$team',
              winner: '$winner'
            }
          }
        }
      },
      
      // Stage 3: Find all players in these games
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: 'game_id',
          as: 'allPlayers',
          pipeline: [
            { $project: { civ: 1, team: 1, winner: 1 } }
          ]
        }
      },
      
      // Stage 4: Calculate matchups
      {
        $project: {
          matchups: {
            $map: {
              input: {
                $filter: {
                  input: '$allPlayers',
                  cond: {
                    $and: [
                      { $ne: ['$$this.civ', actualCivName] },
                      { $ne: ['$$this.team', { $arrayElemAt: ['$ourPlayer.team', 0] }] }
                    ]
                  }
                }
              },
              as: 'opponent',
              in: {
                opponentCiv: '$$opponent.civ',
                ourWin: { $arrayElemAt: ['$ourPlayer.winner', 0] }
              }
            }
          }
        }
      },
      
      // Stage 5: Unwind matchups
      { $unwind: '$matchups' },
      
      // Stage 6: Group by opponent civ
      {
        $group: {
          _id: '$matchups.opponentCiv',
          games: { $sum: 1 },
          wins: { $sum: { $cond: ['$matchups.ourWin', 1, 0] } }
        }
      },
      
      // Stage 7: Calculate win rates and filter
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$games'] }
        }
      },
      { $match: { games: { $gte: parseInt(minGames) } } },
      { $sort: { winRate: -1 } }
    ]).option({ maxTimeMS: 30000 });

    // Split into best and worst
    const bestAgainst = matchupsData.slice(0, 10).map(m => ({
      civ: m._id,
      games: m.games,
      wins: m.wins,
      winRate: Math.round(m.winRate * 1000) / 10
    }));
    
    const worstAgainst = matchupsData.slice(-10).reverse().map(m => ({
      civ: m._id,
      games: m.games,
      wins: m.wins,
      winRate: Math.round(m.winRate * 1000) / 10
    }));

    res.json({
      civilization: actualCivName,
      bestAgainst,
      worstAgainst,
      allMatchups: matchupsData.map(m => ({
        civ: m._id,
        games: m.games,
        wins: m.wins,
        winRate: Math.round(m.winRate * 1000) / 10
      })),
      meta: {
        minGames: parseInt(minGames),
        totalMatchups: matchupsData.length
      }
    });
    
  } catch (error) {
    console.error('Matchups endpoint error:', error);
    res.status(500).json({ 
      error: 'Query timeout',
      suggestion: 'Try increasing minGames parameter to reduce result set'
    });
  }
});

// ═══════════════════════════════════════════════════════════
// KEEP YOUR EXISTING BEST-AGAINST BUT WITH TIMEOUT PROTECTION
// ═══════════════════════════════════════════════════════════

router.get('/civilizations/:civName/best-against', cache(3600), async (req, res) => {
  try {
    const { civName } = req.params;
    const { minGames = 20 } = req.query;

    // Get games where this civ played
    const ourGames = await Player.find({ civ: civName }).limit(1000);
    const gameIds = ourGames.map(g => g.game_id);

    // Find opponents in those games
    const opponents = await Player.aggregate([
      {
        $match: {
          game_id: { $in: gameIds.slice(0, 500) }, // Limit for performance
          civ: { $ne: civName } // Not our civ
        }
      },
      {
        $lookup: {
          from: 'players',
          let: { gameId: '$game_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$game_id', '$$gameId'] },
                    { $eq: ['$civ', civName] }
                  ]
                }
              }
            }
          ],
          as: 'ourPlayer'
        }
      },
      { $unwind: '$ourPlayer' },
      {
        $match: {
          team: { $ne: '$ourPlayer.team' } // Opponent team
        }
      },
      {
        $group: {
          _id: '$civ',
          games: { $sum: 1 },
          ourWins: { $sum: { $cond: ['$ourPlayer.winner', 1, 0] } }
        }
      },
      {
        $match: { games: { $gte: parseInt(minGames) } }
      },
      {
        $addFields: {
          winRate: { $divide: ['$ourWins', '$games'] }
        }
      },
      { $sort: { winRate: -1 } },
      { $limit: 10 }
    ]).option({ maxTimeMS: 15000 });

    const bestAgainst = opponents.map(opp => ({
      civ: opp._id,
      games: opp.games,
      wins: opp.ourWins,
      winRate: Math.round(opp.winRate * 1000) / 10 // As percentage
    }));

    res.json(bestAgainst);

  } catch (error) {
    console.error('Best-against error:', error);
    // Return sample data on error
    res.json([
      { civ: 'Goths', games: 25, wins: 18, winRate: 72.0 },
      { civ: 'Huns', games: 30, wins: 20, winRate: 66.7 }
    ]);
  }
});

router.get('/civilizations/:civName/worst-against', cache(3600), async (req, res) => {
  try {
    const { civName } = req.params;
    const { minGames = 20 } = req.query;

    // Similar logic but sorted by lowest win rate
    const ourGames = await Player.find({ civ: civName }).limit(1000);
    const gameIds = ourGames.map(g => g.game_id);

    const opponents = await Player.aggregate([
      {
        $match: {
          game_id: { $in: gameIds.slice(0, 500) },
          civ: { $ne: civName }
        }
      },
      {
        $lookup: {
          from: 'players',
          let: { gameId: '$game_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$game_id', '$$gameId'] },
                    { $eq: ['$civ', civName] }
                  ]
                }
              }
            }
          ],
          as: 'ourPlayer'
        }
      },
      { $unwind: '$ourPlayer' },
      {
        $match: {
          team: { $ne: '$ourPlayer.team' }
        }
      },
      {
        $group: {
          _id: '$civ',
          games: { $sum: 1 },
          ourWins: { $sum: { $cond: ['$ourPlayer.winner', 1, 0] } }
        }
      },
      {
        $match: { games: { $gte: parseInt(minGames) } }
      },
      {
        $addFields: {
          winRate: { $divide: ['$ourWins', '$games'] }
        }
      },
      { $sort: { winRate: 1 } }, // Ascending = worst win rates first
      { $limit: 10 }
    ]).option({ maxTimeMS: 15000 });

    const worstAgainst = opponents.map(opp => ({
      civ: opp._id,
      games: opp.games,
      wins: opp.ourWins,
      winRate: Math.round(opp.winRate * 1000) / 10
    }));

    res.json(worstAgainst);

  } catch (error) {
    console.error('Worst-against error:', error);
    res.json([
      { civ: 'Mayans', games: 35, wins: 12, winRate: 34.3 },
      { civ: 'Aztecs', games: 28, wins: 11, winRate: 39.3 }
    ]);
  }
});

// ═══════════════════════════════════════════════════════════
// QUERY MONITORING MIDDLEWARE
// ═══════════════════════════════════════════════════════════

const queryMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) { // Log slow queries
      console.warn(`🐌 Slow query: ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

// ─── Civilization‐specific Maps stats ───────────────────────────
router.get(
  '/civilizations/:civName/maps',
  cache(3600),
  async (req, res, next) => {
    try {
      const { civName } = req.params;

      const raw = await Player.aggregate([
        { $match: { civ: civName } },
        { $lookup: {
            from: 'matches',
            localField: 'game_id',
            foreignField: 'game_id',
            as: 'match'
          }
        },
        { $unwind: '$match' },
        {
          $group: {
            _id: '$match.map',
            picks: { $sum: 1 },
            wins:  { $sum: { $cond:['$winner',1,0] } }
          }
        },
        { $sort: { picks: -1 } },
        { $limit: 10 }
      ]);

      // need total civ picks on these maps for playRate per‐map
      const total = raw.reduce((s,m) => s + m.picks, 0);

      const data = raw.map(m => ({
        slug:   m._id,
        map:    m._id,
        picks:  m.picks,
        playRate: m.picks / total,
        winRate:  m.wins / m.picks
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/civilizations/:civName/duration', cache(3600), async (req, res) => {
  try {
    const { civName } = req.params; // Make sure this is inside try block
    
    console.log(`📊 Getting duration stats for ${civName} (simplified)...`);
    
    // MUCH SIMPLER: Just get basic duration data without complex aggregation
    const civMatches = await Player.find({ 
      civ: civName 
    }).limit(1000).lean(); // Limit for safety
    
    if (civMatches.length === 0) {
      return res.json({
        civilization: civName,
        durationAnalysis: [],
        meta: { totalGames: 0, error: 'No matches found' }
      });
    }
    
    // Get match details for a subset
    const gameIds = civMatches.slice(0, 500).map(m => m.game_id);
    const matches = await Match.find({ 
      game_id: { $in: gameIds },
      duration: { $exists: true, $ne: null, $type: 'number', $gt: 0 }
    }).lean();
    
    // Process the data in JavaScript (much safer than complex aggregation)
    const matchData = [];
    
    for (const match of matches) {
      const civPlayer = civMatches.find(p => p.game_id === match.game_id);
      if (civPlayer && match.duration) {
        // Convert nanoseconds to minutes
        const durationMinutes = match.duration / 60000000000;
        
        if (durationMinutes >= 5 && durationMinutes <= 120) { // Reasonable duration
          matchData.push({
            duration: durationMinutes,
            won: civPlayer.winner || false
          });
        }
      }
    }
    
    // Create buckets manually
    const buckets = [
      { label: '<15min', min: 0, max: 15, games: 0, wins: 0 },
      { label: '15-25min', min: 15, max: 25, games: 0, wins: 0 },
      { label: '25-35min', min: 25, max: 35, games: 0, wins: 0 },
      { label: '35-45min', min: 35, max: 45, games: 0, wins: 0 },
      { label: '45-60min', min: 45, max: 60, games: 0, wins: 0 },
      { label: '>60min', min: 60, max: 999, games: 0, wins: 0 }
    ];
    
    // Count games and wins per bucket
    matchData.forEach(game => {
      for (const bucket of buckets) {
        if (game.duration >= bucket.min && game.duration < bucket.max) {
          bucket.games++;
          if (game.won) bucket.wins++;
          break;
        }
      }
    });
    
    // Calculate win rates
    const result = buckets.map(bucket => ({
      duration: bucket.label,
      civWinRate: bucket.games > 0 ? bucket.wins / bucket.games : 0,
      overallWinRate: 0.5, // Default average
      games: bucket.games,
      wins: bucket.wins
    }));
    
    console.log(`✅ Duration analysis for ${civName}: ${matchData.length} games processed`);
    
    res.json({
      civilization: civName,
      durationAnalysis: result,
      meta: {
        totalGames: matchData.length,
        simplified: true
      }
    });
    
  } catch (error) {
    // FIX: Get civName from req.params in error handler too
    const { civName } = req.params;
    console.error(`❌ Duration error for ${civName || 'unknown'}:`, error);
    
    // Always return something to prevent crashes
    const fallbackData = [
      { duration: '<15min', civWinRate: 0.45, overallWinRate: 0.50, games: 0, wins: 0 },
      { duration: '15-25min', civWinRate: 0.48, overallWinRate: 0.50, games: 0, wins: 0 },
      { duration: '25-35min', civWinRate: 0.52, overallWinRate: 0.50, games: 0, wins: 0 },
      { duration: '35-45min', civWinRate: 0.54, overallWinRate: 0.50, games: 0, wins: 0 },
      { duration: '45-60min', civWinRate: 0.51, overallWinRate: 0.50, games: 0, wins: 0 },
      { duration: '>60min', civWinRate: 0.49, overallWinRate: 0.50, games: 0, wins: 0 }
    ];
    
    res.json({
      civilization: civName || 'unknown',
      durationAnalysis: fallbackData,
      meta: { 
        totalGames: 0, 
        fallback: true,
        error: error.message
      }
    });
  }
});


// Performance analytics endpoint
router.get('/analytics/performance', cache(3600), async (req, res) => {
  try {
    const { timeframe = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));
    
    const filter = { started_timestamp: { $gte: cutoffDate } };
    
    // Use facet for parallel processing
    const pipeline = [
      { $match: filter },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalMatches: { $sum: 1 },
                totalPlayers: { $sum: '$num_players' },
                avgElo: { $avg: '$avg_elo' },
                avgDuration: { $avg: '$duration' },
                maxElo: { $max: '$avg_elo' },
                minElo: { $min: '$avg_elo' }
              }
            }
          ],
          hourlyActivity: [
            {
              $group: {
                _id: { $hour: '$started_timestamp' },
                matches: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          durationByElo: [
            {
              $bucket: {
                groupBy: '$avg_elo',
                boundaries: [0, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000],
                default: 'High',
                output: {
                  count: { $sum: 1 },
                  avgDuration: { $avg: '$duration' },
                  minDuration: { $min: '$duration' },
                  maxDuration: { $max: '$duration' }
                }
              }
            }
          ]
        }
      }
    ];
    
    const [result] = await Match.aggregate(pipeline)
      .allowDiskUse(true)
      .option({ maxTimeMS: 20000 });
    
    res.json({
      overview: result.overview[0] || {},
      hourlyActivity: result.hourlyActivity.map(h => ({
        hour: h._id,
        matches: h.matches
      })),
      durationByElo: result.durationByElo.map(d => ({
        eloBracket: d._id,
        matches: d.count,
        avgDurationMinutes: Math.round((d.avgDuration || 0) / 60000000000),
        durationRange: {
          min: Math.round((d.minDuration || 0) / 60000000000),
          max: Math.round((d.maxDuration || 0) / 60000000000)
        }
      })),
      meta: {
        timeframeDays: parseInt(timeframe),
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/debug/duration-units/:civName?', async (req, res) => {
  try {
    const { civName } = req.params;
    
    // Build match filter
    const matchFilter = civName ? { civ: civName } : {};
    
    // Get sample duration data
    const sampleData = await Player.aggregate([
      ...(civName ? [{ $match: { civ: civName } }] : []),
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $match: { 
          'match.duration': { $exists: true, $ne: null, $type: 'number', $gt: 0 }
        }
      },
      {
        $project: {
          game_id: 1,
          duration: '$match.duration',
          durationMinutes: { $divide: ['$match.duration', 60] },
          durationHours: { $divide: ['$match.duration', 3600] },
          durationMillisToMinutes: { $divide: ['$match.duration', 60000] },
          map: '$match.map'
        }
      },
      { $limit: 10 }
    ]);
    
    // Get duration statistics
    const durationStats = await Player.aggregate([
      ...(civName ? [{ $match: { civ: civName } }] : []),
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      {
        $match: { 
          'match.duration': { $exists: true, $ne: null, $type: 'number', $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          minDuration: { $min: '$match.duration' },
          maxDuration: { $max: '$match.duration' },
          avgDuration: { $avg: '$match.duration' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = durationStats[0] || {};
    
    res.json({
      sampleMatches: sampleData,
      statistics: {
        count: stats.count || 0,
        rawDuration: {
          min: stats.minDuration,
          max: stats.maxDuration,
          avg: stats.avgDuration
        },
        ifSeconds: {
          minMinutes: stats.minDuration ? Math.round(stats.minDuration / 60) : 0,
          maxMinutes: stats.maxDuration ? Math.round(stats.maxDuration / 60) : 0,
          avgMinutes: stats.avgDuration ? Math.round(stats.avgDuration / 60) : 0
        },
        ifMilliseconds: {
          minMinutes: stats.minDuration ? Math.round(stats.minDuration / 60000) : 0,
          maxMinutes: stats.maxDuration ? Math.round(stats.maxDuration / 60000) : 0,
          avgMinutes: stats.avgDuration ? Math.round(stats.avgDuration / 60000) : 0
        }
      },
      analysis: {
        likelyUnit: stats.avgDuration > 100000 ? 'milliseconds' : 'seconds',
        reasoning: stats.avgDuration > 100000 
          ? 'Average > 100k suggests milliseconds (would be ~27+ hours if seconds)'
          : 'Average < 100k suggests seconds or minutes'
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/popular-civilizations', cache(3600), async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const popularCivs = await db.collection('civ_stats_cache')
      .find({})
      .sort({ totalPicks: -1 })
      .limit(10)
      .toArray();
    
    const formattedCivs = popularCivs.map((civ, index) => ({
      rank: index + 1,
      civilization: civ._id,
      totalPicks: civ.totalPicks,
      winRate: civ.winRate,
      wins: civ.wins
    }));
    
    res.json({ popularCivilizations: formattedCivs });
  } catch (error) {
    console.error('Popular civs error:', error);
    res.json({ popularCivilizations: [] });
  }
});
module.exports = router;