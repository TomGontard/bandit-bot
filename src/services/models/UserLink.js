// src/services/models/UserLink.js
const mongoose = require('mongoose');

const UserLinkSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  wallet: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('UserLink', UserLinkSchema);
