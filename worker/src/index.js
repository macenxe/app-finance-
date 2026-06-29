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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  // cacheTtl: 0 → on force Cloudflare à toujours rechercher la dernière valeur Yahoo.
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 0 } });
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
const FT_CMS_SYM = 'A@?EURIRSXY:RCT';
const FT_CMS_XID = '5767342';
const FT_TEARSHEET = `https://markets.ft.com/data/indices/tearsheet/summary?s=${encodeURIComponent(FT_CMS_SYM)}`;
const FT_PERIODES = {
  '1j': { days: 3, p: 'Day' }, '1s': { days: 10, p: 'Day' }, '1m': { days: 35, p: 'Day' },
  '6m': { days: 190, p: 'Day' }, '1a': { days: 370, p: 'Day' },
  '3a': { days: 1100, p: 'Week' }, '5a': { days: 1850, p: 'Week' }, '10a': { days: 3700, p: 'Month' },
};

// Valeur courante du CMS 10 ans (clôture FT).
async function coursCmsFT() {
  const r = await fetch(FT_TEARSHEET, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 900 } });
  if (!r.ok) return null;
  const m = (await r.text()).match(/mod-ui-data-list__value">([0-9.]+)/);
  if (!m) return null;
  return { nom: 'CMS 10 ans', valeur: parseFloat(m[1]), source: 'FT Markets · Euro 10y swap', heure: new Date().toISOString() };
}

// Historique du CMS 10 ans (FT chartapi).
async function historiqueCmsFT(periode) {
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
  if (points.length < 2) return null;
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
      zoneAutocall = niveau >= (p.barriereAutocall / 100) * p.strike;
    }
    if (zoneAutocall) statutZone = 'rappel_probable';
    else if (pctStrike !== null && pctStrike < 75) statutZone = 'risque';
  } else if (p.typeProduit === 'cms') {
    if (p.barriereAutocall !== null && niveau >= p.barriereAutocall) { zoneAutocall = true; statutZone = 'rappel_probable'; }
    else if (p.barriereCoupon !== null && niveau < p.barriereCoupon) statutZone = 'risque';
  }
  return { produitId: p.id, pctStrike, zoneAutocall, statutZone };
}

export default {
  async fetch(request, env) {
    // Pré-vol CORS (par sécurité ; les requêtes GET simples n'en déclenchent pas).
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
    }

    const u = new URL(request.url);

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
      const snap = await (await fetch(SNAPSHOT_URL, { cf: { cacheTtl: 0 } })).json();

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
