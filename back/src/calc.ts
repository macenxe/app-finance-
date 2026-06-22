import { ProduitStructure, CoursMarche, IndicateursProduit, StatutZone } from './types';

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

  // Zone autocall : cours >= barriereAutocall (pour equity) ou toujours false (CMS)
  let zoneAutocall = false;
  if (produit.typeProduit === 'equity' && produit.barriereAutocall !== null && produit.strike !== null) {
    const seuilAbs = (produit.barriereAutocall / 100) * produit.strike;
    zoneAutocall = niveau >= seuilAbs;
  }

  // Statut de zone
  let statutZone: StatutZone;
  if (zoneAutocall) {
    statutZone = 'rappel_probable';
  } else if (produit.typeProduit === 'equity' && pctStrike !== null && pctStrike < 75) {
    statutZone = 'risque';
  } else {
    statutZone = 'surveillance';
  }

  return { produitId: produit.id, pctStrike, zoneAutocall, statutZone };
}
