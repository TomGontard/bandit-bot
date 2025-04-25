// src/services/models/InviteCache.js
const mongoose = require('mongoose');

const InviteCacheSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  code: { type: String, required: true },
  uses: { type: Number, default: 0 },
  inviterId: { type: String, required: true },
}, { timestamps: true });

InviteCacheSchema.index({ guildId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('InviteCache', InviteCacheSchema);