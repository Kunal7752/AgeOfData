// routes/stats.js - Enhanced statistics endpoints
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Player = require('../models/Player');
const cache = require('../middleware/cache');

// Civilization statistics with advanced filtering
router.get('/civilizations', cache(3600), async (req, res) => {
  try {
    const { 
      leaderboard, 
      patch, 
      timeframe, 
      minElo, 
      maxElo,
      minMatches = 10 
    } = req.query;
    
    // Build match filter
    let matchFilter = {};
    if (leaderboard) matchFilter['match.leaderboard'] = leaderboard;
    if (patch) matchFilter['match.patch'] = parseInt(patch);
    
    // Time filter
    if (timeframe && timeframe !== 'all') {
      const days = parseInt(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      matchFilter['match.started_timestamp'] = { $gte: cutoffDate };
    }
    
    // ELO filter
    if (minElo || maxElo) {
      matchFilter['match.avg_elo'] = {};
      if (minElo) matchFilter['match.avg_elo'].$gte = parseInt(minElo);
      if (maxElo) matchFilter['match.avg_elo'].$lte = parseInt(maxElo);
    }

    const civStats = await Player.aggregate([
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
          _id: '$civ',
          totalPicks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          losses: { $sum: { $cond: ['$winner', 0, 1] } },
          avgRating: { $avg: '$old_rating' },
          avgGameDuration: { $avg: '$match.duration' },
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
      },
      { $match: { totalPicks: { $gte: parseInt(minMatches) } } },
      { $sort: { totalPicks: -1 } }
    ]);

    // Calculate pick rates as percentages
    const totalPicks = civStats.reduce((sum, civ) => sum + civ.totalPicks, 0);
    
    const enrichedStats = civStats.map(civ => ({
      civilization: civ._id,
      stats: {
        totalPicks: civ.totalPicks,
        wins: civ.wins,
        losses: civ.losses,
        winRate: civ.winRate,
        pickRate: (civ.totalPicks / totalPicks) * 100,
        avgRating: Math.round(civ.avgRating || 0),
        avgDurationMinutes: Math.round((civ.avgGameDuration || 0) / 60),
        uniquePlayers: civ.uniquePlayerCount
      },
              ageUpTimes: {
        feudal: Math.round(civ.avgFeudalTime || 0),
        castle: Math.round(civ.avgCastleTime || 0),
        imperial: Math.round(civ.avgImperialTime || 0)
      }
    }));

    res.json({
      civilizations: enrichedStats,
      meta: {
        totalCivilizations: civStats.length,
        totalMatches: totalPicks,
        filters: { leaderboard, patch, timeframe, minElo, maxElo, minMatches },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Map statistics with win rates by civilization
router.get('/maps', cache(3600), async (req, res) => {
  try {
    const { leaderboard, patch, minMatches = 50 } = req.query;
    
    let matchFilter = {};
    if (leaderboard) matchFilter.leaderboard = leaderboard;
    if (patch) matchFilter.patch = parseInt(patch);

    const mapStats = await Match.aggregate([
      { $match: matchFilter },
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
      { $sort: { totalMatches: -1 } }
    ]);

    // Get civilization performance per map
    const mapCivStats = await Player.aggregate([
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
          _id: { map: '$match.map', civ: '$civ' },
          picks: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$picks'] }
        }
      },
      { $match: { picks: { $gte: 10 } } },
      {
        $group: {
          _id: '$_id.map',
          civilizations: {
            $push: {
              name: '$_id.civ',
              picks: '$picks',
              wins: '$wins',
              winRate: '$winRate'
            }
          }
        }
      }
    ]);

    // Combine map stats with civ performance
    const enrichedMapStats = mapStats.map(map => {
      const civData = mapCivStats.find(c => c._id === map._id);
      return {
        map: map._id,
        stats: {
          totalMatches: map.totalMatches,
          avgElo: Math.round(map.avgElo || 0),
          avgDurationMinutes: Math.round((map.avgDuration || 0) / 60),
          avgPlayers: Math.round(map.avgPlayers || 0),
          eloRange: {
            min: Math.round(map.minElo || 0),
            max: Math.round(map.maxElo || 0)
          }
        },
        topCivilizations: civData ? 
          civData.civilizations
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 5) : []
      };
    });

    res.json({
      maps: enrichedMapStats,
      meta: {
        totalMaps: mapStats.length,
        filters: { leaderboard, patch, minMatches }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advanced meta trends over time
router.get('/trends', cache(7200), async (req, res) => {
  try {
    const { 
      metric = 'matches', 
      groupBy = 'week',
      timeframe = 90,
      leaderboard 
    } = req.query;
    
    // Build time filter
    const days = parseInt(timeframe);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let matchFilter = { started_timestamp: { $gte: cutoffDate } };
    if (leaderboard) matchFilter.leaderboard = leaderboard;
    
    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$started_timestamp' },
              month: { $month: '$started_timestamp' },
              day: { $dayOfMonth: '$started_timestamp' }
            },
            count: { $sum: 1 },
            avgElo: { $avg: '$avg_elo' },
            avgDuration: { $avg: '$duration' },
            uniquePlayers: { $sum: '$num_players' }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$started_timestamp' },
              week: { $week: '$started_timestamp' }
            },
            count: { $sum: 1 },
            avgElo: { $avg: '$avg_elo' },
            avgDuration: { $avg: '$duration' },
            uniquePlayers: { $sum: '$num_players' }
          }
        };
        break;
      default:
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$started_timestamp' },
              month: { $month: '$started_timestamp' }
            },
            count: { $sum: 1 },
            avgElo: { $avg: '$avg_elo' },
            avgDuration: { $avg: '$duration' },
            uniquePlayers: { $sum: '$num_players' }
          }
        };
    }

    const trends = await Match.aggregate([
      { $match: matchFilter },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } }
    ]);

    // Format the response
    const formattedTrends = trends.map(trend => {
      let date;
      if (groupBy === 'day') {
        date = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}-${String(trend._id.day).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        date = `${trend._id.year}-W${String(trend._id.week).padStart(2, '0')}`;
      } else {
        date = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`;
      }
      
      return {
        date,
        matches: trend.count,
        avgElo: Math.round(trend.avgElo || 0),
        avgDurationMinutes: Math.round((trend.avgDuration || 0) / 60),
        totalPlayers: trend.uniquePlayers
      };
    });

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
    res.status(500).json({ error: error.message });
  }
});

// Detailed ELO distribution with percentiles
router.get('/elo-distribution', cache(3600), async (req, res) => {
  try {
    const { leaderboard, patch, bucketSize = 100 } = req.query;
    
    let matchFilter = {};
    if (leaderboard) matchFilter.leaderboard = leaderboard;
    if (patch) matchFilter.patch = parseInt(patch);

    // Create dynamic buckets based on bucket size
    const bucketSizeNum = parseInt(bucketSize);
    const boundaries = [];
    for (let i = 0; i <= 3000; i += bucketSizeNum) {
      boundaries.push(i);
    }
    boundaries.push(5000); // Cap for very high ELO

    const distribution = await Match.aggregate([
      { $match: matchFilter },
      {
        $bucket: {
          groupBy: '$avg_elo',
          boundaries,
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            minElo: { $min: '$avg_elo' },
            maxElo: { $max: '$avg_elo' }
          }
        }
      }
    ]);

    // Calculate percentiles
    const totalMatches = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
    let runningSum = 0;
    
    const enrichedDistribution = distribution.map(bucket => {
      const percentage = (bucket.count / totalMatches) * 100;
      const cumulativePercentage = ((runningSum + bucket.count) / totalMatches) * 100;
      runningSum += bucket.count;
      
      return {
        eloRange: bucket._id === 'Other' ? 'Other' : {
          min: bucket.minElo || bucket._id,
          max: bucket.maxElo || (bucket._id + bucketSizeNum - 1)
        },
        matches: bucket.count,
        percentage: Math.round(percentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        avgDurationMinutes: Math.round((bucket.avgDuration || 0) / 60)
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

// Performance analytics endpoint
router.get('/analytics/performance', cache(3600), async (req, res) => {
  try {
    const { timeframe = 30 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));
    
    const filter = { started_timestamp: { $gte: cutoffDate } };

    const [
      totalStats,
      hourlyDistribution,
      durationAnalysis,
      eloTrends
    ] = await Promise.all([
      // Overall statistics
      Match.aggregate([
        { $match: filter },
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
      ]),

      // Hourly match distribution
      Match.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $hour: '$started_timestamp' },
            matches: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Duration analysis by ELO bracket
      Match.aggregate([
        { $match: filter },
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
      ]),

      // ELO trends over time
      Match.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$started_timestamp' },
              month: { $month: '$started_timestamp' },
              day: { $dayOfMonth: '$started_timestamp' }
            },
            avgElo: { $avg: '$avg_elo' },
            matchCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    res.json({
      overview: totalStats[0] || {},
      hourlyActivity: hourlyDistribution.map(h => ({
        hour: h._id,
        matches: h.matches
      })),
      durationByElo: durationAnalysis.map(d => ({
        eloBracket: d._id,
        matches: d.count,
        avgDurationMinutes: Math.round((d.avgDuration || 0) / 60),
        durationRange: {
          min: Math.round((d.minDuration || 0) / 60),
          max: Math.round((d.maxDuration || 0) / 60)
        }
      })),
      eloTrends: eloTrends.map(trend => ({
        date: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}-${String(trend._id.day).padStart(2, '0')}`,
        avgElo: Math.round(trend.avgElo || 0),
        matches: trend.matchCount
      })),
      meta: {
        timeframeDays: parseInt(timeframe),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;