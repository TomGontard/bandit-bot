const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  wallet:    { type: String, required: true },
  counts:    { type: Map, of: Number, default: {} },
  genesis:   { type: Number, default: 0 },
  bandit:    { type: Number, default: 0 },
  whitelistCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('NFTHolding', HoldingSchema);
