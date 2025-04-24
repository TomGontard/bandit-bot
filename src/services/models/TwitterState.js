// src/models/TwitterState.js
const mongoose = require('mongoose');

const TwitterStateSchema = new mongoose.Schema({
  lastTweetId: { type: String, required: true },
  lastTweetTime: { type: Date, required: true },
  nextAllowed: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TwitterState', TwitterStateSchema);
