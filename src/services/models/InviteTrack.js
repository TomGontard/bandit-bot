// src/services/models/InviteTrack.js
const mongoose = require('mongoose');

const InviteTrackSchema = new mongoose.Schema({
  inviterId: { type: String, required: true },
  invitedId: { type: String, required: true, unique: true },
  invitedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('InviteTrack', InviteTrackSchema);
