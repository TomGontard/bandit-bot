// src/services/models/TweetState.js
const mongoose = require('mongoose');

const TweetStateSchema = new mongoose.Schema({
  lastId:     { type: String },
  nextAllowed:{ type: Number, default: 0 }   // timestamp ms
}, { timestamps: true });

module.exports = mongoose.model('TweetState', TweetStateSchema);
