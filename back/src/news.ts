// Récupère des actualités via Google News RSS (pas de clé API requise).
// Filtre les titres à faible impact marché et détecte le sentiment (positive/negative/neutre).

export interface Article {
  titre: string;
  source: string;
  date: string;
  lien: string;
  tag?: string;
  sentiment: 'positive' | 'negative' | 'neutre';
}

// Sources autorisées (liste blanche)
const SOURCES_AUTORISEES = [
  'les echos', 'bfm bourse', 'boursorama', 'morningstar', 'le revenu',
  'zonebourse', 'tradingview', 'capital', 'reuters', 'bloomberg', 'l\'agefi',
];

function sourceAutorisee(source: string): boolean {
  const s = source.toLowerCase();
  return SOURCES_AUTORISEES.some(a => s.includes(a));
}

// Mots-clés qui signalent un impact marché réel (filtre anti-bruit)
const MOTS_IMPACT = [
  'bourse','cours','cac','stoxx','nasdaq','s&p','action','titre','marché','marchés',
  'taux','inflation','récession','croissance','pib','fed','bce','banque centrale',
  'résultats','bénéfices','chiffre d\'affaires','dividende','rachat','fusion','acquisition',
  'avertissement','profit warning','révision','objectif','recommandation','analyste',
  'hausse','baisse','chute','rebond','record','correction','volatilité','spread',
  'obligation','dette','souverain','swap','irs','liquidité','crédit',
  'secteur bancaire','banques','énergie','défense','technologie',
  'capgemini','bnp','stellantis','rheinmetall',
];

// Sentiment positif
const MOTS_POSITIFS = [
  'hausse','en hausse','rebond','rebondit','progression','progresse','croissance','record',
  'gains','gain','surperformance','relève','relèvement','optimisme','accord','allège',
  'dépasse','accélère','amélioration','améliore','surperforme','bond','bondit','monte',
  'favorable','soutien','solide','achat','surpondérer','objectif relevé','confiance',
  'reprise','dynamisme','expansion','résilience','résistant','résiste','surpasse',
  'profite','profiteront','profitent','bénéfices en hausse','résultats solides',
  'bat les attentes','dépasse les attentes','meilleur','fort','excellent','signal positif',
  'bon signal','remonte','se redresse','reprend','accélération','porteur','supérieur',
];

// Sentiment négatif
const MOTS_NEGATIFS = [
  'baisse','en baisse','à la baisse','chute','chute de','plonge','plongée','recul','recule',
  'repli','crainte','risque','perte','pertes','tension','alerte','prudence','déception',
  'décevant','décevants','décevante','incertitude','ralentissement','contraction',
  'correction','avertissement','effondrement','s\'effondre','effondre','faillite',
  'défaut','crise','stress','déficit','inquiétude','menace','pression','vente','vendez',
  'sous-pondérer','objectif abaissé','profit warning','révision à la baisse','stagflation',
  'récession','dégradation','fragilité','gare','vigilance','attention','dévisse',
  'fléchit','cède','affaiblit','pèse','décroche','lâche','sanctionne','à éviter',
  'mauvais','négatif','détérioration','aggravation','creuse','s\'enfonce','capitule',
  'déçoit','rate','manque','freine','alourdit','tire vers le bas',
];

function analyserSentiment(titre: string): Article['sentiment'] {
  const t = titre.toLowerCase();
  let score = 0;
  for (const m of MOTS_POSITIFS) if (t.includes(m)) score++;
  for (const m of MOTS_NEGATIFS) if (t.includes(m)) score--;
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutre';
}

function estImpactant(titre: string): boolean {
  const t = titre.toLowerCase();
  return MOTS_IMPACT.some(m => t.includes(m));
}

// Flux globaux — requêtes ciblées sur les décisions et impacts marché
const FLUX_GLOBAUX = [
  { url: 'https://news.google.com/rss/search?q=BCE+décision+taux+marchés+impact&hl=fr&gl=FR&ceid=FR:fr',       tag: 'BCE / Taux' },
  { url: 'https://news.google.com/rss/search?q=Fed+taux+décision+bourse+impact&hl=fr&gl=FR&ceid=FR:fr',        tag: 'Fed / Taux' },
  { url: 'https://news.google.com/rss/search?q=inflation+zone+euro+CPI+bourse&hl=fr&gl=FR&ceid=FR:fr',         tag: 'Inflation'  },
  { url: 'https://news.google.com/rss/search?q=CAC+40+Stoxx+marchés+actions+analyse&hl=fr&gl=FR&ceid=FR:fr',   tag: 'Marchés'    },
  { url: 'https://news.google.com/rss/search?q=taux+obligataires+spread+OAT+Bund&hl=fr&gl=FR&ceid=FR:fr',      tag: 'Obligataire'},
];

// Flux par sous-jacent — requêtes orientées bourse et résultats
export const FLUX_PRODUITS: { query: string; tag: string }[] = [
  { query: 'BNP Paribas cours bourse résultats analyste',          tag: 'BNP Paribas'  },
  { query: 'Stellantis cours bourse résultats objectif',           tag: 'Stellantis'   },
  { query: 'Capgemini cours bourse résultats analyste',            tag: 'Capgemini'    },
  { query: 'Rheinmetall cours bourse résultats défense',           tag: 'Rheinmetall'  },
  { query: 'CAC 40 analyse technique niveaux résistance support',  tag: 'CAC 40'       },
  { query: 'secteur bancaire européen Stoxx Banks résultats taux', tag: 'ES Banks'     },
];

function rssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
}

function parseItems(xml: string, tag?: string, max = 6): Article[] {
  const items: Article[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const bloc = m[1];
    const titre  = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(bloc) ?? /<title>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '';
    const lien   = (/<link>(.*?)<\/link>/.exec(bloc))?.[1]?.trim() ?? '';
    const date   = (/<pubDate>(.*?)<\/pubDate>/.exec(bloc))?.[1]?.trim() ?? '';
    const source = (/<source[^>]*>(.*?)<\/source>/.exec(bloc))?.[1]?.trim() ?? '';
    if (titre && estImpactant(titre) && sourceAutorisee(source)) {
      items.push({ titre, source, date, lien, tag, sentiment: analyserSentiment(titre) });
      if (items.length >= max) break;
    }
  }
  return items;
}

async function fetchRSS(url: string, tag?: string, max = 6): Promise<Article[]> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConservateurApp/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
  const xml = await resp.text();
  return parseItems(xml, tag, max);
}

export async function recupererNewsGlobales(maxParFlux = 4): Promise<Article[]> {
  const results = await Promise.allSettled(
    FLUX_GLOBAUX.map(f => fetchRSS(f.url, f.tag, maxParFlux))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

export async function recupererNewsProduits(maxParFlux = 4): Promise<Article[]> {
  const results = await Promise.allSettled(
    FLUX_PRODUITS.map(f => fetchRSS(rssUrl(f.query), f.tag, maxParFlux))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
