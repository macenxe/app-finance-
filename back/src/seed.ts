// Peuple la base locale avec les produits de produits.ts si elle est vide.
import { ouvrirBase, ajouterProduit, listerProduits } from './db';
import { PRODUITS } from './produits';

export function seederBase(db: ReturnType<typeof ouvrirBase>): void {
  if (listerProduits(db).length === 0) {
    for (const p of PRODUITS) ajouterProduit(db, p);
    console.log(`Seed : ${PRODUITS.length} produits insérés.`);
  }
  // Backfill des dates d'émission sur les bases déjà peuplées (colonne migrée à vide).
  const maj = db.prepare(`UPDATE produits SET emission = ? WHERE isin = ? AND (emission IS NULL OR emission = '')`);
  for (const p of PRODUITS) maj.run(p.emission, p.isin);
}
