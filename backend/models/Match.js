const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  game_id: { type: String, required: true, unique: true },
  map: String,
  started_timestamp: Date,
  duration: Number,
  avg_elo: Number,
  num_players: Number,
  team_0_elo: Number,
  team_1_elo: Number,
  replay_enhanced: Boolean,
  leaderboard: String,
  mirror: Boolean,
  patch: Number,
  raw_match_type: Number,
  game_type: String,
  game_speed: String,
  starting_age: String,
  week_range: String // e.g., "2023-04-23_2023-04-29"
}, {
  timestamps: true,
  indexes: [
    { started_timestamp: -1 },
    { avg_elo: 1 },
    { map: 1 },
    { leaderboard: 1 }
  ]
});

module.exports = mongoose.model('Match', matchSchema);