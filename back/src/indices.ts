import YahooFinance from 'yahoo-finance2';
import { CoursMarche } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// Taux OAT et Bund via FRED (données mensuelles ECB, décalage ~1 mois)
export const FRED_TAUX: { seriesId: string; nom: string }[] = [
  { seriesId: 'IRLTLT01FRM156N', nom: 'OAT 10 ans'  },
  { seriesId: 'IRLTLT01DEM156N', nom: 'Bund 10 ans' },
];

export async function recupererTauxFRED(apiKey: string): Promise<CoursMarche[]> {
  const resultats: CoursMarche[] = [];
  for (const serie of FRED_TAUX) {
    try {
      const url = `${FRED_BASE}?series_id=${serie.seriesId}&api_key=${apiKey}&sort_order=desc&limit=2&file_type=json`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json() as { observations: { date: string; value: string }[] };
      const valides = data.observations.filter((o) => o.value !== '.' && o.value !== 'NA');
      if (valides.length === 0) continue;
      const dernierCours = parseFloat(valides[0].value);
      const precedent    = valides.length > 1 ? parseFloat(valides[1].value) : null;
      const variationPct = (precedent && precedent !== 0)
        ? (dernierCours - precedent) / precedent * 100
        : undefined;
      resultats.push({
        sousJacent:   serie.seriesId,
        dernierCours,
        heureCours:   new Date(valides[0].date).toISOString(),
        variationPct,
      });
    } catch {
      // série indisponible, on ignore
    }
  }
  return resultats;
}

// Indices de marché suivis dans le dashboard
export const INDICES_DASHBOARD: { ticker: string; nom: string }[] = [
  { ticker: '^STOXX50E', nom: 'Euro Stoxx 50'    },
  { ticker: '^GSPC',     nom: 'S&P 500'          },
  { ticker: '^IXIC',     nom: 'Nasdaq'            },
  { ticker: '^FCHI',     nom: 'CAC 40'            },
  // SX7E.PA non supporté par Yahoo Finance — Euro Stoxx Banks via fallback statique front
];

// Taux obligataires 10 ans suivis dans le dashboard.
// Yahoo Finance ne propose pas OAT ni Bund via son API quote — seul ^TNX fonctionne.
// OAT et Bund restent statiques côté front tant qu'aucune source alternative n'est branchée.
export const TAUX_DASHBOARD: { ticker: string; nom: string }[] = [
  { ticker: '^TNX', nom: 'US 10 ans' },
];

export async function recupererTaux(): Promise<CoursMarche[]> {
  return recupererCours(TAUX_DASHBOARD.map((t) => t.ticker));
}

// Tickers sous-jacents des produits (actions + indices)
export const TICKERS_PRODUITS = [
  '^FCHI', 'SX7E.PA', 'BNP.PA', 'STLAM.MI', 'CAP.PA',
];

// Récupère les cours Yahoo Finance pour une liste de tickers
export async function recupererCours(tickers: string[]): Promise<CoursMarche[]> {
  if (tickers.length === 0) return [];
  const resultats = await yahooFinance.quote(tickers);
  // Un cours absent (marché fermé, ticker invalide) est ignoré plutôt que ramené à 0 :
  // évite d'écraser le dernier bon cours en base et d'afficher un niveau à 0,00.
  return resultats
    .filter((q) => q.regularMarketPrice != null)
    .map((q) => ({
      sousJacent:   q.symbol,
      dernierCours: q.regularMarketPrice!,
      heureCours:   q.regularMarketTime
        ? new Date(q.regularMarketTime).toISOString()
        : new Date().toISOString(),
      variationPct: q.regularMarketChangePercent ?? undefined,
    }));
}

// Cours via l'endpoint chart (meta.regularMarketPrice) plutôt que l'API quote : requis pour les
// symboles servis en chart mais pas en quote (ex. SX7E.Z, indice Euro Stoxx Banks). Renvoie null
// en cas d'échec pour préserver le contrat « on garde l'ancienne valeur » côté appelant.
export async function coursViaChart(symbol: string): Promise<CoursMarche | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const data = (await r.json()) as { chart?: { result?: { meta?: Record<string, number | undefined> }[] } };
    const m = data?.chart?.result?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) return null;
    const prev = m.chartPreviousClose ?? m.previousClose ?? null;
    return {
      sousJacent:   symbol,
      dernierCours: m.regularMarketPrice,
      heureCours:   new Date((m.regularMarketTime ?? 0) * 1000).toISOString(),
      variationPct: prev && prev !== 0 ? ((m.regularMarketPrice - prev) / prev) * 100 : undefined,
    };
  } catch { return null; }
}

export async function recupererIndices(): Promise<CoursMarche[]> {
  return recupererCours(INDICES_DASHBOARD.map((i) => i.ticker));
}
