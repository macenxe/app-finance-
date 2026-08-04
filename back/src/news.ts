// Récupère des actualités via Google News RSS (pas de clé API requise), miroir Node de
// worker/src/index.js (section actus) : sans les caches Cloudflare (cf: cacheTtl), le reste
// de la logique — canaux, filtres, tri, déduplication — est identique.
//
// Canal eco    : Google News when:1h (requêtes larges) + when:1d (requêtes ciblées) + flux
//                directs ABC Bourse / BFM Économie / BCE presse (dispensés de liste blanche) ;
//                filtre « macro (MOTS_ECO_MACRO) OU grande capitalisation (GRANDES_CAPS) ».
// Canal fiscal : Google News when:1d + when:7d (requêtes patrimoniales) + flux Sénat (Atom).
// Canal uc     : Google News when:30d, une requête par fonds du cabinet — l'actu des fonds
//                eux-mêmes, pas des sociétés de gestion qui les gèrent (D23/D24).

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
  capsRegex?: RegExp | null;
  tagParMot?: Record<string, string>;
}

// Requête Google News RSS générique, avec fenêtre temporelle (when:1h / 1d / 7d / 30d).
function fluxGoogleNews(
  query: string, when: string, categorie: Article['categorie'],
  mots: string[], sources: string[], opts: { tag?: string; max?: number; capsRegex?: RegExp } = {},
): Flux {
  return {
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:${when}&hl=fr&gl=FR&ceid=FR:fr`,
    tag: opts.tag ?? query, categorie, mots, sources, max: opts.max ?? 6,
    capsRegex: opts.capsRegex ?? null,
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

// Flux globaux — requêtes fusionnées par OR (budget sous-requêtes du Worker, D27 : le
// miroir Node reste aligné) ; le label par item est raffiné via tagParMot.
const FLUX_GLOBAUX_DEFS: { q: string; tag: string; tagParMot?: Record<string, string> }[] = [
  { q: 'BCE OR Fed taux décision impact marchés', tag: 'BCE / Taux',
    tagParMot: { fed: 'Fed / Taux' } },
  { q: 'inflation zone euro CPI bourse', tag: 'Inflation' },
  { q: '"CAC 40" OR Stoxx OR OAT OR Bund marchés', tag: 'Marchés',
    tagParMot: { oat: 'Obligataire', bund: 'Obligataire', obligataire: 'Obligataire' } },
  { q: 'produits structurés AMF ESMA régulation commercialisation', tag: 'Régulation' },
  { q: 'économie mondiale croissance FMI international marchés', tag: 'International' },
];
const fluxGlobaux = (max: number): Flux[] => FLUX_GLOBAUX_DEFS.map(({ q, tag, tagParMot }) =>
  ({ ...fluxGoogleNews(q, '7d', 'globale', MOTS_IMPACT, SOURCES_AUTORISEES, { tag, max }), tagParMot }));

// Flux par sous-jacent — requêtes orientées bourse et résultats
const FLUX_PRODUITS_DEFS: { q: string; tag: string; tagParMot?: Record<string, string> }[] = [
  { q: '"BNP Paribas" OR Stellantis OR Capgemini OR Rheinmetall bourse', tag: 'Sous-jacents',
    tagParMot: { 'bnp paribas': 'BNP Paribas', stellantis: 'Stellantis',
                 capgemini: 'Capgemini', rheinmetall: 'Rheinmetall' } },
  { q: '"CAC 40" OR "Stoxx Banks" analyse', tag: 'CAC 40',
    tagParMot: { 'stoxx banks': 'ES Banks', 'secteur bancaire': 'ES Banks' } },
];
const fluxProduits = (max: number): Flux[] => FLUX_PRODUITS_DEFS.map(({ q, tag, tagParMot }) =>
  ({ ...fluxGoogleNews(q, '7d', 'produits', MOTS_IMPACT, SOURCES_AUTORISEES, { tag, max }), tagParMot }));

// Canal eco : mots macro (le micro-titre — résultats, dividende, objectif d'analyste — n'est
// plus retenu seul, D23) et grandes capitalisations (retenues même sur du micro, ex. résultats
// LVMH). GRANDES_CAPS testées à frontières de mots (regex précompilée une fois, cf. plus bas).
const MOTS_ECO_MACRO = [
  'taux', 'inflation', 'récession', 'croissance', 'pib', 'chômage', 'fed', 'bce',
  'banque centrale', 'zone euro', 'obligataire', 'obligation', 'dette', 'souverain',
  'spread', 'swap', 'l\'euro', 'le dollar', 'du dollar', 'au dollar', 'pétrole', 'cac 40', 'stoxx', 'dax', 'nasdaq', 's&p',
  'dow', 'nikkei', 'indices', 'volatilité', 'correction', 'krach', 'marchés', 'fmi', 'ocde',
  'géopolitique', 'droits de douane', 'tarifs douaniers', 'budget', 'loi de finances',
  'gouvernement', 'maison blanche', 'relance', 'secteur bancaire', 'banques', 'régulation',
  'réglementation', 'amf', 'esma', 'mifid', 'produit structuré', 'produits structurés',
  'autocall', 'liquidité', 'crédit',
];
const GRANDES_CAPS = [
  // CAC 40
  'accor', 'air liquide', 'airbus', 'arcelormittal', 'axa', 'bnp paribas', 'bouygues',
  'bureau veritas', 'capgemini', 'carrefour', 'crédit agricole', 'danone', 'dassault systèmes',
  'edenred', 'engie', 'essilorluxottica', 'eurofins', 'hermès', 'kering', 'legrand',
  'l\'oréal', 'lvmh', 'michelin', 'orange', 'pernod ricard', 'publicis', 'renault', 'safran',
  'saint-gobain', 'sanofi', 'schneider electric', 'société générale', 'stellantis',
  'stmicroelectronics', 'teleperformance', 'thales', 'totalenergies', 'unibail', 'veolia',
  'vinci',
  // Sous-jacent produit non CAC 40
  'rheinmetall',
  // Méga-caps européennes
  'asml', 'sap', 'siemens', 'novo nordisk', 'nestlé', 'roche', 'novartis', 'ubs', 'hsbc',
  'santander', 'shell', 'volkswagen', 'deutsche bank', 'allianz',
  // Méga-caps US
  'apple', 'microsoft', 'nvidia', 'alphabet', 'google', 'amazon', 'meta', 'tesla',
  'berkshire', 'jpmorgan', 'goldman sachs', 'eli lilly', 'broadcom', 'tsmc',
];
function echapperRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Une seule regex précompilée pour tout le canal eco (pas reconstruite par item) : alternance
// à frontières de mots (\w) pour qu'« axa » ne matche pas « taxa » ni « saxafone ».
const GRANDES_CAPS_RE = new RegExp(GRANDES_CAPS.map(c => `(?<!\\w)${echapperRegex(c)}(?!\\w)`).join('|'));
// Les titres Google News finissent par « - Nom de la Source » : on l'amputé avant le test
// GRANDES_CAPS pour éviter les faux positifs du type « - Orange Actualités ».
function sansSuffixeSource(titre: string): string {
  const i = titre.lastIndexOf(' - ');
  return i === -1 ? titre : titre.slice(0, i);
}

// Fusion OR (D27) ; les tags par item restent ceux que le front mappe déjà en thèmes.
const FLUX_ECO_GOOGLE: { q: string; when: string; tag: string; tagParMot?: Record<string, string> }[] = [
  { q: 'bourse OR "marchés financiers"', when: '1h', tag: 'bourse',
    tagParMot: { 'marchés financiers': 'marchés financiers' } },
  { q: '"CAC 40" OR "banque centrale"', when: '1h', tag: 'CAC 40',
    tagParMot: { 'banque centrale': 'banque centrale' } },
  { q: 'BCE OR Fed OR inflation', when: '1d', tag: 'BCE taux',
    tagParMot: { bce: 'BCE taux', fed: 'Fed taux', inflation: 'inflation zone euro' } },
];
const FLUX_ECO: Flux[] = [
  ...FLUX_ECO_GOOGLE.map(({ q, when, tag, tagParMot }) =>
    ({ ...fluxGoogleNews(q, when, 'eco', MOTS_ECO_MACRO, SOURCES_AUTORISEES, { tag, capsRegex: GRANDES_CAPS_RE }), tagParMot })),
  { url: 'https://www.abcbourse.com/rss/displaynewsrss', tag: 'ABC Bourse', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'ABC Bourse',
    corrigerDate: corrigerDateAbcBourse, max: 10, capsRegex: GRANDES_CAPS_RE },
  { url: 'https://www.bfmtv.com/rss/economie/', tag: 'BFM Économie', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'BFM Économie', max: 10, capsRegex: GRANDES_CAPS_RE },
  { url: 'https://www.ecb.europa.eu/rss/press.html', tag: 'BCE presse', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'BCE', max: 10, capsRegex: GRANDES_CAPS_RE },
];

// Budget sous-requêtes (D27) : la prod Workers plafonne à 50 subrequests par invocation
// (fetchs + opérations Cache API), limite que wrangler dev ne simule PAS. Les requêtes
// Google News sont donc fusionnées par OR ; toute nouvelle source rejoint un OR existant
// plutôt que d'ouvrir un flux séparé. Le miroir Node n'a pas cette limite mais reste aligné.
const FLUX_FISCAL_GROUPES = [
  { q: '"loi de finances" OR "fiscalité patrimoniale" OR "niche fiscale"', tag: 'Fiscalité patrimoniale' },
  { q: '"droits de succession" OR "donation" OR "droits de mutation"',     tag: 'Succession / donation' },
  { q: '"assurance vie" OR "IFI" OR "plus-value immobilière"',             tag: 'Assurance-vie / IFI' },
];
const FLUX_FISCAL: Flux[] = [
  // Une seule fenêtre 7d par groupe (budget D27) : le tri par date sert la fraîcheur.
  ...FLUX_FISCAL_GROUPES.map(({ q, tag }) =>
    fluxGoogleNews(q, '7d', 'fiscal', MOTS_FISCAL, SOURCES_AUTORISEES_FISCAL, { tag })),
  // Sénat (therss17.xml) : Atom 0.3 — flux institutionnel, dispensé de liste blanche.
  { url: 'https://www.senat.fr/themes/rss/therss17.xml', tag: 'Sénat', categorie: 'fiscal',
    mots: MOTS_FISCAL, sources: [], dispenseSource: true, sourceDefaut: 'Sénat',
    format: 'atom', max: 10 },
];

// Les 13 fonds du cabinet (nom de base, sans suffixe de part) — actu des fonds eux-mêmes,
// pas des sociétés de gestion qui les gèrent (les requêtes par société ramenaient des profils
// de personnes et du hors-sujet, D23/D24).
const FLUX_UC_FONDS = [
  'R-co Valor', 'Echiquier Artificial Intelligence', 'EdR Fund Big Data',
  'Pictet Clean Energy Transition', 'Pictet-Premium Brands', 'Conservateur Actions Monde',
  'Comgest Renaissance Europe', 'Fidelity World Fund', 'Conservateur Actions Flexibles',
  'Conservateur Diversifié Réactif', 'Conservateur Rendement Flexible',
  'Conservateur Diversifié', 'DNCA Invest Flex Inflation',
];
// Volume faible attendu (presse spécialisée peu couverte en fetch direct — mesuré au lot 1) :
// pas de liste blanche de sources ici, seul le titre doit mentionner le fonds.
// Les 13 fonds sont regroupés en 3 requêtes OR (budget sous-requêtes, D27) ; le label de
// carte reste le fonds matché grâce à tagParMot (mot minuscule → nom exact).
const FLUX_UC: Flux[] = [
  FLUX_UC_FONDS.slice(0, 5), FLUX_UC_FONDS.slice(5, 9), FLUX_UC_FONDS.slice(9),
].map(groupe => {
  const mots = groupe.map(n => n.toLowerCase());
  const tagParMot: Record<string, string> = Object.fromEntries(groupe.map(n => [n.toLowerCase(), n]));
  if (groupe.includes('R-co Valor')) { mots.push('r co valor'); tagParMot['r co valor'] = 'R-co Valor'; }
  if (groupe.includes('Pictet-Premium Brands')) { mots.push('pictet premium brands'); tagParMot['pictet premium brands'] = 'Pictet-Premium Brands'; }
  const q = groupe.map(n => `"${n}"`).join(' OR ');
  return { ...fluxGoogleNews(q, '30d', 'uc', mots, []), tag: groupe[0], tagParMot, max: 6, dispenseSource: true };
});

// Les flux échappent les entités XML (&amp;, &#39;…) ; le front rééchappe tout à l'affichage
// (escHtml), le serveur doit donc livrer du texte décodé. &amp; en dernier pour ne pas
// double-décoder (&amp;lt; doit donner &lt;, pas <).
function decoderEntites(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseItems(xml: string, cfg: Flux): Article[] {
  const { tag, categorie, mots, sources, dispenseSource = false, sourceDefaut = '',
          corrigerDate = (d: string) => d, max = 6, capsRegex = null, tagParMot = null } = cfg;
  const items: Article[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const bloc = m[1];
    const titre  = decoderEntites((/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(bloc) ?? /<title>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '');
    const lien   = decoderEntites((/<link>(.*?)<\/link>/.exec(bloc))?.[1]?.trim() ?? '');
    let date     = (/<pubDate>(.*?)<\/pubDate>/.exec(bloc))?.[1]?.trim() ?? '';
    if (date) date = corrigerDate(date);
    const source = decoderEntites((/<source[^>]*>(.*?)<\/source>/.exec(bloc))?.[1]?.trim() || sourceDefaut);
    const tLow   = titre.toLowerCase();
    // La grande cap doit être le SUJET du titre (match débutant dans les 40 premiers
    // caractères) : citée en fin de titre elle n'est qu'un second rôle (« Nike recule
    // après une dégradation de JPMorgan » ne parle pas de JPMorgan), D26.
    const mCaps = capsRegex ? capsRegex.exec(sansSuffixeSource(tLow)) : null;
    const impactant = mots.some(w => tLow.includes(w)) || (mCaps != null && mCaps.index < 40);
    const autorisee = dispenseSource || sourceAutorisee(source, sources);
    if (titre && lien && date && impactant && autorisee) {
      // Flux fusionnés par OR : le label de carte est raffiné par le premier mot de
      // tagParMot présent dans le titre (uc : le fonds matché ; globaux : le sous-thème).
      const cle = tagParMot && Object.keys(tagParMot).find(w => tLow.includes(w));
      const tagItem = (cle && tagParMot[cle]) || tag;
      items.push({ titre, source, date, lien, tag: tagItem, categorie, sentiment: analyserSentiment(titre) });
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
    const titre  = decoderEntites((/<title[^>]*>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '');
    const lien   = decoderEntites((/<link[^>]*href="([^"]*)"/.exec(bloc))?.[1]?.trim() ?? '');
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
  const flux = fluxGlobaux(maxParFlux);
  const results = await Promise.allSettled(flux.map(fetchRSS));
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

export async function recupererNewsProduits(maxParFlux = 4): Promise<Article[]> {
  const flux = fluxProduits(maxParFlux);
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
    ...fluxGlobaux(3), ...fluxProduits(4),
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
