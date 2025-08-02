const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  game_id: { type: String, required: true },
  profile_id: { type: Number, required: true },
  civ: String,
  winner: Boolean,
  team: Number,
  feudal_age_uptime: Number,
  castle_age_uptime: Number,
  imperial_age_uptime: Number,
  opening: String,
  old_rating: Number,
  new_rating: Number,
  match_rating_diff: Number,
  replay_summary_raw: String,
  week_range: String
}, {
  timestamps: true,
  indexes: [
    { profile_id: 1 },
    { game_id: 1 },
    { civ: 1 },
    { old_rating: 1 }
  ]
});

module.exports = mongoose.model('Player', playerSchema);