// src/services/models/TwitterState.js
const mongoose = require('mongoose');

const TwitterStateSchema = new mongoose.Schema({
  _id:            { type: String, default: 'state' },
  lastTweetId:    String,   // tweet déjà PUBLIÉ sur Discord
});

module.exports = mongoose.model('TwitterState', TwitterStateSchema);
