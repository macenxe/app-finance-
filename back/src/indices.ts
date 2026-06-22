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

const BDF_BASE = 'https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/exports/json';

// TEC10 — Taux de l'Echéance Constante 10 ans (Banque de France, quotidien)
// C'est l'indice de référence des autocalls CMS français.
export const BDF_TAUX: { seriesId: string; nom: string }[] = [
  { seriesId: 'FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA', nom: 'CMS 10 ans' },
];

export async function recupererTauxBDF(apiKey: string): Promise<CoursMarche[]> {
  const resultats: CoursMarche[] = [];
  for (const serie of BDF_TAUX) {
    try {
      const params = new URLSearchParams({
        select: 'time_period_start,obs_value',
        where:  `series_key='${serie.seriesId}'`,
        order_by: 'time_period_start desc',
        limit: '10',
        apikey: apiKey,
      });
      const resp = await fetch(`${BDF_BASE}?${params}`);
      if (!resp.ok) continue;
      const data = await resp.json() as { time_period_start: string; obs_value: number | null }[];
      const valides = data.filter((o) => o.obs_value !== null);
      if (valides.length === 0) continue;
      const dernierCours = valides[0].obs_value as number;
      const precedent    = valides.length > 1 ? (valides[1].obs_value as number) : null;
      const variationPct = (precedent && precedent !== 0)
        ? (dernierCours - precedent) / precedent * 100
        : undefined;
      resultats.push({
        sousJacent:   serie.seriesId,
        dernierCours,
        heureCours:   new Date(valides[0].time_period_start).toISOString(),
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
  { ticker: '^NDX',      nom: 'Nasdaq'            },
  { ticker: '^FCHI',     nom: 'CAC 40'            },
  { ticker: 'SX7E.PA',   nom: 'Euro Stoxx Banks'  },
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
  return resultats.map((q) => ({
    sousJacent:   q.symbol,
    dernierCours: q.regularMarketPrice ?? 0,
    heureCours:   q.regularMarketTime
      ? new Date(q.regularMarketTime).toISOString()
      : new Date().toISOString(),
    variationPct: q.regularMarketChangePercent ?? undefined,
  }));
}

export async function recupererIndices(): Promise<CoursMarche[]> {
  return recupererCours(INDICES_DASHBOARD.map((i) => i.ticker));
}
