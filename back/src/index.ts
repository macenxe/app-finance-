import { ouvrirBase, ajouterProduit, listerProduits, enregistrerCours, lireCours } from './db';
import { calculerIndicateurs } from './calc';

// Point d'entrée provisoire : initialise la base et vérifie la chaîne complète
// (produit -> cours -> indicateurs). Sera remplacé par une API HTTP plus tard.
const db = ouvrirBase();
console.log('Base SQLite prête (data.db).');

// Ajoute un produit de démonstration si la base est vide.
if (listerProduits(db).length === 0) {
  ajouterProduit(db, {
    nom: 'Phoenix Memory Eurostoxx',
    sousJacent: 'SX5E',
    strike: 4500,
    barriere: 3150,
    typeBarriere: 'europeenne',
    echeance: '2028-06-20',
    coupon: 8,
  });
  console.log('Produit de démonstration ajouté.');
}

// Simule un cours de marché reçu du fournisseur.
enregistrerCours(db, {
  sousJacent: 'SX5E',
  dernierCours: 4200,
  heureCours: '2026-06-20T15:30:00Z',
});

// Calcule et affiche les indicateurs pour chaque produit.
for (const produit of listerProduits(db)) {
  const cours = lireCours(db, produit.sousJacent);
  if (!cours) continue;
  console.log(produit.nom, calculerIndicateurs(produit, cours));
}

db.close();
