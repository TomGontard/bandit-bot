// src/services/models/Whitelist.js
import mongoose from 'mongoose';

// Tracks both NFT-based and manual whitelist counts, with history logs
const WhitelistSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true },
    whitelistsNFTs: { type: Number, default: 0 },      // from NFT holdings
    whitelistsGiven: { type: Number, default: 0 },     // manually added/removed by staff
    whitelistsLogs: [
      {
        date:     { type: Date, default: Date.now },   // when change occurred
        type:     { type: String, enum: ['nft', 'manual'], required: true },
        amount:   { type: Number, required: true },    // positive for add, negative for remove
        reason:   { type: String },                    // for manual entries
        staffId:  { type: String },                    // who performed manual change
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Whitelist', WhitelistSchema);
