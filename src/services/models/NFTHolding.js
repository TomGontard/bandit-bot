const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  wallet:    { type: String, required: true },
  counts:    { type: Map, of: Number, default: {} }, // { '0xAAA…': 3, '0xBBB…': 0, ... }
  genesis:   { type: Number, default: 0 },
  bandit:    { type: Number, default: 0 },
  updatedAt: { type: Date,   default: Date.now },
});

module.exports = mongoose.model('NFTHolding', HoldingSchema);
