const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Match = require('../models/Match');
const cache = require('../middleware/cache');
const { validateProfileId, validatePagination } = require('../middleware/validation');

// Get player profile
router.get('/:profileId', validateProfileId, cache(600), async (req, res) => {
  try {
    const { profileId } = req.params;
    
    // Get player stats
    const playerStats = await Player.aggregate([
      { $match: { profile_id: parseInt(profileId) } },
      {
        $group: {
          _id: '$profile_id',
          totalMatches: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          avgRating: { $avg: '$old_rating' },
          currentRating: { $last: '$new_rating' },
          favoritecivs: { $push: '$civ' },
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalMatches'] }
        }
      }
    ]);

    if (!playerStats.length) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get civ usage stats
    const civStats = await Player.aggregate([
      { $match: { profile_id: parseInt(profileId) } },
      {
        $group: {
          _id: '$civ',
          matches: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$matches'] }
        }
      },
      { $sort: { matches: -1 } }
    ]);

    // Get recent matches
    const recentMatches = await Player.find({ profile_id: parseInt(profileId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: 'game_id',
        model: 'Match',
        localField: 'game_id',
        foreignField: 'game_id'
      });

    res.json({
      profile: playerStats[0],
      civStats,
      recentMatches
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player match history
router.get('/:profileId/matches', validateProfileId, validatePagination, async (req, res) => {
  try {
    const { profileId } = req.params;
    const { page = 1, limit = 20, civ, result } = req.query;

    const filter = { profile_id: parseInt(profileId) };
    if (civ) filter.civ = civ;
    if (result === 'win') filter.winner = true;
    if (result === 'loss') filter.winner = false;

    const matches = await Player.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get match details for each player match
    const gameIds = matches.map(m => m.game_id);
    const matchDetails = await Match.find({ game_id: { $in: gameIds } }).lean();
    
    // Combine player and match data
    const enrichedMatches = matches.map(playerMatch => {
      const matchDetail = matchDetails.find(m => m.game_id === playerMatch.game_id);
      return {
        ...playerMatch,
        matchDetails: matchDetail
      };
    });

    const total = await Player.countDocuments(filter);

    res.json({
      matches: enrichedMatches,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player rankings
router.get('/rankings/:leaderboard', cache(1800), async (req, res) => {
  try {
    const { leaderboard } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Get latest rating for each player
    const rankings = await Player.aggregate([
      {
        $lookup: {
          from: 'matches',
          localField: 'game_id',
          foreignField: 'game_id',
          as: 'match'
        }
      },
      { $unwind: '$match' },
      { $match: { 'match.leaderboard': leaderboard } },
      {
        $sort: { 'match.started_timestamp': -1 }
      },
      {
        $group: {
          _id: '$profile_id',
          latestRating: { $first: '$new_rating' },
          totalMatches: { $sum: 1 },
          wins: { $sum: { $cond: ['$winner', 1, 0] } },
          lastPlayed: { $first: '$match.started_timestamp' }
        }
      },
      {
        $addFields: {
          winRate: { $divide: ['$wins', '$totalMatches'] }
        }
      },
      { $sort: { latestRating: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      rankings,
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;