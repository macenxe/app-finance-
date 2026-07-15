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

## Produits (ajout / modification / retrait)

La liste des produits existe en **deux exemplaires** qu'il faut garder synchronisés :

- `back/src/produits.ts` : source de vérité (typée). Alimente le snapshot publié en ligne.
- `front/data.js` (`const PRODUITS`) : repli statique affiché hors-ligne, avec la mise en
  forme d'écran (chaînes « 215,10 », « 7 % », niveau de repli, etc.).

Pour chaque changement : éditer **les deux** fichiers. Après modification de `produits.ts`,
le workflow `snapshot.yml` régénère automatiquement `front/data/snapshot.json`.

> Un vrai « source unique » (générateur de `PRODUITS` depuis `produits.ts`) reste à faire :
> les chaînes du front sont mises en forme à la main, un générateur changerait leur rendu.

## Rappel automatique et coupons

Chaque produit porte une date d'`emission` (constatation initiale du strike). Ces dates sont
estimées (prochaine constatation moins un an) et doivent être corrigées avec les termsheets.

À l'ouverture, le module `front/autocall.js` rejoue les constatations passées à partir de
l'historique de cours. Un produit dont la barrière autocall a été franchie est masqué de la
liste (compté dans les « rappelés »). Le retrait définitif des deux listes (`back/src/produits.ts`
et `front/data.js`) reste manuel.

La comptabilité suit la période en cours (N+X) et la réserve de coupons avec effet mémoire :
un coupon manqué est mis en réserve et versé à la première constatation favorable ; les produits
sans barrière de coupon capitalisent jusqu'au rappel ou à l'échéance. Les résultats des dates
passées sont figés dans le cache localStorage `autocall-eval-v1` pour éviter les refetch.
