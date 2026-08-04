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

// Dernier point du fichier statique publié, strictement antérieur à `avantDate` (pour le
// calcul de la variation en pb) ; sans filtre, le dernier point tout court (repli de valeur).
async function cmsHistoriqueStatiqueBrut() {
  const r = await fetch(CMS_HISTORY_URL, { cf: { cacheTtl: 900 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json();
  return Array.isArray(d.points) ? d.points : null;
}

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

// Historique du CMS 10 ans : filtre le fichier statique publié par période. Pas de « Jour » :
// le swap n'a pas d'intraday (une valeur par jour), donc « 1j » perdrait son sens ; la période
// est retirée côté front (chart.js).
async function historiqueCmsStatique(periode) {
  const points = await cmsHistoriqueStatiqueBrut();
  if (!points || !points.length) return null;
  const debut = Math.floor(debutPeriode(periode).getTime() / 1000);
  const filtres = points.filter((p) => p.t >= debut);
  const retenus = filtres.length >= 2 ? filtres : points;
  if (retenus.length < 2) return null;
  return { ticker: 'scrape:cms', periode, points: retenus, devise: '%' };
}

function historique(id, periode, env) {
  if (id.startsWith('fred:')) return historiqueFred(id.slice(5), periode, env?.FRED_API_KEY);
  if (id.startsWith('hicp:')) return historiqueHicp(id.slice(5), periode, env?.FRED_API_KEY);
  if (id === 'scrape:cms')    return historiqueCmsStatique(periode);
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

// ── Actualités économiques via Google News RSS ────────────────────────────────
const SOURCES_AUTORISEES = [
  'les echos', 'bfm bourse', 'boursorama', 'morningstar', 'le revenu',
  'zonebourse', 'tradingview', 'capital', 'reuters', 'bloomberg', 'l\'agefi',
  // Régulateurs & institutions (indispensables pour le flux Régulation / produits structurés)
  'amf', 'autorité des marchés', 'esma', 'acpr', 'banque de france', 'fmi', 'ocde',
];
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
const FLUX_GLOBAUX = [
  { url: 'https://news.google.com/rss/search?q=BCE+d%C3%A9cision+taux+march%C3%A9s+impact+when:7d&hl=fr&gl=FR&ceid=FR:fr', tag: 'BCE / Taux' },
  { url: 'https://news.google.com/rss/search?q=Fed+taux+d%C3%A9cision+bourse+impact+when:7d&hl=fr&gl=FR&ceid=FR:fr',        tag: 'Fed / Taux' },
  { url: 'https://news.google.com/rss/search?q=inflation+zone+euro+CPI+bourse+when:7d&hl=fr&gl=FR&ceid=FR:fr',              tag: 'Inflation'  },
  { url: 'https://news.google.com/rss/search?q=CAC+40+Stoxx+march%C3%A9s+actions+analyse+when:7d&hl=fr&gl=FR&ceid=FR:fr',  tag: 'Marchés'    },
  { url: 'https://news.google.com/rss/search?q=taux+obligataires+spread+OAT+Bund+when:7d&hl=fr&gl=FR&ceid=FR:fr',           tag: 'Obligataire'},
  { url: 'https://news.google.com/rss/search?q=produits+structur%C3%A9s+AMF+ESMA+r%C3%A9gulation+commercialisation+when:7d&hl=fr&gl=FR&ceid=FR:fr', tag: 'Régulation'   },
  { url: 'https://news.google.com/rss/search?q=%C3%A9conomie+mondiale+croissance+FMI+international+march%C3%A9s+when:7d&hl=fr&gl=FR&ceid=FR:fr',      tag: 'International' },
];
const FLUX_PRODUITS = [
  { query: 'BNP Paribas cours bourse résultats analyste',         tag: 'BNP Paribas' },
  { query: 'Stellantis cours bourse résultats objectif',          tag: 'Stellantis'  },
  { query: 'Capgemini cours bourse résultats analyste',           tag: 'Capgemini'   },
  { query: 'Rheinmetall cours bourse résultats défense',          tag: 'Rheinmetall' },
  { query: 'CAC 40 analyse technique niveaux résistance support', tag: 'CAC 40'      },
  { query: 'secteur bancaire européen Stoxx Banks résultats taux',tag: 'ES Banks'    },
];

function analyserSentiment(titre) {
  const t = titre.toLowerCase();
  let score = 0;
  for (const m of MOTS_POSITIFS) if (t.includes(m)) score++;
  for (const m of MOTS_NEGATIFS) if (t.includes(m)) score--;
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutre';
}

function parseItemsRSS(xml, tag, max = 6) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const bloc = m[1];
    const titre  = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(bloc) ?? /<title>(.*?)<\/title>/.exec(bloc))?.[1]?.trim() ?? '';
    const lien   = (/<link>(.*?)<\/link>/.exec(bloc))?.[1]?.trim() ?? '';
    const date   = (/<pubDate>(.*?)<\/pubDate>/.exec(bloc))?.[1]?.trim() ?? '';
    const source = (/<source[^>]*>(.*?)<\/source>/.exec(bloc))?.[1]?.trim() ?? '';
    const tLow   = titre.toLowerCase();
    const sLow   = source.toLowerCase();
    const impactant = MOTS_IMPACT.some(w => tLow.includes(w));
    const autorisee = SOURCES_AUTORISEES.some(a => sLow.includes(a));
    if (titre && impactant && autorisee) {
      items.push({ titre, source, date, lien, tag, sentiment: analyserSentiment(titre) });
      if (items.length >= max) break;
    }
  }
  return items;
}

async function fetchRSSWorker(url, tag, max = 4) {
  try {
    // Timeout par flux : un flux Google News lent ne doit pas bloquer l'ensemble.
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConservateurApp/1.0)' }, cf: { cacheTtl: 900 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseItemsRSS(xml, tag, max);
  } catch { return []; }
}

async function recupererNews() {
  const globalesP = Promise.allSettled(FLUX_GLOBAUX.map(f => fetchRSSWorker(f.url, f.tag, 3)));
  const produitsP = Promise.allSettled(FLUX_PRODUITS.map(f => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(f.query)}+when:7d&hl=fr&gl=FR&ceid=FR:fr`;
    return fetchRSSWorker(url, f.tag, 3);
  }));
  const [gr, pr] = await Promise.all([globalesP, produitsP]);
  return {
    globales: gr.flatMap(r => r.status === 'fulfilled' ? r.value : []),
    produits: pr.flatMap(r => r.status === 'fulfilled' ? r.value : []),
  };
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

    // Actualités économiques : ?news=1 (10 flux RSS = lent → cache de sortie 15 min).
    if (u.searchParams.get('news')) {
      const cache = caches.default;
      const cleCache = new Request(new URL('/?news=cache', u.origin).toString());
      const enCache = await cache.match(cleCache);
      if (enCache) return enCache;
      try {
        const news = await recupererNews();
        const resp = new Response(JSON.stringify(news), {
          headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=900' },
        });
        await cache.put(cleCache, resp.clone());
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
