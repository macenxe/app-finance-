// Client API — se connecte au back sur :3001.
// Exposé comme global window.AppAPI.
// Si le back est indisponible, retourne les données statiques de data.js.

const AppAPI = (() => {
  const BASE = 'http://localhost:3001/api';
  let backOk = false;

  async function fetchJson(url) {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Convertit un ProduitEnrichi (API) vers le format interne de pages.js
  function normaliserProduit(p) {
    const fmt2 = (n) => n != null
      ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'NA';

    const pctNum = p.indicateurs?.pctStrike ?? null;
    const pct = pctNum != null
      ? pctNum.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
      : '—';

    const zoneMap = { rappel_probable: 'green', surveillance: 'orange', risque: 'red' };
    const k = p.indicateurs?.statutZone ? (zoneMap[p.indicateurs.statutZone] ?? 'orange') : 'orange';
    const statuts = { green: 'Rappel probable', orange: 'Surveillance', red: 'Risque' };

    const niveauNum = p.cours?.dernierCours ?? null;

    return {
      isin:        p.isin,
      nom:         p.nom,
      sj:          p.sousJacentLabel,
      coupon:      p.coupon + ' %',
      strike:      p.strike != null ? fmt2(p.strike) : 'NA',
      niveau:      niveauNum != null ? fmt2(niveauNum) : '—',
      bAuto:       p.barriereAutocall != null ? p.barriereAutocall + ' %' : '—',
      bCoupon:     p.barriereCoupon   != null ? p.barriereCoupon   + ' %' : 'NA',
      constat:     p.constat,
      ech:         p.echeance,
      type:        p.typeProduit,
      strikeNum:   p.strike,
      niveauNum,
      zoneAutocall: p.indicateurs?.zoneAutocall ? 'OUI' : 'NON',
      k,
      statut:      statuts[k],
      pct,
    };
  }

  // Convertit un cours d'indice API vers le format INDICES_MARCHE
  function normaliserIndice(c) {
    let varLabel = null;
    let hausse   = null;
    if (c.variationPct != null) {
      const pct = c.variationPct;
      hausse   = pct >= 0;
      varLabel = (pct >= 0 ? '+' : '') +
        pct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
    }
    return {
      ticker:     c.sousJacent,
      nom:        c.nom,
      valeur:     c.dernierCours.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      var:        varLabel,
      hausse,
      heureCours: c.heureCours,
    };
  }

  async function chargerDonnees() {
    try {
      const [indicesAPI, produitsAPI] = await Promise.all([
        fetchJson(`${BASE}/indices`),
        fetchJson(`${BASE}/produits`),
      ]);
      backOk = true;
      return {
        source:   'api',
        indices:  indicesAPI.map(normaliserIndice),
        produits: produitsAPI.map(normaliserProduit),
      };
    } catch {
      backOk = false;
      return {
        source:   'statique',
        indices:  INDICES_MARCHE,
        produits: enrichirProduits(PRODUITS),
      };
    }
  }

  return { chargerDonnees, estConnecte: () => backOk };
})();
