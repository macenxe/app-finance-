// Types partagés front/back — version étendue

// --- 1. Produit structuré ---

export type TypeProduit = 'equity' | 'cms';

export interface ProduitStructure {
  id: number;
  isin: string;
  nom: string;
  sousJacent: string;        // ticker Yahoo Finance
  sousJacentLabel: string;   // nom lisible affiché à l'écran
  typeProduit: TypeProduit;
  strike: number | null;     // null pour les CMS (pas de strike en cours)
  barriereCoupon: number | null;   // seuil de versement du coupon (null si N/A)
  barriereAutocall: number | null; // seuil de rappel automatique
  protection: string | null;       // barrière de protection du capital, ex. '-40 %' (null si garanti)
  echeance: string;          // ISO date, ex. '2030-07-25'
  constat: string;           // libellé de la prochaine date de constatation
  coupon: number;            // en %, ex. 8 pour 8 %
}

export type NouveauProduit = Omit<ProduitStructure, 'id'>;

// --- 2. Cours de marché ---

export interface CoursMarche {
  sousJacent: string;
  dernierCours: number;
  heureCours: string;      // ISO datetime
  variationPct?: number;   // % de variation journalière (non stocké en DB)
}

// --- 3. Indicateurs calculés ---

export type StatutZone = 'rappel_probable' | 'surveillance' | 'risque';

export interface IndicateursProduit {
  produitId: number;
  pctStrike: number | null;      // (cours - strike) / strike * 100, null si CMS
  zoneAutocall: boolean;         // cours >= barriereAutocall
  statutZone: StatutZone;
}

// --- 4. Réponse enrichie (produit + cours + indicateurs) ---

export interface ProduitEnrichi extends ProduitStructure {
  cours: CoursMarche | null;
  indicateurs: IndicateursProduit | null;
}
