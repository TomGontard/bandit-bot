// src/services/models/InvitesTracked.js
import mongoose from 'mongoose';

const InvitesTrackedSchema = new mongoose.Schema(
  {
    inviterId: { type: String, required: true, unique: true },
    invitedIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('InvitesTracked', InvitesTrackedSchema);
