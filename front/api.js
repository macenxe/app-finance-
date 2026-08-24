// Client API — se connecte au back sur :3001.
// Exposé comme global window.AppAPI.
// Si le back est indisponible, retourne les données statiques de data.js.

const AppAPI = (() => {
  const BASE = 'http://localhost:3001/api';
  // Source live : Cloudflare Worker (cours du moment).
  const WORKER = 'https://app-finance-live.maxenceevrd.workers.dev';
  let backOk = false;

  // Le back local n'existe qu'en développement. Hors localhost, l'appeler quand même
  // laisserait deux erreurs réseau dans la console du visiteur et retarderait le repli.
  function estLocal() {
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }

  async function fetchJson(url, timeout = 4000) {
    // cache: 'no-store' → le navigateur ne sert jamais une réponse en cache,
    // pour que chaque ouverture/rafraîchissement reparte des cours du moment.
    const r = await fetch(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Convertit un ProduitEnrichi (API) vers le format interne de pages.js
  function normaliserProduit(p) {
    const fmt2 = (n) => n != null
      ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'NA';
    // Format court (virgule française, sans zéros inutiles) pour les taux/barrières en %.
    const fmtPct = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

    const pctNum = p.indicateurs?.pctStrike ?? null;
    const pct = pctNum != null
      ? pctNum.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
      : '—';

    const niveauNum = p.cours?.dernierCours ?? null;
    const bAutoRaw  = p.barriereAutocall;
    const estBaisse = p.typeProduit === 'cms' ||
      (p.typeProduit === 'equity' && bAutoRaw != null && bAutoRaw < 100);

    // Recalcul dynamique (même logique que enrichirProduits dans data.js)
    let zoneAutoFresh;
    if (p.typeProduit === 'equity' && p.strike && niveauNum != null && bAutoRaw != null) {
      const seuil = p.strike * bAutoRaw / 100;
      zoneAutoFresh = estBaisse ? (niveauNum <= seuil ? 'OUI' : 'NON') : (niveauNum >= seuil ? 'OUI' : 'NON');
    } else if (p.typeProduit === 'cms' && niveauNum != null && bAutoRaw != null) {
      zoneAutoFresh = niveauNum <= bAutoRaw ? 'OUI' : 'NON';
    } else {
      zoneAutoFresh = p.indicateurs?.zoneAutocall ? 'OUI' : 'NON';
    }
    let couponAtteint = false;
    if (p.barriereCoupon != null) {
      if (p.typeProduit === 'equity' && p.strike && niveauNum != null) {
        const nPct = niveauNum / p.strike * 100;
        couponAtteint = estBaisse ? nPct <= p.barriereCoupon : nPct >= p.barriereCoupon;
      } else if (p.typeProduit === 'cms' && niveauNum != null) {
        couponAtteint = niveauNum <= p.barriereCoupon;
      }
    }
    const staticP = typeof PRODUITS !== 'undefined' ? PRODUITS.find(x => x.isin === p.isin) : null;
    // Préfère la protection de la source live (snapshot), repli sur la liste statique.
    const prot = p.protection ?? staticP?.protection ?? null;
    const protMatch = String(prot || '').match(/-(\d+)/);
    const belowProtection = !!(protMatch && p.typeProduit === 'equity' && p.strike && niveauNum != null
      && niveauNum < p.strike * (1 - parseInt(protMatch[1]) / 100));
    let k;
    if (zoneAutoFresh === 'OUI') k = 'green';
    else if (belowProtection) k = 'red';
    else k = 'orange';

    return {
      id:          p.id,
      isin:        p.isin,
      nom:         p.nom,
      sj:          p.sousJacentLabel,
      coupon:      p.coupon != null ? fmtPct(p.coupon) + ' %' : '—',
      strike:      p.strike != null ? fmt2(p.strike) : 'NA',
      niveau:      niveauNum != null ? fmt2(niveauNum) : '—',
      bAuto:       p.barriereAutocall != null ? fmtPct(p.barriereAutocall) + ' %' : '—',
      bCoupon:     p.barriereCoupon   != null ? fmtPct(p.barriereCoupon)   + ' %' : 'NA',
      constat:     p.constat,
      ech:         p.echeance,
      emission:    p.emission ?? staticP?.emission ?? null,
      type:        p.typeProduit,
      strikeNum:   p.strike,
      niveauNum,
      ticker:      p.sousJacent,
      sjLabel:     p.sousJacentLabel,
      bAutoNum:    p.barriereAutocall,
      bCouponNum:  p.barriereCoupon,
      zoneAutocall: zoneAutoFresh,
      k,
      estBaisse,
      couponAtteint,
      belowProtection,
      pct,
      protection:  prot,
      dateValorisation: p.cours?.heureCours ?? null,
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

  // Assemble la réponse à partir de données au format API (back local OU snapshot publié).
  // Merge indices live + statiques : si un indice n'est pas retourné (ex. SX7E.PA non
  // supporté par Yahoo), on conserve la valeur statique de data.js.
  function assembler(source, indicesAPI, produitsAPI, tauxLive) {
    const liveIndicesMap = {};
    indicesAPI.map(normaliserIndice).forEach(i => { liveIndicesMap[i.nom] = i; });
    const indices = INDICES_MARCHE.map(i => liveIndicesMap[i.nom] ?? i);
    return {
      source,
      indices,
      produits: produitsAPI.map(normaliserProduit),
      taux:     construireTaux((tauxLive || []).map(normaliserTaux)),
    };
  }

  async function chargerDonnees() {
    // 1. Back local (développement uniquement). En production, on saute directement à la
    // source live : l'appel vers localhost ne peut qu'échouer et bruite la console.
    if (estLocal()) {
      try {
        const [indicesAPI, produitsAPI] = await Promise.all([
          fetchJson(`${BASE}/indices`),
          fetchJson(`${BASE}/produits`),
        ]);
        let tauxLive = [];
        try { tauxLive = await fetchJson(`${BASE}/taux`); } catch { /* fallback statique */ }
        backOk = true;
        return assembler('api', indicesAPI, produitsAPI, tauxLive);
      } catch { /* pas de back local : on tente la source live puis le snapshot */ }
    }

    // 2. Source live (Cloudflare Worker) — cours du moment
    if (WORKER) {
      try {
        const live = await fetchJson(WORKER, 8000);
        backOk = false;
        return assembler('snapshot', live.indices ?? [], live.produits ?? [], live.taux ?? []);
      } catch { /* worker indisponible : on tente le snapshot publié */ }
    }

    // 3. Snapshot généré par GitHub Actions (même format que l'API)
    try {
      const snap = await fetchJson('./data/snapshot.json');
      backOk = false;
      return { ...assembler('snapshot', snap.indices ?? [], snap.produits ?? [], snap.taux ?? []), genere: snap.genere };
    } catch { /* pas de snapshot : on tombe sur le statique */ }

    // 4. Données statiques de data.js (dernier recours)
    backOk = false;
    return {
      source:   'statique',
      indices:  INDICES_MARCHE,
      produits: enrichirProduits(PRODUITS),
      taux:     TAUX,
    };
  }

  // URL de l'historique d'un graphique.
  // Taux & inflation (fred:/hicp:) : fichiers JSON statiques pré-générés, servis en même
  // origine (pas de CORS, pas de clé, pas de Worker). Le reste (cours Yahoo) passe par le
  // Worker, qui autorise le CORS cross-origin (y compris depuis localhost en dev).
  function historyUrl(id, period) {
    if (id.indexOf('fred:') === 0 || id.indexOf('hicp:') === 0) {
      return `./data/history/${id.slice(5)}.json`;
    }
    const q = `history=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}`;
    return `${WORKER}?${q}`;
  }

  // ── Période : une seule définition de fenêtre et de performance pour toute l'app ─────────
  // Le tableau des fonds et le graphique affichaient deux chiffres différents pour la même
  // période (jusqu'à 80 points d'écart sur « 5 ans ») : chacun prenait pour base le PREMIER
  // POINT de la série qu'il avait sous la main, or leurs séries n'ont ni la même profondeur ni
  // la même fenêtre — le tableau annonçait « 5 ans » sur les 4,4 ans que Yahoo veut bien
  // servir, le graphique coupait à 1850 jours (5,07 ans) sur l'historique long.
  // Une période est donc désormais définie par une DATE D'ANCRAGE calendaire, la même partout.
  const ANS_P   = { '1a': 1, '3a': 3, '5a': 5, '10a': 10 };
  const MOIS_P  = { '1m': 1, '6m': 6 };
  const JOURS_P = { '1j': 1, '1s': 7 };
  function ancrePeriode(periode) {
    if (periode === 'ytd') return Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    const d = new Date();
    // Années et mois CALENDAIRES (et non 365 ou 30 jours) : « 3 ans glissants » se compte du
    // même jour du même mois, comme le fait n'importe quelle fiche de fonds.
    if (ANS_P[periode])  { d.setFullYear(d.getFullYear() - ANS_P[periode]); return Math.floor(d.getTime() / 1000); }
    if (MOIS_P[periode]) { d.setMonth(d.getMonth() - MOIS_P[periode]);      return Math.floor(d.getTime() / 1000); }
    return Math.floor((Date.now() - (JOURS_P[periode] || 184) * 86400000) / 1000);
  }

  // Séries statiques (tout l'historique dans le fichier) : filtrage de la période côté client.
  // On garde les points depuis l'ancre PLUS le dernier qui la précède : c'est lui la base de la
  // performance (« la VL d'il y a 5 ans »), et la courbe doit partir de là pour que le
  // pourcentage affiché sous le graphique soit exactement celui de la colonne du tableau.
  function filtrerPeriode(points, periode) {
    const ancre = ancrePeriode(periode);
    const i = points.findIndex(p => p.t >= ancre);
    if (i < 0) return points.slice(-6);
    const f = points.slice(i > 0 ? i - 1 : 0);
    return f.length >= 2 ? f : points.slice(-6);
  }

  // Tolérance d'ancrage : une série tombe rarement pile sur l'ancre (week-ends, jours fériés,
  // grille hebdomadaire du résumé des VL). On accepte donc un premier point un peu postérieur
  // à l'ancre — 2 % de la période, borné à [3 j, 14 j]. Au-delà, la période n'est pas couverte
  // et perfPeriode ne rend rien : mieux vaut une colonne vide qu'une hausse de 4,4 ans
  // présentée comme « 5 ans ».
  function toleranceJours(periode) {
    const jours = (Date.now() / 1000 - ancrePeriode(periode)) / 86400;
    return Math.min(14, Math.max(3, jours * 0.02));
  }

  // Performance d'une série sur une période : de la VL de référence (la dernière connue AVANT
  // l'ancre) à la dernière VL de la série. null quand la série ne remonte pas jusqu'à l'ancre.
  function perfPeriode(points, periode) {
    if (!points || points.length < 2) return null;
    const ancre = ancrePeriode(periode);
    const fin = points[points.length - 1];
    let base = null;
    for (const p of points) { if (p.t <= ancre) base = p; else break; }
    if (!base) {
      if (points[0].t - ancre > toleranceJours(periode) * 86400) return null;
      base = points[0];
    }
    if (!(base.c > 0) || base.t >= fin.t) return null;
    return (fin.c - base.c) / base.c * 100;
  }

  // Résumé hebdomadaire des VL des fonds (front/data/uc-vl-hebdo.json, généré par la CI depuis
  // les historiques complets — back/src/uc-vl-hebdo.ts). Il donne au TABLEAU la profondeur que
  // le Worker n'a pas, en une requête d'environ 60 Ko au lieu des 5,5 Mo d'historiques complets
  // que charge le graphique fonds par fonds. Chargé une fois, gardé pour la session.
  let vlHebdo = null, vlHebdoPromesse = null;
  function chargerVLHebdo() {
    if (vlHebdo) return Promise.resolve(vlHebdo);
    if (!vlHebdoPromesse) {
      vlHebdoPromesse = fetchJson('./data/uc-vl-hebdo.json', 8000)
        .then(d => (vlHebdo = (d && d.fonds) || {}))
        .catch(() => (vlHebdo = {}));
    }
    return vlHebdoPromesse;
  }
  // Série hebdomadaire d'un fonds, ramenée au format {t,c} des autres séries. Le fichier stocke
  // des JOURS depuis l'epoch (5 chiffres au lieu de 10 : une VL est datée du jour, jamais de
  // l'heure), d'où la conversion ici.
  function serieHebdo(graphId) {
    const s = vlHebdo && vlHebdo[graphId];
    if (!s || !s.j) return [];
    return s.j.map((j, i) => ({ t: j * 86400, c: s.c[i] }));
  }

  // Historique des UC (graphId Morningstar 0P…F) : fusion profondeur + fraîcheur.
  // Le fichier statique front/data/history/uc/<graphId>.json (FT, jusqu'à 35 ans) porte la
  // profondeur ; le Worker (Yahoo, qui ne remonte qu'à fin 2017) porte les jours récents.
  // Sur le chevauchement, le live prime : tout jour servi par le live évince le point statique
  // du même jour (les points live sont gardés tels quels, y compris intrajournaliers).
  // `debut` = premier point fusionné, pour que chart.js dévoile 5 ans et 10 ans.
  const RE_UC = /^0P\w+\.F$/i;
  const jourDe = t => Math.floor(t / 86400);

  // Fusion « série profonde + série live » : tout jour servi par le live évince le point
  // profond du même jour (les points live sont gardés tels quels, y compris intrajournaliers).
  // Partagée par le graphique (historiqueUC) et par le tableau des fonds (chargerPerfsUC dans
  // app.js) : c'est la même règle des deux côtés qui les fait repartir du même point de base.
  function fusionnerSeries(profond, live) {
    const joursLive = new Set(live.map(p => jourDe(p.t)));
    return profond.filter(p => !joursLive.has(jourDe(p.t))).concat(live).sort((a, b) => a.t - b.t);
  }

  // Périodes intrajournalières ou courtes : c'est la série live de la période demandée qui
  // convient (5 min, 15 min, quotidien). Au-delà, on demande toujours le QUOTIDIEN D'UN AN et
  // rien d'autre : la profondeur vient du fichier statique, le live n'apporte que la fraîcheur.
  // Demander la série de la période (hebdomadaire en 3a/5a, mensuelle en 10a) faisait deux
  // dégâts : son dernier point s'arrête plusieurs jours avant la dernière VL — passer de
  // « 1 an » à « 5 ans » faisait alors reculer le dernier point et le pourcentage affiché — et
  // ses points, datés du dimanche, s'intercalaient entre les VL du fichier, si bien que la base
  // de la performance tombait tantôt sur l'un tantôt sur l'autre.
  const PERIODES_COURTES = ['1j', '1s', '1m', '6m'];

  async function historiqueUC(id, periode) {
    const fichier = id.replace(/[^A-Za-z0-9_.-]/g, '_');
    const liveDe = p => fetchJson(`${WORKER}?history=${encodeURIComponent(id)}&period=${encodeURIComponent(p)}`, 8000)
      .then(d => ((d.points || []).length >= 2 ? d : null)).catch(() => null);
    const courte = PERIODES_COURTES.includes(periode);
    const [statique, live] = await Promise.all([
      fetchJson(`./data/history/uc/${fichier}.json`).catch(() => null),
      liveDe(courte ? periode : '1a'),
    ]);
    let ptsLive = live ? live.points || [] : [];
    if (!statique && !courte) {
      // Fonds sans fichier statique (l'export FT n'a pas abouti pour lui) : le quotidien d'un an
      // ne suffit ni à la profondeur ni à la base d'une période plus longue. On complète avec
      // l'hebdomadaire de cinq ans du Worker — exactement ce que fait le tableau des fonds dans
      // ce cas (chargerPerfsUC, app.js), pour que les deux repartent du même point.
      const h = await liveDe('5a');
      if (h) ptsLive = fusionnerSeries(h.points || [], ptsLive);
    }
    if (!statique) {
      if (ptsLive.length < 2) throw new Error('historique indisponible');
      return {
        ...(live || {}), ticker: id,
        points: filtrerPeriode(ptsLive, periode),
        debut: (live && live.debut) || null,
      };
    }
    const fusion = fusionnerSeries(statique.points || [], ptsLive);
    return {
      ...(live || {}),
      ticker: id,
      points: filtrerPeriode(fusion, periode),
      debut: fusion.length ? fusion[0].t : (live && live.debut) || null,
    };
  }

  // Charge l'historique d'un ticker pour un graphique (chart.js), avec repli automatique :
  // 1. fred:/hicp: → toujours statique (jamais servi par le Worker), filtré par période ici.
  // 2. UC (0P…F) → fusion statique uc/ + live Worker (cf. historiqueUC).
  // 3. scrape: (CMS) → Worker (filtre le fichier publié) ; si injoignable, repli sur le
  //    fichier local front/data/history/cms.json, filtré par période ici.
  // 4. Cours (indices/actions) → Worker (cours du moment) ; si injoignable (ex. pare-feu
  //    d'entreprise bloquant *.workers.dev), repli sur front/data/history/eq/<ticker>.json,
  //    pré-généré par GitHub Actions (back/src/history-snapshot.ts), filtré par période.
  async function chargerHistorique(id, periode) {
    if (id.indexOf('fred:') === 0 || id.indexOf('hicp:') === 0) {
      const d = await fetchJson(`./data/history/${id.slice(5)}.json`);
      return { ...d, points: filtrerPeriode(d.points || [], periode) };
    }
    if (RE_UC.test(id)) return historiqueUC(id, periode);
    if (id.indexOf('scrape:') === 0) {
      try {
        const q = `history=${encodeURIComponent(id)}&period=${encodeURIComponent(periode)}`;
        const d = await fetchJson(`${WORKER}?${q}`, 8000);
        if ((d.points || []).length >= 2) return d;
      } catch { /* Worker injoignable : on tente le repli statique */ }
      // Repli statique générique : scrape:<nom> → ./data/history/<nom>.json (cms, oat).
      const d = await fetchJson(`./data/history/${id.slice(7)}.json`);
      return { ...d, points: filtrerPeriode(d.points || [], periode) };
    }
    try {
      const q = `history=${encodeURIComponent(id)}&period=${encodeURIComponent(periode)}`;
      const d = await fetchJson(`${WORKER}?${q}`, 8000);
      if ((d.points || []).length >= 2) return d;
    } catch { /* Worker injoignable : on tente le repli statique */ }
    const fichier = id.replace(/[^A-Za-z0-9_.-]/g, '_');
    const d = await fetchJson(`./data/history/eq/${fichier}.json`);
    return { ...d, points: filtrerPeriode(d.points || [], periode) };
  }

  // URL de la valeur courante du CMS 10 ans (Chatham via Worker). En dev local, le serveur
  // front (.claude/front-server.js) sert la même logique sur /__cms : sans cette bascule, la
  // carte refléterait le Worker déployé, pas le code courant.
  function cmsUrl() {
    if (estLocal()) return './__cms';
    return `${WORKER}?cms=1`;
  }

  async function chargerNews() {
    if (estLocal()) return fetchJson(`${BASE}/news`, 12000);
    // Le Worker agrège 10 flux RSS (lent au premier appel, puis en cache) : délai large.
    return fetchJson(`${WORKER}?news=1`, 18000);
  }

  return {
    chargerDonnees, chargerNews, worker: WORKER, historyUrl, chargerHistorique, cmsUrl,
    ancrePeriode, perfPeriode, chargerVLHebdo, serieHebdo, fusionnerSeries,
  };
})();
