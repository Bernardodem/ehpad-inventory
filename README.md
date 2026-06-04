# EHPAD Arc en Ciel — Gestion des stocks
**MAPAD Group | Application interne**

## Comptes par défaut (à changer immédiatement en prod)

| Identifiant | Mot de passe | Rôle |
|-------------|-------------|------|
| admin | Admin2024! | Administrateur |
| idec | Admin2024! | Gestionnaire de commande |
| inventaire1 | Inv2024! | Inventaire |

---

## Architecture

```
ehpad-inventory/
├── backend/          → API Node.js + SQLite (Express)
│   └── src/
│       ├── index.js         → Point d'entrée
│       ├── db/init.js       → Base de données + seed
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── users.js
│           ├── produits.js
│           └── inventaire.js
└── frontend/         → React + Vite + Tailwind
    └── src/
        ├── pages/    → Login, Home, Produits, Inventaire, Commande, Utilisateurs
        ├── components/
        └── contexts/
```

---

## Déploiement cloud (Railway — recommandé, gratuit tier disponible)

### Prérequis
- Compte GitHub : https://github.com
- Compte Railway : https://railway.app

### Étape 1 — Préparer le dépôt GitHub

```bash
git init
git add .
git commit -m "Initial commit — EHPAD Arc en Ciel"
# Créer un repo sur GitHub, puis :
git remote add origin https://github.com/TON_COMPTE/ehpad-inventory.git
git push -u origin main
```

### Étape 2 — Déployer le backend sur Railway

1. Sur railway.app → "New Project" → "Deploy from GitHub repo"
2. Choisir `ehpad-inventory`
3. Dans "Settings" → "Root Directory" : mettre `backend`
4. Dans "Variables" → ajouter :
   - `JWT_SECRET` = une chaîne aléatoire longue (ex: générer sur https://passwordsgenerator.net/)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = l'URL de ton frontend (à renseigner après étape 3)
5. Railway détectera automatiquement le `package.json` et lancera `npm start`
6. Copier l'URL générée (ex: `https://ehpad-backend-xxx.railway.app`)

**Important : Volume persistant**
Dans Railway → ton service → "Volumes" → ajouter un volume monté sur `/app/data`
(pour que la base SQLite survive aux redémarrages)

### Étape 3 — Déployer le frontend sur Vercel

```bash
cd frontend
# Créer le fichier .env.production
echo "VITE_API_URL=https://ehpad-backend-xxx.railway.app" > .env.production
```

Modifier `frontend/src/api.js` ligne 3 :
```js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
```

1. Sur vercel.com → "New Project" → importer le repo GitHub
2. "Root Directory" : `frontend`
3. Variables d'environnement : `VITE_API_URL` = URL Railway du backend
4. Déployer → Vercel donne une URL `https://ehpad-xxx.vercel.app`

5. Retourner sur Railway → mettre cette URL dans `FRONTEND_URL`

---

## Développement local

### Backend
```bash
cd backend
npm install
node src/index.js
# → http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Fonctionnalités

### Rôles et accès
| Fonctionnalité | Inventaire | Gestionnaire | Admin |
|---|---|---|---|
| Consulter le catalogue | ✅ | ✅ | ✅ |
| Saisir un inventaire | ✅ | ✅ | ✅ |
| Voir les commandes | ❌ | ✅ | ✅ |
| Modifier les fiches produit | ❌ | ✅ | ✅ |
| Gérer les utilisateurs | ❌ | ❌ | ✅ |

### Flux de travail inventaire → commande
1. Créer une session d'inventaire (total ou partiel par catégorie)
2. Saisir les quantités en stock + dates de péremption
3. Terminer la session
4. Le gestionnaire consulte la vue "Commande" : quantité à commander = Dotation − Stock actuel

---

## Évolutions possibles (non incluses dans ce prototype)
- Export PDF de la commande (avec en-tête MAPAD Group)
- Import/mise à jour du catalogue via fichier Excel
- Historique des inventaires avec graphiques de consommation
- Notifications automatiques (email) quand le stock approche du seuil
- Module de réception de commande

---

## Support technique
Pour toute question technique sur le déploiement, se référer à :
- Railway docs : https://docs.railway.app
- Vercel docs : https://vercel.com/docs
