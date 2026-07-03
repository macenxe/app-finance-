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
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 0 } });
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
  };
}

// ── Historique des taux & inflation via FRED ──
// L'identifiant d'historique porte un préfixe : fred:SERIE, hicp:SERIE, scrape:cms,
// sinon c'est un symbole Yahoo (cours). La clé FRED vient du secret env.FRED_API_KEY.
const FRED_PROXY_CMS = 'IRLTLT01EZM156N'; // rendement 10 ans zone euro (proxy du swap CMS, mensuel)
const JOURS_PERIODE = { '1j': 3, '1s': 10, '1m': 35, '6m': 190, ytd: null, '1a': 380, '3a': 1100, '5a': 1850, '10a': 3700 };

function debutPeriode(periode) {
  if (periode === 'ytd') return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const j = JOURS_PERIODE[periode] ?? 190;
  return new Date(Date.now() - j * 86400000);
}
const isoJour = (d) => d.toISOString().slice(0, 10);

async function fredObservations(series, key, start) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${key}&file_type=json&sort_order=asc&observation_start=${start}`;
  const r = await fetch(url, { cf: { cacheTtl: 3600 } });
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

// ── CMS 10 ans EUR : vrai swap via FT Markets (« Euro 10 yr Swap ») ──
// FT n'est pas protégé par Cloudflare → récupérable côté serveur ; on ajoute le CORS.
const FT_CMS_XID = '5767342';
// FT ne publie qu'une valeur par jour pour ce swap (aucun intraday, même en demandant
// « Minute »/« Hour »). La valeur « du moment » = la dernière clôture quotidienne connue.
// On élargit les périodes courtes pour garantir au moins deux points même après un
// week-end / jour férié.
const FT_PERIODES = {
  '1j': { days: 8, p: 'Day' }, '1s': { days: 14, p: 'Day' }, '1m': { days: 40, p: 'Day' },
  '6m': { days: 190, p: 'Day' }, '1a': { days: 370, p: 'Day' },
  '3a': { days: 1100, p: 'Week' }, '5a': { days: 1850, p: 'Week' }, '10a': { days: 3700, p: 'Month' },
};

// Série de clôtures FT (chartapi) pour une période donnée.
async function serieCmsFT(periode) {
  const cfg = FT_PERIODES[periode] || (periode === 'ytd'
    ? { days: Math.max(2, Math.ceil((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 86400000)), p: 'Day' }
    : FT_PERIODES['6m']);
  const body = JSON.stringify({
    days: cfg.days, dataNormalized: false, dataPeriod: cfg.p, dataInterval: 1, realtime: false,
    yFormat: '0.###', timeServiceFormat: 'JSON', returnDateType: 'ISO8601',
    elements: [{ Type: 'price', Symbol: FT_CMS_XID, OverlayIndicators: [], Params: {} }],
  });
  const r = await fetch('https://markets.ft.com/data/chartapi/series', {
    method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' }, body, cf: { cacheTtl: 900 },
  });
  if (!r.ok) return null;
  const d = await r.json();
  const dates = d.Dates || [];
  const cs = d.Elements?.[0]?.ComponentSeries || [];
  const vals = (cs.find((s) => s.Type === 'Close') || cs[0])?.Values || [];
  const points = [];
  for (let i = 0; i < dates.length; i++) {
    const c = vals[i];
    if (c != null) points.push({ t: Math.floor(Date.parse(dates[i]) / 1000), c });
  }
  return points;
}

// Repli si FT est indisponible : rendement 10 ans zone euro via FRED (fredgraph.csv, sans
// clé, mensuel). Approximation explicite du swap, mieux qu'une valeur figée sans date.
async function coursCmsFredFallback() {
  try {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${FRED_PROXY_CMS}`, { cf: { cacheTtl: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const lignes = (await r.text()).trim().split('\n').slice(1);
    let last = null, prev = null;
    for (const l of lignes) {
      const [date, val] = l.split(',');
      const num = parseFloat(val);
      if (isFinite(num)) { prev = last; last = { date, v: num }; }
    }
    if (!last) return null;
    const deltaPb = prev ? Math.round((last.v - prev.v) * 100) : null;
    return { nom: 'CMS 10 ans', valeur: last.v, deltaPb, source: 'FRED · rendement 10 ans zone euro (approximation)', heure: last.date + 'T00:00:00Z', date: last.date };
  } catch { return null; }
}

// Valeur « du moment » du CMS 10 ans = dernière clôture quotidienne connue, avec la variation
// en points de base (pb) vs la clôture précédente et la DATE de cette clôture (pour rendre la
// fraîcheur visible côté front). Repli FRED si FT tombe.
async function coursCmsFT() {
  const points = await serieCmsFT('1m');
  if (points && points.length) {
    const dernier = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2].c : null;
    const deltaPb = prev != null ? Math.round((dernier.c - prev) * 100) : null;
    const dateISO = new Date(dernier.t * 1000).toISOString();
    return { nom: 'CMS 10 ans', valeur: dernier.c, deltaPb, source: 'FT Markets · Euro 10y swap (clôture)', heure: dateISO, date: dateISO.slice(0, 10) };
  }
  return await coursCmsFredFallback();
}

// Historique du CMS 10 ans. Pas de « Jour » : le swap n'a pas d'intraday (une valeur par
// jour), donc « 1j » perdrait son sens ; la période est retirée côté front (chart.js).
async function historiqueCmsFT(periode) {
  const points = await serieCmsFT(periode);
  if (!points || points.length < 2) return null;
  return { ticker: 'scrape:cms', periode, points, devise: '%' };
}

function historique(id, periode, env) {
  if (id.startsWith('fred:')) return historiqueFred(id.slice(5), periode, env?.FRED_API_KEY);
  if (id.startsWith('hicp:')) return historiqueHicp(id.slice(5), periode, env?.FRED_API_KEY);
  if (id === 'scrape:cms')    return historiqueCmsFT(periode);
  return historiqueYahoo(id, periode);
}

// Reprend exactement la logique de back/src/calc.ts
function calculerIndicateurs(p, cours) {
  const niveau = cours.dernierCours;
  let pctStrike = null;
  if (p.typeProduit === 'equity' && p.strike !== null) pctStrike = (niveau / p.strike) * 100;

  let zoneAutocall = false;
  let statutZone = 'surveillance';
  if (p.typeProduit === 'equity') {
    if (p.barriereAutocall !== null && p.strike !== null) {
      // Autocall « à la baisse » si barrière < 100 % du strike, sinon autocall classique.
      const seuilAbs = (p.barriereAutocall / 100) * p.strike;
      zoneAutocall = p.barriereAutocall < 100 ? niveau <= seuilAbs : niveau >= seuilAbs;
    }
    if (zoneAutocall) statutZone = 'rappel_probable';
    else if (pctStrike !== null && pctStrike < 75) statutZone = 'risque';
  } else if (p.typeProduit === 'cms') {
    // CMS = produit de taux à la baisse : rappelé quand le taux descend à / sous la barrière.
    if (p.barriereAutocall !== null && niveau <= p.barriereAutocall) { zoneAutocall = true; statutZone = 'rappel_probable'; }
    else if (p.barriereCoupon !== null && niveau > p.barriereCoupon) statutZone = 'risque';
  }
  return { produitId: p.id, pctStrike, zoneAutocall, statutZone };
}

// ── Actualités économiques via Google News RSS ────────────────────────────────
const SOURCES_AUTORISEES = [
  'les echos', 'bfm bourse', 'boursorama', 'morningstar', 'le revenu',
  'zonebourse', 'tradingview', 'capital', 'reuters', 'bloomberg', 'l\'agefi',
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
  { url: 'https://news.google.com/rss/search?q=BCE+d%C3%A9cision+taux+march%C3%A9s+impact&hl=fr&gl=FR&ceid=FR:fr', tag: 'BCE / Taux' },
  { url: 'https://news.google.com/rss/search?q=Fed+taux+d%C3%A9cision+bourse+impact&hl=fr&gl=FR&ceid=FR:fr',        tag: 'Fed / Taux' },
  { url: 'https://news.google.com/rss/search?q=inflation+zone+euro+CPI+bourse&hl=fr&gl=FR&ceid=FR:fr',              tag: 'Inflation'  },
  { url: 'https://news.google.com/rss/search?q=CAC+40+Stoxx+march%C3%A9s+actions+analyse&hl=fr&gl=FR&ceid=FR:fr',  tag: 'Marchés'    },
  { url: 'https://news.google.com/rss/search?q=taux+obligataires+spread+OAT+Bund&hl=fr&gl=FR&ceid=FR:fr',           tag: 'Obligataire'},
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
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(f.query)}&hl=fr&gl=FR&ceid=FR:fr`;
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
    if (origin && origin !== 'https://macenxe.github.io' && !origin.startsWith('http://localhost')) {
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
        const c = await coursCmsFT();
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
      await Promise.all(tickers.map(async (t) => { const q = await coursYahoo(t); if (q) quotes[t] = q; }));

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
