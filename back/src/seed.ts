// Peuple la base locale avec les produits de produits.ts si elle est vide.
import { ouvrirBase, ajouterProduit, listerProduits } from './db';
import { PRODUITS } from './produits';

export function seederBase(db: ReturnType<typeof ouvrirBase>): void {
  if (listerProduits(db).length > 0) return; // déjà seedé
  for (const p of PRODUITS) ajouterProduit(db, p);
  console.log(`Seed : ${PRODUITS.length} produits insérés.`);
}
