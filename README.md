# app-finance

Application interne de suivi de produits structurés pour un cabinet de gestion de patrimoine.
PWA, usage interne (deux utilisateurs). Données internes non sensibles.

## Structure du dépôt

- `front/` : interface (PWA), gérée par le collègue (issue de Claude Design).
- `back/` : API et logique métier, TypeScript + SQLite.

Chacun travaille dans son dossier. Les conflits sont donc quasi inexistants.

## Trois familles de données (contrat front / back)

1. **Produit structuré** (saisi et stocké) : nom, sous-jacent, strike, barrière, type de barrière, échéance, coupon.
2. **Cours de marché** (récupéré au fournisseur) : sous-jacent, dernier cours, heure du cours.
3. **Indicateurs calculés** (produits par le back) : distance au strike, distance à la barrière, statut par rapport à la barrière.

## Lancer le back

```bash
cd back
npm install      # à faire une seule fois
npm run dev      # lance le back en mode développement
```

## Workflow Git

1. `git pull` avant de commencer à coder (récupérer le travail de l'autre).
2. Travailler dans son dossier (`front/` ou `back/`).
3. `git add`, `git commit`, puis `git push` une fois le travail fait.
