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
      id:          p.id,
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

  // Convertit un taux obligataire API vers le format TAUX de data.js.
  // variationPct Yahoo = % relatif du taux ; on approxime en points de base.
  function normaliserTaux(t) {
    let varLabel = 'stable';
    let hausse = null;
    if (t.variationPct != null && t.dernierCours != null && t.variationPct !== 0) {
      const bps = Math.round(t.variationPct * t.dernierCours);
      if (bps !== 0) {
        hausse = bps > 0;
        varLabel = (bps > 0 ? '+' : '') + bps + ' pb';
      }
    }
    return {
      nom:    t.nom,
      valeur: t.dernierCours.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %',
      var:    varLabel,
      hausse,
      manuel:  t.manuel  ?? false,
      dateMaj: t.dateMaj ?? null,
    };
  }

  // Fusionne taux live et statiques.
  // CMS 10 ans : utilise la valeur live (saisie manuelle en DB) si disponible,
  // sinon fallback sur la valeur statique de data.js.
  function construireTaux(tauxLive) {
    const liveMap = {};
    tauxLive.forEach(t => { liveMap[t.nom] = t; });
    return TAUX.map(t => liveMap[t.nom] ?? t);
  }

  async function chargerDonnees() {
    try {
      const [indicesAPI, produitsAPI] = await Promise.all([
        fetchJson(`${BASE}/indices`),
        fetchJson(`${BASE}/produits`),
      ]);
      let tauxLive = [];
      try { tauxLive = await fetchJson(`${BASE}/taux`); } catch { /* fallback statique */ }

      backOk = true;
      return {
        source:   'api',
        indices:  indicesAPI.map(normaliserIndice),
        produits: produitsAPI.map(normaliserProduit),
        taux:     construireTaux(tauxLive.map(normaliserTaux)),
      };
    } catch {
      backOk = false;
      return {
        source:   'statique',
        indices:  INDICES_MARCHE,
        produits: enrichirProduits(PRODUITS),
        taux:     TAUX,
      };
    }
  }

  async function ajouterProduit(data) {
    const r = await fetch(`${BASE}/produits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function supprimerProduit(id) {
    const r = await fetch(`${BASE}/produits/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  }

  async function mettreAJourCMS(valeur) {
    const r = await fetch(`${BASE}/taux/cms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valeur }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  return { chargerDonnees, estConnecte: () => backOk, ajouterProduit, supprimerProduit, mettreAJourCMS };
})();
