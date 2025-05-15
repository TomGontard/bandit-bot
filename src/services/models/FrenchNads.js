// src/services/models/frenchnads.js
const mongoose = require('mongoose');

const FrenchNadsSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    discordName: { type: String, required: true},
    discordUsername: { type: String, required: true},
});

module.exports = mongoose.model('FrenchNads', FrenchNadsSchema);
