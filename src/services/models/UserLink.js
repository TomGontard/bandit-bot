// src/services/models/UserLink.js
const mongoose = require('mongoose');

const UserLinkSchema = new mongoose.Schema({
  discordId:          { type: String, required: true, unique: true },
  wallet:             { type: String, required: true, unique: true },
  registrationNumber: { type: Number, required: true, unique: true },
  verified:           { type: Boolean, default: false },
  verifiedAt:         { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('UserLink', UserLinkSchema);
