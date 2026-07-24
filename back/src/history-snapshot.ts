// Génère front/data/history/eq/<ticker>.json : historique de prix (10 ans, quotidien) pour
// les tickers actions/indices utilisés par les graphiques (dashboard, fiches produit,
// sparklines Actifs). Sert de repli quand le Worker Cloudflare est injoignable côté client
// (ex. pare-feu d'entreprise bloquant *.workers.dev) — même principe que le repli statique
// déjà en place pour les taux/inflation (front/data/history/*.json, fred:/hicp:).
// Lancé par GitHub Actions (voir .github/workflows/snapshot.yml) ; à exécuter depuis back/.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SORTIE_DIR = join(process.cwd(), '..', 'front', 'data', 'history', 'eq');

// Indices marché (data.js INDICES_MARCHE) + sous-jacents actions des produits (via
// chartTickerPour, app.js) + Actifs suivis en sparkline (Brent/Or/Bitcoin, data.js GRAPH_IDS_*).
// CMS10 (scrape:cms, proxy FT) n'a pas d'équivalent Yahoo : pas de repli statique possible.
const TICKERS = [
  '^FCHI', '^STOXX50E', 'BNKE.PA', '^GSPC', '^IXIC', 'IWDA.AS',
  'BNP.PA', 'STLAM.MI', 'CAP.PA', 'RHM.DE',
  'GC=F', 'BZ=F', 'BTC-USD',
];

const fichierPour = (ticker: string) => ticker.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json';

async function historique(ticker: string): Promise<{ ticker: string; points: { t: number; c: number }[] }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=10y&interval=1d&includePrePost=false`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const res = (await r.json())?.chart?.result?.[0];
  if (!res?.timestamp) throw new Error('réponse Yahoo vide');
  const closes: (number | null)[] = res.indicators?.quote?.[0]?.close || [];
  const points: { t: number; c: number }[] = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const c = closes[i];
    if (c != null) points.push({ t: res.timestamp[i], c });
  }
  if (points.length < 2) throw new Error('pas assez de points');
  return { ticker, points };
}

async function main() {
  mkdirSync(SORTIE_DIR, { recursive: true });
  let ok = 0, ko = 0;
  for (const ticker of TICKERS) {
    try {
      const data = await historique(ticker);
      writeFileSync(join(SORTIE_DIR, fichierPour(ticker)), JSON.stringify(data));
      ok++;
    } catch (e) {
      console.error(`Historique indisponible pour ${ticker} :`, e);
      ko++;
    }
    // Pause entre requêtes pour ne pas déclencher le rate-limit anti-bot de Yahoo.
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`Historique généré : ${ok} tickers OK, ${ko} en échec.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
