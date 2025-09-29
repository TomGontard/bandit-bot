// src/services/models/WLAddress.js
import mongoose from 'mongoose';

const WLAddressSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, unique: true }, // lowercase
    fcfs: { type: Boolean, default: false },
    gtd: { type: Boolean, default: false },
    logs: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['fcfs', 'gtd'], required: true },
        staffId: String,
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model('WLAddress', WLAddressSchema);
