// Cloudflare Worker — source de cours « live ».
// Récupère le snapshot publié (base : produits, taux FRED/CMS), puis rafraîchit
// les cours Yahoo en direct et recalcule les indicateurs. Renvoie le même format
// que snapshot.json, avec les autorisations CORS pour le front GitHub Pages.

const SNAPSHOT_URL = 'https://macenxe.github.io/app-finance-/data/snapshot.json';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json; charset=utf-8' };

// Un ticker est récupérable chez Yahoo s'il n'est pas une série FRED (OAT/Bund, mensuel)
// ni le CMS saisi à la main.
const estYahoo = (t) => !!t && t !== 'CMS10' && !t.startsWith('IRLTLT');
// Sous-jacents non cotés sous leur ticker officiel chez Yahoo : on price via un symbole servi
// par l'endpoint chart. Euro Stoxx Banks : SX7E.PA -> SX7E.Z (bonne échelle, ~303).
const TICKER_COURS = { 'SX7E.PA': 'SX7E.Z' };

// Origine autorisée : la PWA en prod, ou un hôte localhost exact (dev). Un Origin absent
// (curl, appel serveur) n'est pas bloqué ici. Empêche http://localhost.evil.com de passer.
function origineAutorisee(origin) {
  if (origin === 'https://macenxe.github.io') return true;
  try { return new URL(origin).hostname === 'localhost'; } catch { return false; }
}

async function coursYahoo(ticker) {
  // Tout est protégé : si Yahoo renvoie du HTML (page anti-bot / rate-limit), pend, ou
  // répond mal, on renvoie null pour qu'un seul ticker en échec n'entraîne pas tout le
  // snapshot en 502 (le contrat « on garde l'ancienne valeur » n'est tenu que si null).
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    // cacheTtl: 0 → on force Cloudflare à toujours rechercher la dernière valeur Yahoo.
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 0 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const m = (await r.json())?.chart?.result?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) return null;
    const prev = m.chartPreviousClose ?? m.previousClose ?? null;
    return {
      sousJacent: ticker,
      dernierCours: m.regularMarketPrice,
      heureCours: new Date((m.regularMarketTime ?? 0) * 1000).toISOString(),
      variationPct: prev && prev !== 0 ? ((m.regularMarketPrice - prev) / prev) * 100 : undefined,
    };
  } catch { return null; }
}

// Périodes du graphique → paramètres range/interval de Yahoo.
const PERIODES = {
  '1j':  { range: '1d',  interval: '5m'  },
  '1s':  { range: '5d',  interval: '15m' },
  '1m':  { range: '1mo', interval: '1d'  },
  '6m':  { range: '6mo', interval: '1d'  },
  'ytd': { range: 'ytd', interval: '1d'  },
  '1a':  { range: '1y',  interval: '1d'  },
  '3a':  { range: '3y',  interval: '1wk' },
  '5a':  { range: '5y',  interval: '1wk' },
  '10a': { range: '10y', interval: '1mo' },
};

// Historique de cours d'un ticker pour une période donnée.
async function historiqueYahoo(ticker, periode) {
  const p = PERIODES[periode] || PERIODES['6m'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${p.range}&interval=${p.interval}&includePrePost=false`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 0 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const res = (await r.json())?.chart?.result?.[0];
  if (!res?.timestamp) return null;
  const closes = res.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const c = closes[i];
    if (c != null) points.push({ t: res.timestamp[i], c });
  }
  if (points.length < 2) return null;
  return {
    ticker,
    periode,
    points,
    previousClose: res.meta?.chartPreviousClose ?? res.meta?.previousClose ?? null,
    devise: res.meta?.currency ?? null,
    // Date de première cotation de l'instrument : sert au front à ne PAS proposer de période
    // plus longue que son historique (un fonds lancé en 2022 n'a rien à montrer sur « 10 ans »).
    debut: res.meta?.firstTradeDate ?? null,
  };
}

// ── Historique des taux & inflation via FRED ──
// L'identifiant d'historique porte un préfixe : fred:SERIE, hicp:SERIE, scrape:cms,
// sinon c'est un symbole Yahoo (cours). La clé FRED vient du secret env.FRED_API_KEY.
const JOURS_PERIODE = { '1j': 3, '1s': 10, '1m': 35, '6m': 190, ytd: null, '1a': 380, '3a': 1100, '5a': 1850, '10a': 3700 };

function debutPeriode(periode) {
  if (periode === 'ytd') return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const j = JOURS_PERIODE[periode] ?? 190;
  return new Date(Date.now() - j * 86400000);
}
const isoJour = (d) => d.toISOString().slice(0, 10);

async function fredObservations(series, key, start) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${key}&file_type=json&sort_order=asc&observation_start=${start}`;
  const r = await fetch(url, { cf: { cacheTtl: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const obs = (await r.json())?.observations;
  return Array.isArray(obs) ? obs : null;
}

async function historiqueFred(series, periode, key) {
  if (!key) return null;
  const obs = await fredObservations(series, key, isoJour(debutPeriode(periode)));
  if (!obs) return null;
  const points = [];
  for (const o of obs) {
    if (o.value === '.' || o.value == null) continue;
    const c = parseFloat(o.value);
    if (isFinite(c)) points.push({ t: Math.floor(Date.parse(o.date + 'T00:00:00Z') / 1000), c });
  }
  if (points.length < 2) return null;
  return { ticker: 'fred:' + series, periode, points, devise: '%' };
}

// Inflation : la série HICP est un indice de niveau → on calcule le glissement annuel (12 mois).
async function historiqueHicp(series, periode, key) {
  if (!key) return null;
  const visible = debutPeriode(periode).getTime();
  const obs = await fredObservations(series, key, isoJour(new Date(visible - 400 * 86400000)));
  if (!obs) return null;
  const vals = obs.filter(o => o.value !== '.' && o.value != null)
    .map(o => ({ t: Date.parse(o.date + 'T00:00:00Z'), v: parseFloat(o.value) }));
  const points = [];
  for (let i = 12; i < vals.length; i++) {
    if (vals[i].t < visible) continue;
    points.push({ t: Math.floor(vals[i].t / 1000), c: (vals[i].v / vals[i - 12].v - 1) * 100 });
  }
  if (points.length < 2) return null;
  return { ticker: 'hicp:' + series, periode, points, devise: '%' };
}

// ── CMS 10 ans EUR : swap via l'API publique Chatham (« Euro 6m swap curve ») ──
// Une seule clôture par jour (J-1 ouvré, mise à jour ~18h45) ; pas d'intraday. La série
// longue (backfill + append quotidien) vit dans le fichier statique CMS_HISTORY_URL.
const CHATHAM_URL = 'https://cf.com/public-api/public-rates/euribor6monthswap.json/';
const CMS_HISTORY_URL = 'https://macenxe.github.io/app-finance-/data/history/cms.json';
// OAT 10 ans : rendement quotidien de l'emprunt phare (append quotidien par Actions,
// source Boursorama — inaccessible aux IP Workers, d'où le fichier statique).
const OAT_HISTORY_URL = 'https://macenxe.github.io/app-finance-/data/history/oat.json';

// Dernière clôture publiée par Chatham pour le ténor 10 ans (LengthInMonths=120).
async function chathamDernierePoint() {
  const r = await fetch(CHATHAM_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 900 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json();
  const rate = (d.Rates || []).find((x) => x.LengthInMonths === 120);
  const valeur = rate ? parseFloat(rate.PreviousDay) : NaN;
  const date = d.PreviousDayDate;
  if (!isFinite(valeur) || !date) return null;
  return { valeur, date };
}

// Points d'un fichier d'historique statique publié (cms.json, oat.json) — même forme {points:[{t,c}]}.
async function fichierStatiqueBrut(url) {
  const r = await fetch(url, { cf: { cacheTtl: 900 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json();
  return Array.isArray(d.points) ? d.points : null;
}
const cmsHistoriqueStatiqueBrut = () => fichierStatiqueBrut(CMS_HISTORY_URL);

// Valeur « du moment » du CMS 10 ans = dernière clôture Chatham (J-1 ouvré), avec la variation
// en pb vs le point précédent du fichier statique publié. Repli si Chatham est indisponible :
// dernier point du fichier statique (plus aucun repli FRED, décision D4).
async function coursCmsChatham() {
  const points = await cmsHistoriqueStatiqueBrut();
  const c = await chathamDernierePoint().catch(() => null);
  if (c) {
    let deltaPb = null;
    if (points && points.length) {
      const seuil = Math.floor(Date.parse(c.date + 'T00:00:00Z') / 1000);
      const avant = points.filter((p) => p.t < seuil);
      if (avant.length) deltaPb = Math.round((c.valeur - avant[avant.length - 1].c) * 100);
    }
    return { nom: 'CMS 10 ans', valeur: c.valeur, deltaPb, source: 'Chatham · EUR swap 10 ans (clôture J-1)', heure: c.date + 'T00:00:00Z', date: c.date };
  }
  if (points && points.length) {
    const dernier = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2].c : null;
    const deltaPb = prev != null ? Math.round((dernier.c - prev) * 100) : null;
    const date = new Date(dernier.t * 1000).toISOString().slice(0, 10);
    return { nom: 'CMS 10 ans', valeur: dernier.c, deltaPb, source: 'fichier statique (dernière clôture connue)', heure: date + 'T00:00:00Z', date };
  }
  return null;
}

// Historique d'une série statique (CMS, OAT) : filtre le fichier publié par période. Pas de
// « Jour » : une seule valeur par jour, donc « 1j » perdrait son sens ; la période est retirée
// côté front (chart.js).
async function historiqueStatique(url, ticker, periode) {
  const points = await fichierStatiqueBrut(url);
  if (!points || !points.length) return null;
  const debut = Math.floor(debutPeriode(periode).getTime() / 1000);
  const filtres = points.filter((p) => p.t >= debut);
  const retenus = filtres.length >= 2 ? filtres : points;
  if (retenus.length < 2) return null;
  return { ticker, periode, points: retenus, devise: '%' };
}

function historique(id, periode, env) {
  if (id.startsWith('fred:')) return historiqueFred(id.slice(5), periode, env?.FRED_API_KEY);
  if (id.startsWith('hicp:')) return historiqueHicp(id.slice(5), periode, env?.FRED_API_KEY);
  if (id === 'scrape:cms')    return historiqueStatique(CMS_HISTORY_URL, 'scrape:cms', periode);
  if (id === 'scrape:oat')    return historiqueStatique(OAT_HISTORY_URL, 'scrape:oat', periode);
  return historiqueYahoo(id, periode);
}

// Reprend exactement la logique de back/src/calc.ts
function calculerIndicateurs(p, cours) {
  const niveau = cours.dernierCours;
  let pctStrike = null;
  if (p.typeProduit === 'equity' && p.strike !== null) pctStrike = (niveau / p.strike) * 100;

  let zoneAutocall = false;
  if (p.typeProduit === 'equity') {
    if (p.barriereAutocall !== null && p.strike !== null) {
      // Autocall « à la baisse » si barrière < 100 % du strike, sinon autocall classique.
      const seuilAbs = (p.barriereAutocall / 100) * p.strike;
      zoneAutocall = p.barriereAutocall < 100 ? niveau <= seuilAbs : niveau >= seuilAbs;
    }
  } else if (p.typeProduit === 'cms') {
    // CMS = produit de taux à la baisse : rappelé quand le taux descend à / sous la barrière.
    if (p.barriereAutocall !== null && niveau <= p.barriereAutocall) zoneAutocall = true;
  }
  return { produitId: p.id, pctStrike, zoneAutocall };
}

// ── Actualités économiques via Google News RSS + flux directs ────────────────
// Canal eco : Google News when:1h (requêtes larges) + when:1d (requêtes ciblées) + flux
//             directs ABC Bourse / BFM Économie / BCE presse (dispensés de liste blanche) ;
//             filtre « macro (MOTS_ECO_MACRO) OU grande capitalisation (GRANDES_CAPS) ».
// Canal uc  : Google News when:30d, une requête par fonds du cabinet — l'actu des fonds
//             eux-mêmes, pas des sociétés de gestion qui les gèrent (D23/D24).
// Canal fiscal : retiré (D31 — plus d'intérêt utilisateur) ; la clé reste dans la réponse
// ?news=1, posée à [] fixe, pour la rétrocompatibilité des fronts en cache (D32).
const MOTS_POSITIFS = [
  'hausse','en hausse','rebond','rebondit','progression','progresse','croissance','record',
  'gains','gain','surperformance','relève','relèvement','optimisme','accord','allège',
  'dépasse','accélère','amélioration','améliore','surperforme','bond','bondit','monte',
  'favorable','soutien','solide','achat','surpondérer','objectif relevé','confiance',
  'reprise','dynamisme','expansion','résilience','résistant','résiste','surpasse',
];
const MOTS_NEGATIFS = [
  'baisse','en baisse','à la baisse','chute','chute de','plonge','plongée','recul','recule',
  'repli','crainte','risque','perte','pertes','tension','alerte','prudence','déception',
  'décevant','décevants','décevante','incertitude','ralentissement','contraction',
  'correction','avertissement','effondrement','s\'effondre','effondre','faillite',
  'défaut','crise','stress','déficit','inquiétude','menace','pression','vente','vendez',
  'sous-pondérer','objectif abaissé','profit warning','révision à la baisse',
  'récession','dégradation','fragilité','dévisse','fléchit','cède','décroche',
];


// ABC Bourse : pubDate étiqueté GMT mais en réalité en heure de Paris (bug source connu, mesuré
// au chantier) — sans correction les items apparaissent jusqu'à 2 h dans le futur en été.
function offsetParisHeures(date) {
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  return parseInt(/GMT([+-]\d+)/.exec(tz)?.[1] ?? '1', 10);
}
function corrigerDateAbcBourse(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return pubDate;
  return new Date(d.getTime() - offsetParisHeures(d) * 3600000).toUTCString();
}

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
function echapperRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// Une seule regex précompilée pour tout le canal eco (pas reconstruite par item) : alternance
// à frontières de mots (\w) pour qu'« axa » ne matche pas « taxa » ni « saxafone ».
const GRANDES_CAPS_RE = new RegExp(GRANDES_CAPS.map((c) => `(?<!\\w)${echapperRegex(c)}(?!\\w)`).join('|'));
// Les titres Google News finissent par « - Nom de la Source » : on l'amputé avant le test
// GRANDES_CAPS pour éviter les faux positifs du type « - Orange Actualités ».
function sansSuffixeSource(titre) {
  const i = titre.lastIndexOf(' - ');
  return i === -1 ? titre : titre.slice(0, i);
}

// Flux DIRECTS du canal eco — les seuls que les IP Workers atteignent (D30) ; le
// complément Google News arrive par le fond statique (NEWS_FOND_URL).
const FLUX_ECO_DIRECTS = [
  { url: 'https://www.abcbourse.com/rss/displaynewsrss', tag: 'ABC Bourse', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'ABC Bourse',
    corrigerDate: corrigerDateAbcBourse, max: 10, capsRegex: GRANDES_CAPS_RE },
  { url: 'https://www.bfmtv.com/rss/economie/', tag: 'BFM Économie', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'BFM Économie', max: 10, capsRegex: GRANDES_CAPS_RE },
  { url: 'https://www.ecb.europa.eu/rss/press.html', tag: 'BCE presse', categorie: 'eco',
    mots: MOTS_ECO_MACRO, sources: [], dispenseSource: true, sourceDefaut: 'BCE', max: 10, capsRegex: GRANDES_CAPS_RE },
];

// Budget sous-requêtes (D27/D30) : la prod Workers plafonne à 50 subrequests par
// invocation (fetchs + Cache API), limite que wrangler dev ne simule PAS. Décompte
// ?news=1 : 3 flux directs (×2 si redirigés) + 1 fond statique + 2 cache = 9 pire cas.

function analyserSentiment(titre) {
  const t = titre.toLowerCase();
  let score = 0;
  for (const m of MOTS_POSITIFS) if (t.includes(m)) score++;
  for (const m of MOTS_NEGATIFS) if (t.includes(m)) score--;
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutre';
}

// Les flux échappent les entités XML (&amp;, &#39;…) ; le front rééchappe tout à l'affichage
// (escHtml), le serveur doit donc livrer du texte décodé. &amp; en dernier pour ne pas
// double-décoder (&amp;lt; doit donner &lt;, pas <).
function decoderEntites(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseItemsRSS(xml, cfg) {
  const { tag, categorie, mots, sources, dispenseSource = false, sourceDefaut = '',
          corrigerDate = (d) => d, max = 6, capsRegex = null, tagParMot = null } = cfg;
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
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
    const autorisee = dispenseSource || sources.some(s => source.toLowerCase().includes(s));
    if (titre && lien && date && impactant && autorisee) {
      // Flux fusionnés par OR : le label de carte est raffiné par le premier mot de
      // tagParMot présent dans le titre (uc : le fonds matché ; globaux : le sous-thème).
      const cle = tagParMot && Object.keys(tagParMot).find((w) => tLow.includes(w));
      const tagItem = (cle && tagParMot[cle]) || tag;
      items.push({ titre, source, date, lien, tag: tagItem, categorie, sentiment: analyserSentiment(titre) });
      if (items.length >= max) break;
    }
  }
  return items;
}

async function fetchRSSWorker(flux) {
  try {
    // Timeout par flux : un flux lent ne doit pas bloquer l'ensemble. cacheTtl 300 (5 min) :
    // borne le coût des flux RSS interrogés à chaque appel non mis en cache.
    // redirect 'manual' + UN hop suivi à la main : chaque redirection suivie compte comme
    // une sous-requête (limite 50/invocation, D28) — le coût par flux est ainsi borné à 2.
    // Le cookie CONSENT évite l'interstitiel cookies de Google News pour les IP européennes.
    const opts = {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConservateurApp/1.0)',
                 'Cookie': 'CONSENT=YES+; SOCS=CAI' },
      cf: { cacheTtl: 300 }, redirect: 'manual', signal: AbortSignal.timeout(8000),
    };
    let r = await fetch(flux.url, opts);
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const loc = r.headers.get('Location');
      if (!loc) return [];
      r = await fetch(new URL(loc, flux.url).toString(), opts);
    }
    if (!r.ok) return [];
    const xml = await r.text();
    return parseItemsRSS(xml, flux);
  } catch { return []; }
}

// Déduplique par lien (garde la première occurrence) puis trie par date décroissante.
function dedupTrie(items) {
  const vus = new Map();
  for (const it of items) if (!vus.has(it.lien)) vus.set(it.lien, it);
  return [...vus.values()].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

// Google News renvoie 503 « Sorry… » aux IP Cloudflare Workers (mesuré, D30 — même
// famille de blocage que Chatham). Les canaux qui en dépendent (globales, produits,
// fiscal Google, uc) sont générés côté GitHub Actions (back news-statique.ts, qui
// atteint Google) et publiés en fichier statique ; le Worker les fusionne avec les
// flux DIRECTS qui lui répondent (ABC Bourse, BFM, BCE, Sénat) pour l'intraday.
const NEWS_FOND_URL = 'https://macenxe.github.io/app-finance-/data/news-fond.json';

async function recupererNews() {
  const [fondRes, ...resultats] = await Promise.allSettled([
    fetch(NEWS_FOND_URL, { cf: { cacheTtl: 300 }, signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null)),
    ...FLUX_ECO_DIRECTS.map(fetchRSSWorker),
  ]);
  const fond = (fondRes.status === 'fulfilled' && fondRes.value) || {};
  const brut = resultats.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const parCanal = {
    globale: [...(fond.globales || [])],
    produits: [...(fond.produits || [])],
    eco: [...(fond.eco || [])],
    uc: [...(fond.uc || [])],
  };
  for (const it of brut) parCanal[it.categorie].push(it);

  // Dédoublonnage sur l'union des 4 tableaux : priorité aux canaux spécifiques (eco > uc),
  // un lien déjà retenu n'est plus repris dans un canal suivant.
  const utilises = new Set();
  const retenir = (items, plafond) => {
    const gardes = dedupTrie(items).filter(i => !utilises.has(i.lien)).slice(0, plafond ?? Infinity);
    gardes.forEach(i => utilises.add(i.lien));
    return gardes;
  };
  const eco = retenir(parCanal.eco, 30);
  const uc = retenir(parCanal.uc, 15);
  const globales = retenir(parCanal.globale);
  const produits = retenir(parCanal.produits);

  // Canal fiscal retiré (D31) : la clé reste posée à [] fixe pour la rétrocompatibilité des
  // fronts en cache (D32), sans reprendre le fiscal du fond statique.
  return { globales, produits, eco, fiscal: [], uc };
}

export default {
  async fetch(request, env) {
    // Anti-proxy ouvert : une requête de navigateur venant d'un autre site porte un en-tête
    // Origin ≠ la PWA → 403. Les appels sans Origin (curl, serveur) restent possibles (on ne
    // peut pas les bloquer sans authentification), mais l'abus depuis une page web tierce est
    // coupé. La PWA (https://macenxe.github.io) et le dev local passent.
    const origin = request.headers.get('Origin');
    if (origin && !origineAutorisee(origin)) {
      return new Response(JSON.stringify({ error: 'origin non autorisé' }), {
        status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // Pré-vol CORS (par sécurité ; les requêtes GET simples n'en déclenchent pas).
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
    }

    const u = new URL(request.url);

    // Actualités économiques : ?news=1 (~40 flux RSS = lent → cache de sortie 5 min).
    if (u.searchParams.get('news')) {
      const cache = caches.default;
      // Clé versionnée : un déploiement qui change le format ne doit pas resservir
      // l'entrée de l'ancien code pendant son TTL (mesuré au chantier 2, D28).
      const cleCache = new Request(new URL('/?news=cache-v2', u.origin).toString());
      const enCache = await cache.match(cleCache);
      if (enCache) return enCache;
      try {
        const news = await recupererNews();
        const total = Object.values(news).reduce((n, l) => n + l.length, 0);
        const resp = new Response(JSON.stringify(news), {
          headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
        // Une agrégation quasi vide (panne amont, budget épuisé) ne se met pas en
        // cache : l'appel suivant retente au lieu de figer le vide pendant 5 min.
        if (total >= 5) await cache.put(cleCache, resp.clone());
        return resp;
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 502, headers: JSON_HEADERS });
      }
    }

    // Valeur courante du CMS 10 ans : ?cms=1
    if (u.searchParams.get('cms')) {
      try {
        const c = await coursCmsChatham();
        return new Response(JSON.stringify(c || { error: 'no data' }), { status: c ? 200 : 404, headers: JSON_HEADERS });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 502, headers: JSON_HEADERS });
      }
    }

    // Endpoint historique : ?history=TICKER&period=6m
    const hist = u.searchParams.get('history');
    if (hist) {
      try {
        const data = await historique(hist, u.searchParams.get('period') || '6m', env);
        if (!data) return new Response(JSON.stringify({ error: 'no data' }), { status: 404, headers: JSON_HEADERS });
        return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 502, headers: JSON_HEADERS });
      }
    }

    try {
      // Le snapshot GitHub Pages porte les définitions produits : si Pages renvoie une 404
      // HTML ou pend, on lève une erreur claire (502) plutôt qu'un plantage de JSON.parse ;
      // le front bascule alors sur sa propre copie same-origin de snapshot.json.
      const snapRes = await fetch(SNAPSHOT_URL, { cf: { cacheTtl: 0 }, signal: AbortSignal.timeout(8000) });
      if (!snapRes.ok) throw new Error(`snapshot HTTP ${snapRes.status}`);
      const snap = await snapRes.json();

      // Tickers Yahoo à rafraîchir : indices + taux Yahoo + sous-jacents des produits
      const tickers = [...new Set(
        [...snap.indices, ...snap.taux, ...snap.produits].map((x) => x.sousJacent).filter(estYahoo),
      )];

      const quotes = {};
      await Promise.all(tickers.map(async (t) => {
        const q = await coursYahoo(TICKER_COURS[t] || t);
        if (q) quotes[t] = { ...q, sousJacent: t };
      }));

      // Applique les cours frais (garde l'ancienne valeur si Yahoo ne renvoie rien)
      const freshen = (o) => {
        const q = quotes[o.sousJacent];
        if (q) { o.dernierCours = q.dernierCours; o.heureCours = q.heureCours; if (q.variationPct != null) o.variationPct = q.variationPct; }
        return o;
      };
      snap.indices = snap.indices.map(freshen);
      snap.taux = snap.taux.map((t) => (t.manuel ? t : freshen(t))); // CMS manuel inchangé

      // Carte des cours pour réenrichir les produits
      const coursMap = {};
      snap.indices.forEach((i) => { coursMap[i.sousJacent] = { sousJacent: i.sousJacent, dernierCours: i.dernierCours, heureCours: i.heureCours, variationPct: i.variationPct }; });
      Object.assign(coursMap, quotes);
      const cms = snap.taux.find((t) => t.sousJacent === 'CMS10');
      if (cms) coursMap['CMS10'] = { sousJacent: 'CMS10', dernierCours: cms.dernierCours, heureCours: cms.heureCours };

      snap.produits = snap.produits.map((p) => {
        const cours = coursMap[p.sousJacent] ?? p.cours ?? null; // SX7E.PA etc. : garde la valeur du snapshot
        return { ...p, cours, indicateurs: cours ? calculerIndicateurs(p, cours) : null };
      });

      snap.genere = new Date().toISOString();
      return new Response(JSON.stringify(snap), { headers: JSON_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 502, headers: JSON_HEADERS });
    }
  },
};
