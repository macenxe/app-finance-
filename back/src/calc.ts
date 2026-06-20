import { ProduitStructure, CoursMarche, IndicateursProduit, StatutBarriere } from './types';

// Calcule les indicateurs d'un produit à partir de son dernier cours de marché.
// Hypothèse provisoire : barrière de protection à la baisse (le cours doit rester au-dessus).
export function calculerIndicateurs(
  produit: ProduitStructure,
  cours: CoursMarche,
): IndicateursProduit {
  const statutBarriere: StatutBarriere =
    cours.dernierCours >= produit.barriere ? 'intacte' : 'franchie';

  return {
    produitId: produit.id,
    distanceStrike: pourcentageEcart(cours.dernierCours, produit.strike),
    distanceBarriere: pourcentageEcart(cours.dernierCours, produit.barriere),
    statutBarriere,
  };
}

// Écart en pourcentage d'une valeur par rapport à une référence.
function pourcentageEcart(valeur: number, reference: number): number {
  return ((valeur - reference) / reference) * 100;
}
