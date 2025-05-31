// src/services/models/NFTHolding.js
import mongoose from 'mongoose';

const HoldingSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  wallet:    { type: String, required: true },
  counts:    { type: Map, of: Number, default: {} },
  genesis:   { type: Number, default: 0 },
  bandit:    { type: Number, default: 0 },
  whitelistCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('NFTHolding', HoldingSchema);
