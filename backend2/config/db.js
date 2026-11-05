import mongoose from "mongoose";

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI est introuvable dans .env");
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("MongoDB connecté avec succès !");
  } catch (error) {
    console.error("Erreur MongoDB:", error.message);
    throw error;
  }
}

export default connectDB;