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
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
  async fetch() {
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
