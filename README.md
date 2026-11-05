# 🔴 ITC Hub — IT Community Blida
Plateforme web officielle du club **IT Community** (Université Saad Dahleb de Blida).  
Elle permet aux membres de découvrir les départements du club, de s'inscrire aux ateliers et de discuter avec un **Assistant IA en direct**.
---
##  Fonctionnalités Principales
-  **Présentation du Club** : Découverte des 5 départements (*Web Dev, AI Lab, Cybersecurity, Mobile, UI/UX*).
-  **Gestion des Événements** : Consultation du calendrier des ateliers et inscription en 1 clic.
-  **Assistant IA Interactif** : Chatbot intelligent répondant en temps réel (*streaming*) avec les données réelles du club.
-  **Authentification Sécurisée** : Inscription et connexion avec gestion des rôles (*Membre* et *Admin*).
---
## 🛠️ Technologies Utilisées
- **Frontend** : React 19, Vite, TanStack Query, React Router, CSS moderne (avec Dark Mode).
- **Backend** : Node.js, Express 5, validation Zod, sécurité Helmet & Rate Limiting.
- **Base de Données** : MongoDB Atlas (Mongoose).
- **Performance** : Système de cache multi-couches pour des réponses ultra-rapides.
---
## 💻 Démarrage Rapide
Pour lancer le projet, ouvrez **deux terminaux séparés** :
### 1. Démarrer le Backend (API)
Dans le premier terminal :
```bash
cd backend2
npm install
npm run seed      
npm start         
```
### 2. Démarrer le Frontend (Interface)
Dans le second terminal :
```bash
cd front-end
npm install
npm run dev       
```
👉 Ouvrez votre navigateur sur **`http://localhost:5173`** ! 
---
## 👤 Comptes de Test
| Rôle | Email | Mot de passe |
| :--- | :--- | :--- |
| **Administrateur** | `admin@itchub.org` | `admin123456` |
| **Membre** | `member@itchub.org` | `member123456` |
## 📖 Documentation API
Une fois le backend démarré, vous pouvez tester l'API directement via Swagger :
- **Swagger UI** : `http://localhost:5000/api/docs`
