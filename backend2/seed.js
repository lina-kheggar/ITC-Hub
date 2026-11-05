import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import Event from "./models/Event.js";
import User from "./models/User.js";

const sampleEvents = [
  {
    title: "Atelier Développement Web Moderne",
    description:
      "Découverte des technologies React, Node.js et Express pour concevoir des applications web dynamiques et performantes.",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
    location: "Amphi 3, Université de Blida",
    department: "ITC Web Dev",
    capacity: 60,
    created_at: new Date()
  },
  {
    title: "Introduction à l'Intelligence Artificielle",
    description:
      "Session pratique sur les concepts fondamentaux du Machine Learning et la mise en œuvre de modèles simples avec Python.",
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
    location: "Salle Informatique B, Université de Blida",
    department: "ITC AI Lab",
    capacity: 45,
    created_at: new Date()
  },
  {
    title: "Hackathon ITC 2026",
    description:
      "Compétition de 24h par équipes pour créer des solutions innovantes répondant aux défis technologiques actuels.",
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Dans 30 jours
    location: "Campus Central, Université de Blida",
    department: "ITC Community",
    capacity: 100,
    created_at: new Date()
  }
];

async function seed() {
  try {
    await connectDB();

    // Seed Events
    const count = await Event.countDocuments();
    if (count === 0) {
      console.log("Insertion des événements initiaux...");
      await Event.insertMany(sampleEvents);
      console.log("Événements ajoutés avec succès !");
    } else {
      console.log(`La base contient déjà ${count} événement(s).`);
    }
    // Seed Default Admin User
    const adminEmail = "admin@itchub.org";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminHash = await bcrypt.hash("admin123456", 10);
      await User.create({
        name: "Admin ITC",
        email: adminEmail,
        password_hash: adminHash,
        password: adminHash,
        role: "admin",
        created_at: new Date()
      });
      console.log("Compte Admin créé : admin@itchub.org / admin123456");
    } else {
      console.log("Compte Admin déjà existant.");
    }
    // Seed Default Member User
    const memberEmail = "member@itchub.org";
    const existingMember = await User.findOne({ email: memberEmail });
    if (!existingMember) {
      const memberHash = await bcrypt.hash("member123456", 10);
      await User.create({
        name: "Membre ITC",
        email: memberEmail,
        password_hash: memberHash,
        password: memberHash,
        role: "member",
        created_at: new Date()
      });
      console.log("Compte Membre créé : member@itchub.org / member123456");
    } else {
      console.log("Compte Membre déjà existant.");
    }

    console.log("Seeding terminé avec succès !");
    process.exit(0);
  } catch (err) {
    console.error("Erreur lors du seeding :", err);
    process.exit(1);
  }
}

seed();
