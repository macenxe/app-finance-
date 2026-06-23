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

  // Zone autocall et statut
  let zoneAutocall = false;
  let statutZone: StatutZone = 'surveillance';

  if (produit.typeProduit === 'equity') {
    if (produit.barriereAutocall !== null && produit.strike !== null) {
      const seuilAbs = (produit.barriereAutocall / 100) * produit.strike;
      zoneAutocall = niveau >= seuilAbs;
    }
    if (zoneAutocall) {
      statutZone = 'rappel_probable';
    } else if (pctStrike !== null && pctStrike < 75) {
      statutZone = 'risque';
    }
  } else if (produit.typeProduit === 'cms') {
    // Pour CMS : niveau = taux en % (ex: 3.18)
    // barriereAutocall et barriereCoupon sont des taux absolus en %
    if (produit.barriereAutocall !== null && niveau >= produit.barriereAutocall) {
      zoneAutocall = true;
      statutZone = 'rappel_probable';
    } else if (produit.barriereCoupon !== null && niveau < produit.barriereCoupon) {
      statutZone = 'risque';
    }
  }

  return { produitId: produit.id, pctStrike, zoneAutocall, statutZone };
}
