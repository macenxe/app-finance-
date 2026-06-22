import YahooFinance from 'yahoo-finance2';
import { CoursMarche } from './types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
