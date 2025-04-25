// src/services/models/InvitesTracked.js
const mongoose = require('mongoose');

const InvitesTrackedSchema = new mongoose.Schema({
  inviterId: { type: String, required: true, unique: true },
  invitedIds: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('InvitesTracked', InvitesTrackedSchema);
