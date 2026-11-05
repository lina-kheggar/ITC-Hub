# ITC Hub Backend API & Security Architecture

Backend REST API complet, performant et sécurisé pour la plateforme **ITC Hub** (Club Scientifique IT Community - Université Saad Dahleb de Blida).

---

## 🚀 Fonctionnalités & Conformité

| Exigence | Implémentation | Statut |
| :--- | :--- | :---: |
| **REST API sous `/api`** | Préfixe strict `/api` avec codes de statut HTTP normalisés (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `500`) | ✅ |
| **Format d'erreur unifié** | Format standard `{ success: false, error: { code, message } }` validé par **Zod** | ✅ |
| **Base de Données** | **MongoDB (Mongoose)** avec modèles et index uniques composés | ✅ |
| **Authentification & Rôles** | Hachage **bcrypt**, **JWT court (15m)**, **Refresh Token (7d)** en cookie `httpOnly`, rôles `member` et `admin` | ✅ |
| **Sécurité & Headers** | En-têtes durcis avec **Helmet**, **CORS** restreint à l'origine du frontend | ✅ |
| **Rate Limiting** | **20 messages de chat par minute par utilisateur** (`HTTP 429`) + Limiteur d'API global | ✅ |
| **Ops & Health Check** | `GET /api/health` pour load balancer (**zéro appel DB**), logs structurés JSON avec **Request ID** (`X-Request-Id`) | ✅ |
| **Stratégie de Caching** | Layer 5 (`Cache-Control: max-age=60` + `ETag 304`), Layer 6 (Cache-aside TTL 300s + invalidation), Layer 7 (Cache IA questions génériques 24h) | ✅ |
| **Assistant IA Groundé** | Injection en temps réel des événements de la base MongoDB, mémoire conversationnelle (10 messages), streaming SSE | ✅ |
| **Documentation Interactive** | **Swagger UI / OpenAPI 3.0** accessible sur `/api/docs` et `/api/openapi.json` | ✅ |
| **Tests Automatisés** | Suite complète de tests d'intégration via `npm test` (`node:test`) | ✅ |

---

## 🗄️ Modèle de Données (MongoDB / Mongoose)

Les collections sont définies dans le dossier `models/` :

1. **`users`** : `(id, name, email UNIQUE, password_hash, role: 'member' | 'admin', created_at)`
2. **`events`** : `(id, title, description, date, location, department, capacity, created_at)`
3. **`registrations`** : `(user_id, event_id, created_at)` avec index unique composé `(user_id, event_id)`
4. **`conversations`** : `(id, user_id, created_at)`
5. **`messages`** : `(id, conversation_id, role: 'user' | 'assistant', content, tokens, feedback, created_at)`

---

## ⚡ Caching : Stratégie Multi-Couches

| Couche | Emplacement | Données en Cache | Mécanisme | Invalidation |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 5 : HTTP API** | Navigateur / Proxy | GET publics (`/api/events`) | `Cache-Control: public, max-age=60`<br>`ETag: "<md5>"` | **HTTP 304 Not Modified** si `If-None-Match` correspond. |
| **Layer 6 : Application** | Redis / Mémoire | Résultats des requêtes DB | Cache-aside avec TTL = 300s | **Supprimé à chaque écriture** (`POST /api/events` invalide le cache). |
| **Layer 7 : Réponses IA** | Redis / Mémoire | Questions génériques du club | Clé = `ai:cache:<hash_sha256>`<br>TTL = 24 heures | Expiration TTL automatique. |

### Règles d'Or :
- **Données privées jamais mises en cache public** : `Cache-Control: private, no-store` pour profil, tokens et historique chat.
- **Header de diagnostic** : Présence de `X-Cache: HIT` ou `X-Cache: MISS` sur chaque requête.
- **Protection Cache Stampede** : Mécanisme de verrouillage de promesse en vol évitant les surcharges DB.

---

## 📡 Endpoints de l'API

Tous les endpoints sont préfixés par `/api`.

| Méthode | Chemin | Accès | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Public | Health check (aucun appel DB, retourne l'uptime) |
| **POST** | `/api/auth/register` | Public | Inscription avec validation Zod, hachage bcrypt (409 si email existe) |
| **POST** | `/api/auth/login` | Public | Connexion, retourne JWT + Refresh token en cookie `httpOnly` |
| **POST** | `/api/auth/refresh` | Public | Rafraîchissement du JWT via refresh token cookie |
| **POST** | `/api/auth/logout` | Public | Déconnexion et nettoyage des cookies |
| **GET** | `/api/auth/me` | Membre | Profil utilisateur connecté (`Cache-Control: private, no-store`) |
| **GET** | `/api/events` | Public | Liste des événements en cache (`Redis` + `max-age=60` + `ETag 304`) |
| **GET** | `/api/events/:id` | Public | Détails d'un événement (404 si introuvable) |
| **POST** | `/api/events` | Admin | Création d'événement, invalide immédiatement le cache |
| **POST** | `/api/events/:id/register` | Membre | Inscription à un événement (409 si déjà inscrit ou complet) |
| **POST** | `/api/chat` | Membre | Chat avec l'IA en streaming SSE (`text/event-stream`), rate limit (20/min) |
| **GET** | `/api/chat/history` | Membre | Dernier historique de conversation (`Cache-Control: private, no-store`) |
| **POST** | `/api/chat/messages/:id/feedback`| Membre | Évaluation d'une réponse IA (Helpful / Unhelpful) |
| **GET** | `/api/docs` | Public | Interface interactive **Swagger UI** |
| **GET** | `/api/openapi.json` | Public | Spécification brute OpenAPI 3.0 |

---

## 🛠️ Lancement Local Simple

### 1. Variables d'environnement
Un fichier `.env` est déjà configuré localement. Vous pouvez vous baser sur `.env.example` :
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://.../itchub
JWT_SECRET=itc_hub_jwt_super_secret_key_2026
REFRESH_TOKEN_SECRET=itc_hub_refresh_super_secret_key_2026
REDIS_URL=redis://localhost:6379
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Peupler la base de données (Seeding)
Crée les événements initiaux et les comptes de test :
- **Admin** : `admin@itchub.org` / `admin123456`
- **Membre** : `member@itchub.org` / `member123456`
```bash
npm run seed
```

### 4. Lancer les tests automatisés
```bash
npm test
```

### 5. Démarrer le serveur
```bash
npm start
# Ou en mode watch :
npm run dev
```
- Le serveur écoute sur : `http://localhost:5000`
- Documentation Swagger UI : `http://localhost:5000/api/docs`
