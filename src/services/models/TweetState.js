// src/services/models/TweetState.js
import mongoose from 'mongoose';

const TweetStateSchema = new mongoose.Schema(
  {
    lastId:      { type: String },
    nextAllowed: { type: Number, default: 0 }, // timestamp ms
  },
  { timestamps: true }
);

export default mongoose.model('TweetState', TweetStateSchema);