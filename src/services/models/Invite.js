// src/services/models/Invite.js
const mongoose = require('mongoose');

/**
 * One document per inviter.
 * - `invitedIds` holds *unique* Discord user-IDs this inviter brought in.
 */
const InviteSchema = new mongoose.Schema(
  {
    inviterId:  { type: String, required: true, unique: true },
    invitedIds: { type: [String], default: [] },   // unique array
  },
  { timestamps: true },
);

module.exports = mongoose.model('Invite', InviteSchema);
