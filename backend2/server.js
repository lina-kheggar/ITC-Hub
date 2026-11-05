import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import connectDB from "./config/db.js";
import requestIdMiddleware from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";
// Création de l'application Express
const app = express();
// Connexion à la base de données MongoDB
try {
  await connectDB();
} catch (error) {
  console.error("Erreur de connexion MongoDB :", error.message);
  process.exit(1);
}
// Middleware pour ajouter un identifiant de requête (Request ID) dans les logs
app.use(requestIdMiddleware);
// Sécurité : Helmet pour protéger les en-têtes HTTP
app.use(
  helmet({
    contentSecurityPolicy: false // Permet l'affichage de Swagger UI
  })
);

// Sécurité CORS : autorise le frontend en développement et production
app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise tout localhost, 127.0.0.1, CLIENT_URL ou les requêtes directes (Postman)
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin === process.env.CLIENT_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
  })
);
// Parsers pour le corps des requêtes JSON et les cookies
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
// Limitation du débit (Rate Limiter) sur l'ensemble de l'API
app.use("/api", apiRateLimiter);
// Route d'accueil simple de l'API
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    name: "ITC Hub API",
    version: "1.0.0",
    docs: "/api/docs",
    health: "/api/health"
  });
});
// Déclaration des routes REST sous le préfixe obligatoire /api
app.use("/api/health", healthRoutes); 
app.use("/api/auth", authRoutes);     
app.use("/api/events", eventRoutes); 
app.use("/api/chat", chatRoutes);     
app.use("/api", docsRoutes);          
// Gestion des routes non trouvées (404)
app.use(notFoundHandler);
// Gestionnaire global d'erreurs 
app.use(errorHandler);
// Démarrage du serveur sur le port 5000
const PORT = process.env.PORT || 5000;
const isRunningTests =
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("test"));

if (!isRunningTests) {
  app.listen(PORT, () => {
    console.log(`Serveur ITC Hub démarré sur http://localhost:${PORT}`);
    console.log(`Documentation Swagger : http://localhost:${PORT}/api/docs`);
  });
}

export default app;
