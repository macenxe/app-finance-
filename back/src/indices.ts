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
