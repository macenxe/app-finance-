// Rappel automatique des autocalls + comptabilité des coupons.
// À chaque date de constatation passée, on lit le close du sous-jacent : si la barrière
// autocall est franchie, le produit est rappelé (retiré de l'affichage). Sinon on compte
// les coupons avec effet mémoire (barrière de coupon manquée → coupon mis en réserve, versé
// à la première constatation favorable ; produits sans barrière de coupon → capitalisation).
// Les résultats des dates passées sont figés en cache localStorage pour éviter les refetch.

const Autocall = (() => {
  const CACHE_KEY = 'autocall-eval-v1';

  // --- Parsing des dates et nombres ---
  function parseFR(s) {
    const m = typeof s === 'string' && s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function parseISO(s) {
    const m = typeof s === 'string' && s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function parseDate(s) { return parseFR(s) || parseISO(s); }
  function parseCouponNum(s) {
    const n = parseFloat(String(s == null ? '' : s).replace(/[^0-9,.-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  function fmtFR(d) {
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function isoDe(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function debutJour(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function anneesPleines(a, b) {
    if (!a || !b) return 0;
    let n = b.getFullYear() - a.getFullYear();
    const m = b.getMonth() - a.getMonth();
    if (m < 0 || (m === 0 && b.getDate() < a.getDate())) n--;
    return Math.max(0, n);
  }

  // --- Série des dates de constatation ---
  function datesConstatation(p, today) {
    const dConstat = parseDate(p.constat);
    if (dConstat) {
      const dEmission = parseISO(p.emission);
      if (!dEmission) return { mode: 'annuel', passees: [], prochaine: dConstat };
      const dEch = parseDate(p.ech);
      const jour = dConstat.getDate(), mois = dConstat.getMonth();
      const anDebut = dEmission.getFullYear() + 1;
      const anFin = dEch ? dEch.getFullYear() : Math.max(dConstat.getFullYear(), today.getFullYear() + 1);
      // Première constatation possible : émission + ~11 mois (garde-fou anti double-comptage).
      const seuilPremiere = new Date(dEmission.getFullYear(), dEmission.getMonth() + 11, dEmission.getDate());
      const passees = [];
      let prochaine = null;
      for (let an = anDebut; an <= anFin; an++) {
        const d = new Date(an, mois, jour);
        if (d >= seuilPremiere && d < today) passees.push(d);
        if (prochaine == null && d >= today) prochaine = d;
      }
      return { mode: 'annuel', passees, prochaine };
    }
    // Mode mensuel (produit CAC) : 1er de chaque mois d'émission+1 mois à today (exclu).
    const dEmission = parseISO(p.emission);
    const passees = [];
    if (dEmission) {
      let d = new Date(dEmission.getFullYear(), dEmission.getMonth() + 1, 1);
      while (d < today) { passees.push(d); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
    }
    const prochaine = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { mode: 'mensuel', passees, prochaine };
  }

  // --- Lecture du close à une date de constatation ---
  function closeALaDate(points, d) {
    if (!points || !points.length) return null;
    const finJour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime() / 1000;
    const minT = (d.getTime() - 7 * 86400000) / 1000;
    let close = null;
    for (const pt of points) {
      if (pt.t > finJour) break;
      if (pt.t >= minT) close = pt.c;
    }
    return close;
  }
  // Constatation mensuelle : élargit la fenêtre au premier point du mois [D, D+10j].
  function closeMensuel(points, d) {
    const normal = closeALaDate(points, d);
    if (normal != null) return normal;
    if (!points || !points.length) return null;
    const debut = d.getTime() / 1000;
    const fin = (d.getTime() + 10 * 86400000) / 1000;
    for (const pt of points) {
      if (pt.t > fin) break;
      if (pt.t >= debut) return pt.c;
    }
    return null;
  }

  // --- Évaluation d'un produit ---
  function estRappele(p, niveau) {
    if (p.type === 'equity') {
      const seuil = p.strikeNum * p.bAutoNum / 100;
      return p.estBaisse ? niveau <= seuil : niveau >= seuil;
    }
    return niveau <= p.bAutoNum;
  }
  function niveauCourant(p) {
    if (p.type === 'cms') {
      const n = parseFloat(String(p.niveau).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      return isNaN(n) ? (p.niveauNum != null ? p.niveauNum : null) : n;
    }
    return p.niveauNum != null ? p.niveauNum : null;
  }

  function evaluer(p, points, today) {
    const couponAnnuel = parseCouponNum(p.coupon);
    const { mode, passees, prochaine } = datesConstatation(p, today);
    let reserve = 0, verses = 0, evaluationIncomplete = false;

    if (mode === 'annuel') {
      for (let i = 0; i < passees.length; i++) {
        const D = passees[i];
        let niveau = closeALaDate(points, D);
        if (niveau == null) {
          const recent = (today.getTime() - D.getTime()) <= 45 * 86400000;
          niveau = recent ? niveauCourant(p) : null;
          if (niveau == null) { evaluationIncomplete = true; continue; }
        }
        if (estRappele(p, niveau)) {
          return {
            rappele: true, dateRappel: isoDe(D),
            aVerserAuRappel: reserve + couponAnnuel,
            nPlusX: 'N+' + (i + 1), couponsReserve: reserve, couponsVerses: verses,
          };
        }
        if (p.bCouponNum != null) {
          const atteint = p.type === 'equity'
            ? (p.estBaisse ? (niveau / p.strikeNum * 100) <= p.bCouponNum : (niveau / p.strikeNum * 100) >= p.bCouponNum)
            : niveau <= p.bCouponNum;
          if (atteint) { verses += couponAnnuel + reserve; reserve = 0; }
          else reserve += couponAnnuel;
        } else {
          reserve += couponAnnuel;
        }
      }
      return {
        rappele: false, nPlusX: 'N+' + (passees.length + 1),
        couponsReserve: reserve, couponsVerses: verses, evaluationIncomplete, prochaine,
      };
    }

    // Mode mensuel : pas de comptage de coupon par mois ; réserve = coupons des années pleines.
    for (const D of passees) {
      let niveau = closeMensuel(points, D);
      if (niveau == null) {
        const recent = (today.getTime() - D.getTime()) <= 45 * 86400000;
        niveau = recent ? niveauCourant(p) : null;
        if (niveau == null) { evaluationIncomplete = true; continue; }
      }
      if (estRappele(p, niveau)) {
        const ap = anneesPleines(parseISO(p.emission), D);
        return {
          rappele: true, dateRappel: isoDe(D),
          aVerserAuRappel: couponAnnuel * ap + couponAnnuel,
          nPlusX: 'N+' + (ap + 1), couponsReserve: couponAnnuel * ap, couponsVerses: 0,
        };
      }
    }
    const ap = anneesPleines(parseISO(p.emission), today);
    return {
      rappele: false, nPlusX: 'N+' + (ap + 1),
      couponsReserve: couponAnnuel * ap, couponsVerses: 0, evaluationIncomplete, prochaine,
    };
  }

  // --- Ticker et période d'historique ---
  function tickerHistorique(p) {
    // CMS : proxy swap EUR 10y. Equity : ticker tel quel (SX7E.PA échoue → fallback 45 j).
    return p.type === 'cms' ? 'scrape:cms' : p.ticker;
  }
  function periodePour(passees, today) {
    if (!passees || !passees.length) return '1a';
    const jours = (today.getTime() - passees[0].getTime()) / 86400000;
    return jours < 350 ? '1a' : jours < 1050 ? '3a' : '5a';
  }

  // --- Cache localStorage ---
  function lireCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
  }
  function ecrireCache(c) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
  }

  // --- Annotation du produit ---
  function annoter(p, res, dc, today) {
    p.nPlusX = res.nPlusX;
    p.couponsReserve = res.couponsReserve;
    p.couponsVerses = res.couponsVerses;
    p.evaluationIncomplete = res.evaluationIncomplete || false;
    if (res.rappele) {
      p.rappele = true;
      p.dateRappel = res.dateRappel;
      p.aVerserAuRappel = res.aVerserAuRappel;
    } else if (dc.mode === 'annuel' && dc.prochaine) {
      const dConstat = parseFR(p.constat);
      if (dConstat && dConstat < today) p.constat = fmtFR(dc.prochaine);
    }
  }

  // --- Application sur la liste des produits ---
  async function appliquer(produits) {
    const today = debutJour(new Date());
    const cache = lireCache();

    // Les tâches concurrentes annotent seulement ; les listes sont reconstruites ensuite
    // dans l'ordre d'origine (l'ordre des chips de catégories en dépend).
    const taches = (produits || []).map(p => (async () => {
      try {
        const dc = datesConstatation(p, today);
        let res;
        if (dc.passees.length === 0 && dc.mode === 'annuel') {
          res = { rappele: false, nPlusX: 'N+1', couponsReserve: 0, couponsVerses: 0, evaluationIncomplete: false, prochaine: dc.prochaine };
        } else {
          const derniere = dc.passees.length ? isoDe(dc.passees[dc.passees.length - 1]) : '';
          const cle = derniere + '|' + p.bAutoNum + '|' + (p.strikeNum != null ? p.strikeNum : '');
          const hit = cache[p.isin];
          if (hit && hit.cle === cle) {
            res = hit.res;
          } else {
            let points = [];
            try {
              if (typeof AppAPI !== 'undefined' && AppAPI.historyUrl) {
                const url = AppAPI.historyUrl(tickerHistorique(p), periodePour(dc.passees, today));
                const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
                if (r.ok) points = (await r.json()).points || [];
              }
            } catch { points = []; }
            res = evaluer(p, points, today);
            cache[p.isin] = { cle, res };
          }
        }
        annoter(p, res, dc, today);
      } catch { /* produit conservé tel quel dans actifs */ }
    })());

    await Promise.allSettled(taches);
    ecrireCache(cache);
    const actifs = [], rappeles = [];
    for (const p of produits || []) (p.rappele ? rappeles : actifs).push(p);
    return { actifs, rappeles };
  }

  return { appliquer, evaluer, datesConstatation };
})();

if (typeof module !== 'undefined') module.exports = Autocall;
