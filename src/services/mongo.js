// src/services/mongo.js
const mongoose = require('mongoose');

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🟢 Connecté à MongoDB');
  } catch (error) {
    console.error('🔴 Erreur de connexion MongoDB :', error);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
