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
      // Autocall « à la baisse » si la barrière est < 100 % du strike : rappel quand le
      // sous-jacent descend au seuil. Sinon autocall classique : rappel au-dessus du seuil.
      const estBaisse = produit.barriereAutocall < 100;
      zoneAutocall = estBaisse ? niveau <= seuilAbs : niveau >= seuilAbs;
    }
    if (zoneAutocall) {
      statutZone = 'rappel_probable';
    } else if (pctStrike !== null && pctStrike < 75) {
      statutZone = 'risque';
    }
  } else if (produit.typeProduit === 'cms') {
    // CMS = produit de taux à la baisse : niveau = taux en % (ex: 2.93), barrières = taux
    // absolus en %. Rappelé quand le taux descend à / sous la barrière autocall.
    if (produit.barriereAutocall !== null && niveau <= produit.barriereAutocall) {
      zoneAutocall = true;
      statutZone = 'rappel_probable';
    } else if (produit.barriereCoupon !== null && niveau > produit.barriereCoupon) {
      // Taux au-dessus de la barrière de coupon : pas de coupon, zone défavorable.
      statutZone = 'risque';
    }
  }

  return { produitId: produit.id, pctStrike, zoneAutocall, statutZone };
}
