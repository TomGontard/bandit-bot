// src/services/models/frenchnads.js
import mongoose from 'mongoose';

const FrenchNadsSchema = new mongoose.Schema({
  discordId:      { type: String, required: true, unique: true },
  discordName:    { type: String, required: true },
  discordUsername:{ type: String, required: true },
});

export default mongoose.model('FrenchNads', FrenchNadsSchema);
