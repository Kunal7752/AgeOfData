// models/Player.js
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  game_id: { type: String, required: true },
  profile_id: { type: Number, required: true },
  civ: String,
  civLower: String,                 // NEW: case-insensitive, index-friendly
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
  timestamps: true
});

// Keep civLower in sync on inserts/saves
playerSchema.pre('save', function(next) {
  if (this.civ) this.civLower = this.civ.toLowerCase();
  next();
});

// Also keep it in sync on findOneAndUpdate
playerSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  if (update.civ) {
    update.civLower = String(update.civ).toLowerCase();
    this.setUpdate(update);
  } else if (update.$set && update.$set.civ) {
    update.$set.civLower = String(update.$set.civ).toLowerCase();
  }
  next();
});

// Indexes tuned for the new aggregation pipelines
playerSchema.index({ civLower: 1, game_id: 1 });  // selective first stage + later lookup
playerSchema.index({ game_id: 1, civLower: 1 });  // $lookup + filter combo
playerSchema.index({ profile_id: 1 });
playerSchema.index({ game_id: 1 });
playerSchema.index({ civ: 1 });
playerSchema.index({ old_rating: 1 });

module.exports = mongoose.model('Player', playerSchema);
