# 🌴 La Palmeraie — Gestion des Stocks

Application PWA de gestion des stocks pour restaurant-bar.

---

## Structure du projet

```
palmeraie/
├── frontend/
│   ├── index.html       → Application principale
│   ├── login.html       → Page de connexion
│   ├── style.css        → Tous les styles
│   ├── api.js           → Client API partagé
│   ├── app.js           → Logique + toutes les pages
│   ├── manifest.json    → Config PWA
│   └── sw.js            → Service worker (mode hors-ligne)
│
├── backend/
│   ├── main.py          → Serveur FastAPI (point d'entrée)
│   ├── database.py      → Base de données SQLite
│   ├── auth.py          → Authentification JWT
│   ├── models.py        → Modèles de données
│   └── routes/
│       ├── auth.py      → Login
│       ├── products.py  → Gestion des produits
│       ├── shopping.py  → Sessions d'achat
│       ├── exits.py     → Sorties fin de journée
│       ├── losses.py    → Journal des pertes
│       └── reports.py   → Rapports & utilisateurs
│
├── requirements.txt     → Dépendances Python
├── start.sh             → Script de démarrage
└── README.md
```

---

## Installation & Démarrage

### 1. Prérequis
- Python 3.10 ou supérieur

### 2. Démarrer le backend

```bash
bash start.sh
```

Ou manuellement :
```bash
cd backend
pip install -r ../requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Le serveur démarre sur **http://localhost:8000**
Documentation API interactive : **http://localhost:8000/docs**

### 3. Ouvrir le frontend

**Option A — Simple (fichier local) :**
Ouvrez `frontend/index.html` directement dans Chrome.

**Option B — Serveur local (recommandé pour le PWA) :**
```bash
cd frontend
python3 -m http.server 3000
```
Puis ouvrez **http://localhost:3000**

---

## Connexion par défaut

| Champ       | Valeur      |
|-------------|-------------|
| Identifiant | `admin`     |
| Mot de passe| `admin123`  |

⚠️ **Changez ce mot de passe en production !**

---

## Fonctionnalités

| Page              | Accès    | Description |
|-------------------|----------|-------------|
| Tableau de bord   | Tous     | Stock actuel, alertes, derniers mouvements |
| Nouveau Shopping  | Tous     | Enregistrer une session d'achat avec photo reçu |
| Fin de Journée    | Tous     | Logger les consommations de la journée |
| Journal des Pertes| Tous     | Signaler casse, péremption, vol |
| Historique        | Admin    | Audit complet de tous les mouvements |
| Produits          | Tous     | Catalogue (ajout/modif : admin seulement) |
| Rapports          | Admin    | Stats + gestion des utilisateurs |

---

## Installation comme application (PWA)

1. Ouvrez l'app dans Chrome sur téléphone ou PC
2. Chrome affichera une bannière "Installer l'application"
3. Ou : Menu Chrome → "Ajouter à l'écran d'accueil"
4. L'app s'installe avec son propre icône, sans barre de navigateur

---

## En production

1. Déployez le backend FastAPI sur un serveur (ex: VPS, Railway, Render)
2. Servez le frontend via Nginx ou Vercel
3. Changez `API_BASE` dans `api.js` pour pointer vers votre serveur
4. Activez HTTPS (obligatoire pour le PWA)
5. Changez `SECRET_KEY` dans `backend/auth.py` via variable d'environnement
