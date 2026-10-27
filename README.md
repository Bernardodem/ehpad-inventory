# EHPAD Arc en Ciel — Gestion des stocks
**MAPAD Group | Application interne**

Dotations par lieu de stockage, inventaires, commandes fournisseurs et réceptions.
L'application fait partie de la suite **Mon Arc en Ciel** : la connexion passe par le SSO.

---

## Connexion et comptes

Il n'y a **pas de compte local ni de mot de passe par défaut** : les utilisateurs se connectent sur le SSO
(code de vérification envoyé par mail), qui renvoie vers l'application avec un jeton.

- Les comptes sont créés dans le SSO par un administrateur. Chaque nouvel utilisateur reçoit un mail
  « Activez votre compte » pour choisir son mot de passe (lien valable 7 jours).
- Pour accéder aux stocks, l'application **Gestion des stocks** doit être activée pour l'utilisateur dans le SSO.
  Sans cet accès, l'API répond 403.

### Rôles

| Rôle dans le SSO | Rôle dans les stocks |
|---|---|
| admin d'établissement / admin groupe | admin |
| Gestion des stocks : admin | admin |
| Gestion des stocks : gestionnaire | gestionnaire |
| Gestion des stocks : utilisateur | inventaire |

| Fonctionnalité | Inventaire | Gestionnaire | Admin |
|---|---|---|---|
| Consulter le catalogue | ✅ | ✅ | ✅ |
| Saisir un inventaire | ✅ | ✅ | ✅ |
| Voir et passer les commandes | ❌ | ✅ | ✅ |
| Modifier les fiches produit | ❌ | ✅ | ✅ |
| Gérer les lieux de stockage et les utilisateurs | ❌ | ❌ | ✅ |

---

## Architecture

```
ehpad-inventory/
├── backend/          → API Node.js (Express) + PostgreSQL
│   └── src/
│       ├── index.js           → Point d'entrée
│       ├── db/init.js         → Création du schéma + données d'exemple
│       ├── middleware/auth.js → Vérification du jeton SSO et des rôles
│       └── routes/            → auth, users, produits, lieux, emplacements, inventaire, commandes
└── frontend/         → React + Vite + Tailwind, servi sous /stocks/
    └── src/
        ├── pages/    → Home, Produits, Lieux, Inventaire, Commande, Réception, Utilisateurs
        ├── components/
        └── contexts/ → AuthContext (récupère le jeton SSO)
```

En production, nginx sert le frontend sur `https://monaec.fr/stocks/` et redirige `/stocks/api/` vers le backend (port 3001).

---

## Installation sur un nouveau serveur

### 1. SSO

Le SSO doit être installé en premier. Dans son `.env`, renseigner l'adresse de l'administrateur :

```
ADMIN_EMAIL=prenom.nom@exemple.fr
ADMIN_PRENOM=Prénom
ADMIN_NOM=Nom
```

Au premier démarrage, le SSO crée ce compte et lui envoie un **lien d'activation** pour choisir son mot de passe.
Le lien est aussi écrit dans les logs du SSO, au cas où le mail n'arriverait pas.

### 2. Base de données

```bash
sudo -u postgres createuser -P ehpad_user
sudo -u postgres createdb -O ehpad_user ehpad
```

### 3. Backend

```bash
cd backend
npm ci
```

Créer `backend/.env` (droits `600`, jamais versionné) :

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql://ehpad_user:<mot de passe>@localhost:5432/ehpad` |
| `SSO_JWT_SECRET` | Même valeur que `JWT_SECRET` dans le `.env` du SSO (obligatoire) |
| `STOCKS_APP_ID` | Identifiant de l'application « Gestion des stocks » dans le SSO (obligatoire) |
| `PORT` | `3001` |
| `FRONTEND_URL` | `https://monaec.fr` |
| `NODE_ENV` | `production` |

L'identifiant de l'application se lit dans la base du SSO :
```sql
SELECT id FROM applications WHERE nom = 'Gestion des stocks';
```

Le backend refuse de démarrer si `SSO_JWT_SECRET` ou `STOCKS_APP_ID` manque.
Au premier démarrage, `init.js` crée toutes les tables, un lieu « Stock médical » et un catalogue d'exemple avec ses dotations.

Le backend tourne comme service systemd (`ehpad-inventory.service`) :
```bash
sudo systemctl enable --now ehpad-inventory
sudo journalctl -u ehpad-inventory -f
```

### 4. Frontend

```bash
cd frontend
npm ci
npm run build   # → frontend/dist, servi par nginx sous /stocks/
```

---

## Fonctionnement

### Dotations par lieu
Chaque produit peut être stocké dans plusieurs lieux (ex. « Stock médical », « Plan bleu »).
La dotation, le seuil de commande et l'emplacement sont définis **par lieu** (table `produit_lieu`).

### Flux inventaire → commande → réception
1. Créer une session d'inventaire pour un lieu (totale ou partielle par catégorie)
2. Saisir les quantités en stock et les dates de péremption
3. Terminer la session
4. Le gestionnaire consulte la vue « Commande » : quantité à commander = dotation du lieu − stock compté
5. Valider la commande par fournisseur, puis enregistrer les réceptions (totales ou partielles)

---

## Évolutions possibles
- Export PDF de la commande (avec en-tête MAPAD Group)
- Import/mise à jour du catalogue via fichier Excel
- Historique des inventaires avec graphiques de consommation
- Notifications automatiques (email) quand le stock approche du seuil
