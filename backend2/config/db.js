import mongoose from "mongoose";

async function connectDB() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb+srv://linakheggar_db_user:ckcjZcgf01daXINZ@cluster0.wdjoi8r.mongodb.net/itchub?retryWrites=true&w=majority";

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true
    });

    console.log("MongoDB connecté avec succès !");
  } catch (error) {
    console.error("Erreur MongoDB :", error.message);
    throw error;
  }
}

export default connectDB;
