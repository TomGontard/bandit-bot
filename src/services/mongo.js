// src/services/mongo.js
import mongoose from 'mongoose';

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

export default connectToMongoDB;
