# ITC Hub Frontend · Application Web

Interface web moderne, ultra-rapide et réactive pour le club **ITC** (Information Technology Community - Université Saad Dahleb de Blida).

---

## 🎨 Identité Visuelle & Expérience Utilisateur

- **Couleurs de la charte ITC** : Rouge emblématique `#D63326`, Noir profond `#111111`, Blanc pur `#FFFFFF`.
- **Responsive de 360px à l'écran large** : Testé sur mobile, tablette et desktop avec navigation adaptative.
- **Support Mode Sombre / Mode Clair** : Bascule instantanée mémorisée.
- **3 états de vue systématiques** :
  1. **Chargement** : Squelettes animés (*Skeleton shimmer*).
  2. **Erreur** : Message explicite avec bouton **« Réessayer »**.
  3. **Vide** : État illustré avec proposition d'action.

---

## ⚡ Caching Côté Frontend (Module 01)

1. **TanStack Query (Layer 3)** :
   - Mise en cache des requêtes d'événements avec `staleTime: 60_000` (60 secondes de fraîcheur sans refetch inutile).
   - Invalidation immédiate du cache après inscription : `queryClient.invalidateQueries({ queryKey: ['events'] })`.
   - **Prefetching au survol** : chargement instantané de la page de détails d'un atelier dès que l'utilisateur survole sa carte.
2. **Mémoire de Session (Layer 4)** :
   - L'historique du chat est conservé dans `sessionStorage` pour résister au rafraîchissement de la page (`F5`).
   - Aucun token ni mot de passe n'est stocké dans `localStorage` (stockage sécurisé en cookie `httpOnly`).
3. **Chargement optimisé (Code-Splitting)** :
   - Découpage automatique des routes avec `React.lazy()` et `Suspense`.
   - Bundling Vite avec hachage des assets (`assets/[name]-[hash].js`).

---

## 💬 Assistant IA & Chat

- **Streaming mot par mot** via **Server-Sent Events (SSE)**.
- **Indicateur de frappe animé** (*typing indicator*).
- **Défilement automatique** vers le bas lors de la réception des tokens.
- **Boutons d'évaluation** 👍 / 👎 sur chaque réponse pour évaluer la pertinence.
- **Widget flottant accessible depuis toutes les pages** en bas à droite de l'écran.

---

## 🚀 Démarrage Rapide

### 1. Variables d'environnement
Le fichier `.env` pointe par défaut vers le backend :
```env
VITE_API_URL=http://localhost:5000
```

### 2. Installation & Lancement
```bash
npm install
npm run dev
```
L'application démarre sur : **`http://localhost:5173`**

### 3. Build de production
```bash
npm run build
```
Les fichiers statiques optimisés sont générés dans le dossier `dist/`.
