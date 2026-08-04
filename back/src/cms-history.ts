// Append quotidien de front/data/history/cms.json (CMS 10 ans EUR, backfill + historique
// long) : lit la dernière clôture publiée par l'API publique Chatham et l'ajoute si elle est
// postérieure au dernier point du fichier. Idempotent (ne réécrit rien si déjà à jour).
// Lancé par GitHub Actions (voir .github/workflows/cms-daily.yml) ; à exécuter depuis back/.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FICHIER = join(process.cwd(), '..', 'front', 'data', 'history', 'cms.json');
const CHATHAM_URL = 'https://cf.com/public-api/public-rates/euribor6monthswap.json/';

type Point = { t: number; c: number };
type Historique = { ticker: string; points: Point[]; devise: string };

async function dernierePointChatham(): Promise<{ t: number; c: number }> {
  const r = await fetch(CHATHAM_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const rate = (d.Rates || []).find((x: any) => x.LengthInMonths === 120);
  const valeur = rate ? parseFloat(rate.PreviousDay) : NaN;
  const date = d.PreviousDayDate;
  if (!isFinite(valeur) || !date) throw new Error('réponse Chatham incomplète');
  const t = Math.floor(Date.parse(date + 'T00:00:00Z') / 1000);
  if (!isFinite(t)) throw new Error(`date Chatham invalide : ${date}`);
  return { t, c: valeur };
}

async function main() {
  const historique: Historique = JSON.parse(readFileSync(FICHIER, 'utf8'));
  const dernier = historique.points[historique.points.length - 1];
  const point = await dernierePointChatham();

  if (dernier && point.t <= dernier.t) {
    console.log(`cms.json déjà à jour (dernier point : ${new Date(dernier.t * 1000).toISOString().slice(0, 10)}).`);
    return;
  }

  historique.points.push(point);
  writeFileSync(FICHIER, JSON.stringify(historique));
  console.log(`cms.json : point ajouté (${new Date(point.t * 1000).toISOString().slice(0, 10)}, ${point.c}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
