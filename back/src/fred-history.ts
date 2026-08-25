// Actualise les 4 séries FRED du tableau de bord (Bund 10 ans, US 10 ans, €STR, inflation
// zone euro) : régénère front/data/history/<SID>.json et réécrit les 4 entrées HISTO_DERNIER
// de front/data.js (valeur, variation, fraîcheur). Remplace l'ancienne routine mensuelle
// locale (D21) ; l'OAT FRED n'est plus traitée (quotidienne via oat-history.ts).
// Lancé par GitHub Actions (.github/workflows/cms-daily.yml) ; à exécuter depuis back/.
// FRED_API_KEY attendu dans l'environnement.

import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const CLE = process.env.FRED_API_KEY;
if (!CLE) throw new Error('FRED_API_KEY absent de l\'environnement');

const HISTORY_DIR = join(process.cwd(), '..', 'front', 'data', 'history');
const DATA_JS = join(process.cwd(), '..', 'front', 'data.js');

type Point = { t: number; c: number };

// mensuelle : fraîcheur affichée « mois AAAA » (sinon « au JJ/MM ») ; pt : variation en points
// (inflation) plutôt qu'en points de base ; sansVar : jamais de texte de variation (carte €STR,
// mention « stable » retirée à la demande — D14).
const SERIES = [
  { sid: 'DGS10',                 prefixe: 'fred', mensuelle: false, pt: false, sansVar: false },
  { sid: 'IRLTLT01DEM156N',       prefixe: 'fred', mensuelle: true,  pt: false, sansVar: false },
  { sid: 'ECBESTRVOLWGTTRMDMNRT', prefixe: 'fred', mensuelle: false, pt: false, sansVar: true  },
  { sid: 'CP0000EZ19M086NEST',    prefixe: 'hicp', mensuelle: true,  pt: true,  sansVar: false },
];

async function observations(sid: string): Promise<Point[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${sid}&api_key=${CLE}`
    + '&file_type=json&observation_start=2014-01-01&sort_order=asc';
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${sid} : FRED HTTP ${r.status}`);
  const obs: { date: string; value: string }[] = (await r.json())?.observations || [];
  const points = obs
    .filter((o) => o.value !== '.')
    .map((o) => ({ t: Math.floor(Date.parse(o.date + 'T00:00:00Z') / 1000), c: Number(o.value) }));
  if (points.length < 13) throw new Error(`${sid} : série trop courte (${points.length} points)`);
  return points;
}

// CP0000EZ19M086NEST est un INDICE de prix : converti en glissement annuel (i vs i-12).
const glissementAnnuel = (pts: Point[]): Point[] =>
  pts.slice(12).map((p, i) => ({ t: p.t, c: (p.c / pts[i].c - 1) * 100 }));

const fr = (n: number, dec: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
              'septembre', 'octobre', 'novembre', 'décembre'];

function entreeHisto(s: (typeof SERIES)[number], pts: Point[]): string {
  const dernier = pts[pts.length - 1], precedent = pts[pts.length - 2];
  const valeur = s.pt ? `${fr(dernier.c, 1)} %` : `${fr(dernier.c, 2)} %`;
  const d = new Date(dernier.t * 1000);
  const date = s.mensuelle
    ? `${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : `au ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  let vr = '', hausse = 'null';
  if (!s.sansVar) {
    const ecart = s.pt
      ? Math.round((dernier.c - precedent.c) * 10) / 10
      : Math.round((dernier.c - precedent.c) * 100);
    if (ecart !== 0) {
      hausse = String(ecart > 0);
      vr = s.pt ? `${ecart > 0 ? '+' : '-'}${fr(Math.abs(ecart), 1)} pt` : `${ecart > 0 ? '+' : '-'}${Math.abs(ecart)} pb`;
    }
  }
  return `{ valeur:'${valeur}', var:'${vr}', hausse:${hausse}, date:'${date}' }`;
}

async function main() {
  const resume: string[] = [];
  let dataJs = readFileSync(DATA_JS, 'utf8');
  const dataJsAvant = dataJs;

  for (const s of SERIES) {
    const brut = await observations(s.sid);
    const pts = s.pt ? glissementAnnuel(brut) : brut;
    writeFileSync(join(HISTORY_DIR, `${s.sid}.json`),
      JSON.stringify({ ticker: `${s.prefixe}:${s.sid}`, points: pts, devise: '%' }));
    const cle = `${s.prefixe}:${s.sid}`;
    const motif = new RegExp(`^(\\s*'${cle}':\\s*)\\{[^}]*\\},$`, 'm');
    if (!motif.test(dataJs)) throw new Error(`${cle} : entrée HISTO_DERNIER introuvable dans data.js`);
    dataJs = dataJs.replace(motif, `$1${entreeHisto(s, pts)},`);
    resume.push(`${s.sid} ${pts.length} pts (dernier ${pts[pts.length - 1].c})`);
  }

  if (dataJs !== dataJsAvant) {
    writeFileSync(DATA_JS, dataJs);
    try {
      execFileSync('node', ['--check', DATA_JS]);
    } catch {
      writeFileSync(DATA_JS, dataJsAvant); // data.js cassé = site cassé : on restaure
      throw new Error('node --check a échoué après réécriture de HISTO_DERNIER, data.js restauré');
    }
  }
  console.log(`Séries FRED actualisées : ${resume.join(' · ')}. HISTO_DERNIER ${dataJs !== dataJsAvant ? 'réécrit' : 'inchangé'}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
