// Génère et maintient front/data/history/oat.json (OAT 10 ans, rendement quotidien de
// l'emprunt phare français) : fenêtre quotidienne Boursorama (365 j max par appel, symbole
// 2xFRABM10A) fusionnée avec l'existant ; à la création, la profondeur (< 1 an glissant)
// est amorcée par la série FRED mensuelle IRLTLT01FRM156N déjà publiée dans front/data/history/.
// Boursorama exige un cookie de session : on visite la page de cotation avant l'appel ws.
// Idempotent (ne réécrit rien si aucun point nouveau). Lancé par GitHub Actions
// (.github/workflows/cms-daily.yml) ; à exécuter depuis back/.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FICHIER = join(process.cwd(), '..', 'front', 'data', 'history', 'oat.json');
const FICHIER_FRED = join(process.cwd(), '..', 'front', 'data', 'history', 'IRLTLT01FRM156N.json');
const PAGE = 'https://www.boursorama.com/bourse/taux/cours/2xFRABM10A/';
const WS = 'https://www.boursorama.com/bourse/action/graph/ws/GetTicksEOD?symbol=2xFRABM10A&length=365&period=0&guid=';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

type Point = { t: number; c: number };
type Historique = { ticker: string; points: Point[]; devise: string };

// Fenêtre quotidienne Boursorama. QuoteTab.d = jours depuis epoch, c = clôture (en %).
async function pointsBoursorama(): Promise<Point[]> {
  const page = await fetch(PAGE, { headers: { 'User-Agent': UA } });
  if (!page.ok) throw new Error(`page cotation HTTP ${page.status}`);
  const cookie = (page.headers.getSetCookie?.() || []).map((s) => s.split(';')[0]).join('; ');
  const r = await fetch(WS, {
    headers: {
      'User-Agent': UA, Cookie: cookie, Referer: PAGE,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });
  if (!r.ok) throw new Error(`ws HTTP ${r.status}`);
  const quoteTab: { d: number; c: number }[] = (await r.json())?.d?.QuoteTab || [];
  const points = quoteTab
    .filter((q) => isFinite(q.d) && isFinite(q.c) && q.c > 0)
    .map((q) => ({ t: q.d * 86400, c: q.c }));
  if (points.length < 2) throw new Error('réponse Boursorama vide (session refusée ?)');
  return points;
}

// Amorce de profondeur à la création : points mensuels FRED antérieurs à la fenêtre quotidienne.
function amorceFred(avantT: number): Point[] {
  try {
    const fred: { points: Point[] } = JSON.parse(readFileSync(FICHIER_FRED, 'utf8'));
    return (fred.points || []).filter((p) => p.t < avantT);
  } catch {
    return [];
  }
}

async function main() {
  const frais = await pointsBoursorama();
  const existant: Historique = existsSync(FICHIER)
    ? JSON.parse(readFileSync(FICHIER, 'utf8'))
    : { ticker: 'scrape:oat', points: amorceFred(frais[0].t), devise: '%' };

  // Fusion par jour : la fenêtre quotidienne fait foi sur sa période, l'existant est
  // conservé ailleurs (profondeur FRED, appends passés sortis de la fenêtre des 365 j).
  const jourDe = (t: number) => Math.floor(t / 86400);
  const joursFrais = new Set(frais.map((p) => jourDe(p.t)));
  const fusion = existant.points.filter((p) => !joursFrais.has(jourDe(p.t))).concat(frais).sort((a, b) => a.t - b.t);

  if (existsSync(FICHIER) && fusion.length === existant.points.length
      && fusion[fusion.length - 1].t === existant.points[existant.points.length - 1].t
      && fusion[fusion.length - 1].c === existant.points[existant.points.length - 1].c) {
    console.log(`oat.json déjà à jour (dernier point : ${new Date(fusion[fusion.length - 1].t * 1000).toISOString().slice(0, 10)}).`);
    return;
  }

  writeFileSync(FICHIER, JSON.stringify({ ticker: 'scrape:oat', points: fusion, devise: '%' }));
  const dernier = fusion[fusion.length - 1];
  console.log(`oat.json : ${fusion.length} points, dernier ${new Date(dernier.t * 1000).toISOString().slice(0, 10)} à ${dernier.c} %.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
