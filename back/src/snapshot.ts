// Génère front/data/snapshot.json : indices, taux et produits enrichis,
// au MÊME format que les endpoints du serveur (/api/indices, /api/taux, /api/produits).
// Lancé par GitHub Actions (sans base de données) ; à exécuter depuis le dossier back/.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  recupererIndices, recupererTaux, recupererCours, recupererTauxFRED,
  INDICES_DASHBOARD, TAUX_DASHBOARD, FRED_TAUX,
} from './indices';
import { calculerIndicateurs } from './calc';
import { PRODUITS, CMS_MANUEL, COURS_STATIQUES } from './produits';
import { ProduitStructure, CoursMarche, ProduitEnrichi } from './types';

const SORTIE_DIR = join(process.cwd(), '..', 'front', 'data');
const SORTIE = join(SORTIE_DIR, 'snapshot.json');

async function main() {
  const fredKey = process.env.FRED_API_KEY ?? '';
  const maintenant = new Date().toISOString();

  // Produits avec id stable (ordre du fichier produits.ts)
  const produits: ProduitStructure[] = PRODUITS.map((p, i) => ({ ...p, id: i + 1 }));

  // 1. Indices
  let indices: (CoursMarche & { nom: string })[] = [];
  try {
    const cours = await recupererIndices();
    indices = cours.map((cr) => ({
      ...cr,
      nom: INDICES_DASHBOARD.find((i) => i.ticker === cr.sousJacent)?.nom ?? cr.sousJacent,
    }));
  } catch (e) { console.error('Indices indisponibles :', e); }

  // 2. Taux : Yahoo (^TNX) + FRED (OAT/Bund) + CMS manuel
  const nomMap: Record<string, string> = {};
  TAUX_DASHBOARD.forEach((t) => { nomMap[t.ticker] = t.nom; });
  FRED_TAUX.forEach((t) => { nomMap[t.seriesId] = t.nom; });
  let taux: Record<string, unknown>[] = [];
  try {
    const [yahoo, fred] = await Promise.all([
      recupererTaux().catch(() => [] as CoursMarche[]),
      fredKey ? recupererTauxFRED(fredKey).catch(() => [] as CoursMarche[]) : Promise.resolve([] as CoursMarche[]),
    ]);
    taux = [...yahoo, ...fred].map((cr) => ({ ...cr, nom: nomMap[cr.sousJacent] ?? cr.sousJacent }));
  } catch (e) { console.error('Taux indisponibles :', e); }
  taux.push({
    nom: 'CMS 10 ans', sousJacent: 'CMS10', dernierCours: CMS_MANUEL, heureCours: maintenant,
    manuel: true, dateMaj: new Date().toLocaleDateString('fr-FR'),
  });

  // 3. Produits enrichis (cours du sous-jacent + indicateurs)
  const tickersEquity = [...new Set(produits.filter((p) => p.typeProduit === 'equity').map((p) => p.sousJacent))];
  let coursEquity: CoursMarche[] = [];
  try { coursEquity = await recupererCours(tickersEquity); } catch (e) { console.error('Cours sous-jacents indisponibles :', e); }

  const coursMap: Record<string, CoursMarche> = {};
  for (const c of coursEquity) coursMap[c.sousJacent] = c;
  for (const c of indices) coursMap[c.sousJacent] = c; // ^FCHI sert aussi de sous-jacent
  coursMap['CMS10'] = { sousJacent: 'CMS10', dernierCours: CMS_MANUEL, heureCours: maintenant };
  // Cours de secours pour les sous-jacents non couverts par Yahoo (ex. SX7E.PA)
  for (const [ticker, valeur] of Object.entries(COURS_STATIQUES)) {
    if (!coursMap[ticker]) coursMap[ticker] = { sousJacent: ticker, dernierCours: valeur, heureCours: maintenant };
  }

  const produitsEnrichis: ProduitEnrichi[] = produits.map((p) => {
    const cours = coursMap[p.sousJacent] ?? null;
    const indicateurs = cours ? calculerIndicateurs(p, cours) : null;
    return { ...p, cours, indicateurs };
  });

  mkdirSync(SORTIE_DIR, { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ genere: maintenant, indices, taux, produits: produitsEnrichis }, null, 2));
  console.log(`Snapshot écrit : ${indices.length} indices, ${taux.length} taux, ${produitsEnrichis.length} produits.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
