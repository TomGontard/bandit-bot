// src/services/models/InviteTrack.js
const mongoose = require('mongoose');

const InviteTrackSchema = new mongoose.Schema({
  invitedId: { type: String, required: true, unique: true },
  inviterId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InviteTrack', InviteTrackSchema);
