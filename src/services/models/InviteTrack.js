// src/services/models/InviteTrack.js
const mongoose = require('mongoose');

const InviteTrackSchema = new mongoose.Schema({
  inviterId: { type: String, required: true, unique: true },
  invitedId: { type: String},
  invitedIds: { type: [String], default: [] },
  invitedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('InviteTrack', InviteTrackSchema);
