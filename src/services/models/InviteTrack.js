// src/services/models/InviteTrack.js
import mongoose from 'mongoose';

const InviteTrackSchema = new mongoose.Schema(
  {
    inviterId: { type: String, required: true, unique: true },
    invitedId: { type: String },
    invitedIds: { type: [String], default: [] },
    invitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('InviteTrack', InviteTrackSchema);
