// Récupère des actualités via Google News RSS (pas de clé API requise), miroir Node de
// worker/src/index.js (section actus) : sans les caches Cloudflare (cf: cacheTtl), le reste
// de la logique — canaux, filtres, tri, déduplication — est identique.
//
// Canal eco    : Google News when:1h (requêtes larges) + when:1d (requêtes ciblées) + flux
//                directs ABC Bourse / BFM Économie / BCE presse (dispensés de liste blanche).
// Canal fiscal : Google News when:1d + when:7d (requêtes patrimoniales) + flux Sénat (Atom).
// Canal uc     : Google News when:7d (sociétés de gestion) + when:30d (événements de vie).

export interface Article {
  titre: string;
  source: string;
  date: string;
  lien: string;
  tag?: string;
  categorie: 'globale' | 'produits' | 'eco' | 'fiscal' | 'uc';
  sentiment: 'positive' | 'negative' | 'neutre';
}

// Sources autorisées (liste blanche)
const SOURCES_AUTORISEES = [
  'les echos', 'bfm bourse', 'boursorama', 'morningstar', 'le revenu',
  'zonebourse', 'tradingview', 'capital', 'reuters', 'bloomberg', 'l\'agefi',
  // Régulateurs & institutions (indispensables pour le flux Régulation / produits structurés)
  'amf', 'autorité des marchés', 'esma', 'acpr', 'banque de france', 'fmi', 'ocde',
  // Flux directs du canal eco : ce SONT les sources (dispensées de liste blanche au parsing,
  // cf. dispenseSource plus bas), listées ici pour rester cohérent si Google News les cite.
  'abc bourse', 'bfm économie', 'bce',
];
// Canal fiscal : liste blanche élargie à la presse patrimoniale.
const SOURCES_AUTORISEES_FISCAL = [
  ...SOURCES_AUTORISEES,
  'gestion de fortune', 'profession cgp', 'mieux vivre', 'notaires',
];

function sourceAutorisee(source: string, liste: string[]): boolean {
  const s = source.toLowerCase();
  return liste.some(a => s.includes(a));
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
  // Régulation & produits structurés
  'régulation','réglementation','amf','esma','mifid','directive','prospectus',
  'produit structuré','produits structurés','structuré','structurés','autocall','commercialisation',
  // International / macro mondiale
  'fmi','ocde','mondiale','mondial','international','émergents','chine','états-unis','géopolitique',
];

// Canal fiscal : mots signalant un sujet patrimonial/fiscal réel.
const MOTS_FISCAL = [
  'impôt', 'fiscalité', 'fiscal', 'succession', 'donation', 'ifi', 'pfu',
  'flat tax', 'assurance-vie', 'assurance vie', 'plus-value', 'abattement',
  'barème', 'niche fiscale', 'lmnp', 'per', 'droits de mutation',
  'loi de finances', 'bofip', 'redressement',
];

// Canal uc : sociétés de gestion suivies + mots de vie des fonds.
const MOTS_UC_SOCIETES = ['dnca', 'rothschild', 'comgest', 'pictet', 'r-co valor', 'fidelity', 'echiquier'];
const MOTS_UC_VIE = ['gérant', 'opcvm', 'sicav', 'fusion', 'souscription'];
const MOTS_UC = [...MOTS_UC_SOCIETES, ...MOTS_UC_VIE];

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

interface Flux {
  url: string;
  tag?: string;
  categorie: Article['categorie'];
  mots: string[];
  sources: string[];
  dispenseSource?: boolean;
  sourceDefaut?: string;
  corrigerDate?: (d: string) => string;
  format?: 'rss' | 'atom';
  max?: number;
}

// Requête Google News RSS générique, avec fenêtre temporelle (when:1h / 1d / 7d / 30d).
function fluxGoogleNews(
  query: string, when: string, categorie: Article['categorie'],
  mots: string[], sources: string[], opts: { tag?: string; max?: number } = {},
): Flux {
  return {
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:${when}&hl=fr&gl=FR&ceid=FR:fr`,
    tag: opts.tag ?? query, categorie, mots, sources, max: opts.max ?? 6,
  };
}

// ABC Bourse : pubDate étiqueté GMT mais en réalité en heure de Paris (bug source connu, mesuré
// au chantier) — sans correction les items apparaissent jusqu'à 2 h dans le futur en été.
function offsetParisHeures(date: Date): number {
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  return parseInt(/GMT([+-]\d+)/.exec(tz)?.[1] ?? '1', 10);
}
function corrigerDateAbcBourse(pubDate: string): string {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return pubDate;
  return new Date(d.getTime() - offsetParisHeures(d) * 3600000).toUTCString();
}

// Flux globaux — requêtes ciblées sur les décisions et impacts marché
const FLUX_GLOBAUX = [
  { url: 'https://news.google.com/rss/search?q=BCE+décision+taux+marchés+impact+when:7d&hl=fr&gl=FR&ceid=FR:fr',       tag: 'BCE / Taux' },
  { url: 'https://news.google.com/rss/search?q=Fed+taux+décision+bourse+impact+when:7d&hl=fr&gl=FR&ceid=FR:fr',        tag: 'Fed / Taux' },
  { url: 'https://news.google.com/rss/search?q=inflation+zone+euro+CPI+bourse+when:7d&hl=fr&gl=FR&ceid=FR:fr',         tag: 'Inflation'  },
  { url: 'https://news.google.com/rss/search?q=CAC+40+Stoxx+marchés+actions+analyse+when:7d&hl=fr&gl=FR&ceid=FR:fr',   tag: 'Marchés'    },
  { url: 'https://news.google.com/rss/search?q=taux+obligataires+spread+OAT+Bund+when:7d&hl=fr&gl=FR&ceid=FR:fr',      tag: 'Obligataire'},
  { url: 'https://news.google.com/rss/search?q=produits+structurés+AMF+ESMA+régulation+commercialisation+when:7d&hl=fr&gl=FR&ceid=FR:fr', tag: 'Régulation'   },
  { url: 'https://news.google.com/rss/search?q=économie+mondiale+croissance+FMI+international+marchés+when:7d&hl=fr&gl=FR&ceid=FR:fr',      tag: 'International' },
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

const FLUX_ECO_1H = ['bourse', 'marchés financiers', 'CAC 40', 'banque centrale'];
const FLUX_ECO_1D = ['BCE taux', 'Fed taux', 'inflation zone euro'];
const FLUX_ECO: Flux[] = [
  ...FLUX_ECO_1H.map(q => fluxGoogleNews(q, '1h', 'eco', MOTS_IMPACT, SOURCES_AUTORISEES)),
  ...FLUX_ECO_1D.map(q => fluxGoogleNews(q, '1d', 'eco', MOTS_IMPACT, SOURCES_AUTORISEES)),
  { url: 'https://www.abcbourse.com/rss/displaynewsrss', tag: 'ABC Bourse', categorie: 'eco',
    mots: MOTS_IMPACT, sources: [], dispenseSource: true, sourceDefaut: 'ABC Bourse',
    corrigerDate: corrigerDateAbcBourse, max: 10 },
  { url: 'https://www.bfmtv.com/rss/economie/', tag: 'BFM Économie', categorie: 'eco',
    mots: MOTS_IMPACT, sources: [], dispenseSource: true, sourceDefaut: 'BFM Économie', max: 10 },
  { url: 'https://www.ecb.europa.eu/rss/press.html', tag: 'BCE presse', categorie: 'eco',
    mots: MOTS_IMPACT, sources: [], dispenseSource: true, sourceDefaut: 'BCE', max: 10 },
];

const FLUX_FISCAL_QUERIES = [
  'loi de finances 2027', 'droits de succession', 'assurance vie fiscalité',
  'fiscalité patrimoniale', 'IFI impôt fortune immobilière', 'plus-value immobilière fiscalité',
];
const FLUX_FISCAL: Flux[] = [
  ...FLUX_FISCAL_QUERIES.flatMap(q => [
    fluxGoogleNews(q, '1d', 'fiscal', MOTS_FISCAL, SOURCES_AUTORISEES_FISCAL),
    fluxGoogleNews(q, '7d', 'fiscal', MOTS_FISCAL, SOURCES_AUTORISEES_FISCAL),
  ]),
  // Sénat (therss17.xml) : Atom 0.3 — flux institutionnel, dispensé de liste blanche.
  { url: 'https://www.senat.fr/themes/rss/therss17.xml', tag: 'Sénat', categorie: 'fiscal',
    mots: MOTS_FISCAL, sources: [], dispenseSource: true, sourceDefaut: 'Sénat',
    format: 'atom', max: 10 },
];

const FLUX_UC_SOCIETES = [
  'DNCA fonds', 'Rothschild & Co Asset Management', 'Comgest fonds',
  'Pictet Asset Management', 'R-co Valor', 'Fidelity International fonds',
];
const FLUX_UC_EVENEMENTS = [
  '"changement de gérant" fonds', 'OPCVM fusion absorption', 'fonds "fermé aux souscriptions"',
];
// Volume faible attendu (presse spécialisée peu couverte en fetch direct — mesuré au lot 1) :
// pas de liste blanche de sources ici, seul le titre doit être pertinent (MOTS_UC).
const FLUX_UC: Flux[] = [
  ...FLUX_UC_SOCIETES.map(q => fluxGoogleNews(q, '7d', 'uc', MOTS_UC, [])),
  ...FLUX_UC_EVENEMENTS.map(q => fluxGoogleNews(q, '30d', 'uc', MOTS_UC, [])),
].map(f => ({ ...f, dispenseSource: true }));

function parseItems(xml: string, cfg: Flux): Article[] {
  const { tag, categorie, mots, sources, dispenseSource = false, sourceDefaut = '',
          corrigerDate = (d: string) => d, max = 6 } = cfg;
  const items: Article[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const bloc = m[1];
    const titre  = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(bloc) ?? /<title>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '';
    const lien   = (/<link>(.*?)<\/link>/.exec(bloc))?.[1]?.trim() ?? '';
    let date     = (/<pubDate>(.*?)<\/pubDate>/.exec(bloc))?.[1]?.trim() ?? '';
    if (date) date = corrigerDate(date);
    const source = (/<source[^>]*>(.*?)<\/source>/.exec(bloc))?.[1]?.trim() || sourceDefaut;
    const tLow   = titre.toLowerCase();
    const impactant = mots.some(w => tLow.includes(w));
    const autorisee = dispenseSource || sourceAutorisee(source, sources);
    if (titre && lien && date && impactant && autorisee) {
      items.push({ titre, source, date, lien, tag, categorie, sentiment: analyserSentiment(titre) });
      if (items.length >= max) break;
    }
  }
  return items;
}

// Sénat (therss17.xml) : Atom 0.3, balises <entry>/<title>/<link href>/<modified> — le parseur
// <item> ci-dessus ne les lit pas, d'où ce parseur dédié.
function parseItemsAtom(xml: string, cfg: Flux): Article[] {
  const { tag, categorie, mots, sources, dispenseSource = false, sourceDefaut = '', max = 6 } = cfg;
  const items: Article[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const bloc = m[1];
    const titre  = (/<title[^>]*>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '';
    const lien   = (/<link[^>]*href="([^"]*)"/.exec(bloc))?.[1]?.trim() ?? '';
    const date   = (/<modified>(.*?)<\/modified>/.exec(bloc))?.[1]?.trim() ?? '';
    const source = sourceDefaut;
    const tLow   = titre.toLowerCase();
    const impactant = mots.some(w => tLow.includes(w));
    const autorisee = dispenseSource || sourceAutorisee(source, sources);
    if (titre && lien && date && impactant && autorisee) {
      items.push({ titre, source, date, lien, tag, categorie, sentiment: analyserSentiment(titre) });
      if (items.length >= max) break;
    }
  }
  return items;
}

async function fetchRSS(flux: Flux): Promise<Article[]> {
  try {
    const resp = await fetch(flux.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConservateurApp/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    return flux.format === 'atom' ? parseItemsAtom(xml, flux) : parseItems(xml, flux);
  } catch { return []; }
}

// Déduplique par lien (garde la première occurrence) puis trie par date décroissante.
function dedupTrie(items: Article[]): Article[] {
  const vus = new Map<string, Article>();
  for (const it of items) if (!vus.has(it.lien)) vus.set(it.lien, it);
  return [...vus.values()].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

export async function recupererNewsGlobales(maxParFlux = 4): Promise<Article[]> {
  const flux: Flux[] = FLUX_GLOBAUX.map(f => ({ url: f.url, tag: f.tag, categorie: 'globale', mots: MOTS_IMPACT, sources: SOURCES_AUTORISEES, max: maxParFlux }));
  const results = await Promise.allSettled(flux.map(fetchRSS));
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

export async function recupererNewsProduits(maxParFlux = 4): Promise<Article[]> {
  const flux: Flux[] = FLUX_PRODUITS.map(f => ({
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(f.query)}+when:7d&hl=fr&gl=FR&ceid=FR:fr`,
    tag: f.tag, categorie: 'produits', mots: MOTS_IMPACT, sources: SOURCES_AUTORISEES, max: maxParFlux,
  }));
  const results = await Promise.allSettled(flux.map(fetchRSS));
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

export interface NewsParCanal {
  globales: Article[];
  produits: Article[];
  eco: Article[];
  fiscal: Article[];
  uc: Article[];
}

// Agrège les 5 canaux : tri par date décroissante, plafond par canal, déduplication sur
// l'union (priorité aux canaux spécifiques eco > fiscal > uc sur globales/produits).
export async function recupererNews(): Promise<NewsParCanal> {
  const flux: Flux[] = [
    ...FLUX_GLOBAUX.map(f => ({ url: f.url, tag: f.tag, categorie: 'globale' as const, mots: MOTS_IMPACT, sources: SOURCES_AUTORISEES, max: 3 })),
    ...FLUX_PRODUITS.map(f => ({
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(f.query)}+when:7d&hl=fr&gl=FR&ceid=FR:fr`,
      tag: f.tag, categorie: 'produits' as const, mots: MOTS_IMPACT, sources: SOURCES_AUTORISEES, max: 3,
    })),
    ...FLUX_ECO, ...FLUX_FISCAL, ...FLUX_UC,
  ];
  const resultats = await Promise.allSettled(flux.map(fetchRSS));
  const brut = resultats.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const parCanal: Record<Article['categorie'], Article[]> = { globale: [], produits: [], eco: [], fiscal: [], uc: [] };
  for (const it of brut) parCanal[it.categorie].push(it);

  const utilises = new Set<string>();
  const retenir = (items: Article[], plafond?: number) => {
    const gardes = dedupTrie(items).filter(i => !utilises.has(i.lien)).slice(0, plafond ?? Infinity);
    gardes.forEach(i => utilises.add(i.lien));
    return gardes;
  };
  const eco = retenir(parCanal.eco, 30);
  const fiscal = retenir(parCanal.fiscal, 20);
  const uc = retenir(parCanal.uc, 15);
  const globales = retenir(parCanal.globale);
  const produits = retenir(parCanal.produits);

  return { globales, produits, eco, fiscal, uc };
}
