import YahooFinance from 'yahoo-finance2';
import { CoursMarche } from './types';

// Version 3 de la bibliothèque : on crée une instance réutilisable.
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Principaux indices suivis : ticker Yahoo -> nom lisible.
export const INDICES: { ticker: string; nom: string }[] = [
  { ticker: '^FCHI', nom: 'CAC 40' },
  { ticker: '^STOXX50E', nom: 'EuroStoxx 50' },
  { ticker: '^GSPC', nom: 'S&P 500' },
  { ticker: '^NDX', nom: 'Nasdaq 100' },
  { ticker: '^GDAXI', nom: 'DAX' },
  { ticker: '^FTSE', nom: 'FTSE 100' },
];

// Récupère le dernier cours de chaque indice auprès de Yahoo Finance.
export async function recupererIndices(): Promise<CoursMarche[]> {
  const tickers = INDICES.map((i) => i.ticker);
  const resultats = await yahooFinance.quote(tickers);
  return resultats.map((q) => ({
    sousJacent: q.symbol,
    dernierCours: q.regularMarketPrice ?? 0,
    heureCours: q.regularMarketTime
      ? new Date(q.regularMarketTime).toISOString()
      : new Date().toISOString(),
  }));
}
