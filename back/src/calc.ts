import { ProduitStructure, CoursMarche, IndicateursProduit } from './types';

export function calculerIndicateurs(
  produit: ProduitStructure,
  cours: CoursMarche,
): IndicateursProduit {
  const niveau = cours.dernierCours;

  // % strike : uniquement pour les produits equity avec un strike défini
  let pctStrike: number | null = null;
  if (produit.typeProduit === 'equity' && produit.strike !== null) {
    pctStrike = (niveau / produit.strike) * 100;
  }

  // Zone autocall (rappel automatique déclenché)
  let zoneAutocall = false;

  if (produit.typeProduit === 'equity') {
    if (produit.barriereAutocall !== null && produit.strike !== null) {
      const seuilAbs = (produit.barriereAutocall / 100) * produit.strike;
      // Autocall « à la baisse » si la barrière est < 100 % du strike : rappel quand le
      // sous-jacent descend au seuil. Sinon autocall classique : rappel au-dessus du seuil.
      const estBaisse = produit.barriereAutocall < 100;
      zoneAutocall = estBaisse ? niveau <= seuilAbs : niveau >= seuilAbs;
    }
  } else if (produit.typeProduit === 'cms') {
    // CMS = produit de taux à la baisse : niveau = taux en % (ex: 2.93), barrières = taux
    // absolus en %. Rappelé quand le taux descend à / sous la barrière autocall.
    if (produit.barriereAutocall !== null && niveau <= produit.barriereAutocall) {
      zoneAutocall = true;
    }
  }

  return { produitId: produit.id, pctStrike, zoneAutocall };
}
