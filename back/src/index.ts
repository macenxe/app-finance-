import { ouvrirBase, ajouterProduit, listerProduits, enregistrerCours, lireCours } from './db';
import { calculerIndicateurs } from './calc';
import { INDICES, recupererIndices } from './indices';

// Point d'entrée provisoire : récupère les indices en direct, les enregistre,
// puis calcule les indicateurs des produits. Sera remplacé par une API HTTP plus tard.
async function main() {
  const db = ouvrirBase();
  console.log('Base SQLite prête (data.db).');

  // 1. Récupère les principaux indices en direct auprès de Yahoo Finance.
  console.log('\nIndices (cours en direct) :');
  for (const cours of await recupererIndices()) {
    enregistrerCours(db, cours);
    const nom = INDICES.find((i) => i.ticker === cours.sousJacent)?.nom ?? cours.sousJacent;
    console.log(`  ${nom.padEnd(14)} ${cours.dernierCours}`);
  }

  // 2. Produit de démonstration adossé à l'EuroStoxx 50, si la base est vide.
  if (listerProduits(db).length === 0) {
    ajouterProduit(db, {
      nom: 'Phoenix Memory Eurostoxx',
      sousJacent: '^STOXX50E',
      strike: 5000,
      barriere: 3500,
      typeBarriere: 'europeenne',
      echeance: '2028-06-20',
      coupon: 8,
    });
  }

  // 3. Calcule les indicateurs de chaque produit à partir du cours réel de son sous-jacent.
  console.log('\nIndicateurs des produits :');
  for (const produit of listerProduits(db)) {
    const cours = lireCours(db, produit.sousJacent);
    if (!cours) continue;
    console.log(' ', produit.nom, calculerIndicateurs(produit, cours));
  }

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
