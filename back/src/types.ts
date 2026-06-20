// Trois familles de données échangées entre le front et le back.
// Les champs sont provisoires et seront affinés plus tard.

// --- 1. Produit structuré : saisi à la main et stocké en base ---

export type TypeBarriere = 'europeenne' | 'americaine' | 'continue';

export interface ProduitStructure {
  id: number;
  nom: string;
  sousJacent: string;
  strike: number;
  barriere: number;
  typeBarriere: TypeBarriere;
  echeance: string; // date au format ISO, ex. '2028-06-20'
  coupon: number; // en pourcentage, ex. 8 pour 8 %
}

// Produit avant insertion : sans id, qui est généré par la base.
export type NouveauProduit = Omit<ProduitStructure, 'id'>;

// --- 2. Cours de marché : récupéré au fournisseur à chaque rafraîchissement ---

export interface CoursMarche {
  sousJacent: string;
  dernierCours: number;
  heureCours: string; // date-heure au format ISO
}

// --- 3. Indicateurs calculés : produits par le back, non stockés ---

export type StatutBarriere = 'intacte' | 'franchie';

export interface IndicateursProduit {
  produitId: number;
  distanceStrike: number; // écart en %, (cours - strike) / strike * 100
  distanceBarriere: number; // écart en %, (cours - barrière) / barrière * 100
  statutBarriere: StatutBarriere;
}
