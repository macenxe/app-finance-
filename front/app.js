const App = (() => {
  let state   = { page: 'dash', filter: 'tous', cat: null, q: '', detailIsin: null };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS), taux: TAUX };
  let ucPerfsCache = {};
  let ucPerfsFetching = false;

  const CACHE_KEY       = 'app-cache-v3';
  const CMS_OVERRIDE_KEY = 'cms-taux-override';

  function appliquerCMSInterne(valeur) {
    const fmt2 = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    donnees.taux = donnees.taux.map(t => {
      if (t.nom !== 'CMS 10 ans') return t;
      return { ...t, valeur: fmt2(valeur) + ' %', dateMaj: new Date().toISOString().slice(0, 10) };
    });
    donnees.produits = donnees.produits.map(p => {
      if (p.type !== 'cms') return p;
      const niveauNum = valeur;
      const niveau = fmt2(valeur);
      const zoneAutocall = p.bAutoNum != null ? (niveauNum <= p.bAutoNum ? 'OUI' : 'NON') : p.zoneAutocall;
      const couponAtteint = p.bCouponNum != null ? niveauNum <= p.bCouponNum : false;
      const k = zoneAutocall === 'OUI' ? 'green' : 'orange';
      const statuts = { green: 'Zone Rappel', orange: 'Zone Coupon', red: 'Risque' };
      return { ...p, niveauNum, niveau, zoneAutocall, couponAtteint, k, statut: statuts[k] };
    });
  }

  function chartTickerPour(p) {
    const t = p.ticker || p.sj || '';
    if (t === 'SX7E.PA' || t === 'ES Banks') return 'BNKE.PA';
    if (t === 'CMS10' || p.type === 'cms')   return 'scrape:cms'; // swap EUR 10y via FT
    return t;
  }

  function lignesPour(p) {
    const lignes = [];
    if (p.type === 'equity' && p.strikeNum) {
      lignes.push({ valeur: p.strikeNum, label: 'Strike', couleur: '#16304f' });
      if (p.bAutoNum != null) {
        const v = (p.bAutoNum / 100) * p.strikeNum;
        if (Math.abs(v - p.strikeNum) > p.strikeNum * 0.005) lignes.push({ valeur: v, label: 'B. autocall', couleur: '#1d6f4c' });
      }
      if (p.bCouponNum != null) lignes.push({ valeur: (p.bCouponNum / 100) * p.strikeNum, label: 'B. coupon', couleur: '#9a3535' });
      if (p.protection) {
        const pm = String(p.protection).match(/-(\d+)/);
        if (pm) lignes.push({ valeur: p.strikeNum * (1 - parseInt(pm[1], 10) / 100), label: 'Protection −' + pm[1] + ' %', couleur: '#b06a1a' });
      }
    } else if (p.type === 'cms') {
      // Le graphique CMS est en % : on place les barrières (en %) comme repères.
      if (p.bCouponNum != null) lignes.push({ valeur: p.bCouponNum, label: 'B. coupon',   couleur: '#9a3535' });
      if (p.bAutoNum   != null) lignes.push({ valeur: p.bAutoNum,   label: 'B. autocall', couleur: '#1d6f4c' });
    }
    return lignes;
  }

  function sauvegarderEtat() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        // Restaure la page courante au rafraîchissement (les fiches détail reviennent à la liste).
        page: (state.page === 'detail' || state.page === 'detail-groupe') ? 'prod' : state.page,
        ucCat: state.ucCat || null,
        indices: donnees.indices,
        taux: donnees.taux,
        produits: donnees.produits,
        macro: (typeof MACRO !== 'undefined') ? MACRO.map(m => ({ nom: m.nom, valeur: m.valeur, var: m.var, hausse: m.hausse })) : null,
      }));
    } catch {}
  }

  function restaurerEtat() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const c = JSON.parse(raw);
      if (c.page) state = { ...state, page: c.page, ucCat: c.ucCat || null };
      if (c.indices) donnees = { ...donnees, indices: c.indices, taux: c.taux || donnees.taux, produits: c.produits || donnees.produits };
      // Réapplique les dernières valeurs live des Actifs pour éviter le retour aux valeurs statiques au 1er rendu.
      if (c.macro && typeof MACRO !== 'undefined') {
        c.macro.forEach(s => { const m = MACRO.find(x => x.nom === s.nom); if (m) { m.valeur = s.valeur; m.var = s.var; m.hausse = s.hausse; } });
      }
    } catch {}
  }

  async function chargerPerfsUC() {
    if (ucPerfsFetching || typeof AppAPI === 'undefined' || !AppAPI.historyUrl) return;
    if (typeof UC_CATALOGUE === 'undefined') return;
    ucPerfsFetching = true;
    await Promise.allSettled(
      UC_CATALOGUE.filter(u => u.graphId).map(async u => {
        try {
          const url = AppAPI.historyUrl(u.graphId, '1a');
          const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
          if (!r.ok) return;
          const pts = (await r.json()).points || [];
          if (pts.length < 2) return;
          const first = pts[0].c, last = pts[pts.length - 1].c;
          if (first > 0) ucPerfsCache[u.isin] = (last - first) / first * 100;
        } catch { /* on ignore */ }
      })
    );
    ucPerfsFetching = false;
    if (state.page === 'contrats') renderPage(true);
  }

  const NAV = [
    { key: 'dash',     label: 'Tableau de bord'        },
    { key: 'actus',    label: 'Actualités économiques'  },
    { key: 'prod',     label: 'Autocalls'               },
    { key: 'contrats', label: 'Fonds € et UC'           },
  ];

  function renderNav() {
    const activeKey = (state.page === 'detail' || state.page === 'detail-groupe') ? 'prod' : state.page;
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
  }

  function renderPage(keepScroll = false) {
    const el = document.getElementById('content');
    const saved = keepScroll ? el.scrollTop : 0;
    const { indices, produits } = donnees;
    switch (state.page) {
      case 'dash':     el.innerHTML = renderDashboard(indices, produits, donnees.taux); break;
      case 'prod':     el.innerHTML = renderProduits(produits, state);  break;
      case 'actus':    el.innerHTML = renderActus(); chargerActus(); break;
      case 'contrats':
        el.innerHTML = renderContrats(state, ucPerfsCache);
        if (!ucPerfsFetching && Object.keys(ucPerfsCache).length === 0) chargerPerfsUC();
        break;
      case 'detail': {
        const p = produits.find(p => p.isin === state.detailIsin);
        el.innerHTML = p ? renderDetail(p) : renderProduits(produits, state);
        if (p && window.Chart) {
          const lignes = lignesPour(p);
          Chart.ouvrirInline('detail-chart-inline', chartTickerPour(p), p.nom, {
            lignes, sous: p.sjLabel || p.sj,
          });
        }
        break;
      }
      case 'detail-groupe': {
        const membres = (state.detailIsins || []).map(isin => produits.find(p => p.isin === isin)).filter(Boolean);
        el.innerHTML = membres.length > 0 ? renderDetailGroupe(membres) : renderProduits(produits, state);
        if (membres.length > 0 && window.Chart) {
          const ref = membres[0];
          const lignes = [];
          if (ref.type === 'equity' && ref.strikeNum) {
            lignes.push({ valeur: ref.strikeNum, label: 'Strike', couleur: '#16304f' });
            if (ref.bAutoNum != null) {
              const v = (ref.bAutoNum / 100) * ref.strikeNum;
              if (Math.abs(v - ref.strikeNum) > ref.strikeNum * 0.005) lignes.push({ valeur: v, label: 'B. autocall', couleur: '#1d6f4c' });
            }
            const protCouleurs = ['#e8a030', '#b06a1a', '#7a3010'];
            membres.forEach((m, i) => {
              if (m.protection) {
                const pm = String(m.protection).match(/-(\d+)/);
                if (pm) lignes.push({ valeur: m.strikeNum * (1 - parseInt(pm[1], 10) / 100), label: 'Prot. ' + pm[1] + ' %', couleur: protCouleurs[i] || '#b06a1a' });
              }
            });
          }
          Chart.ouvrirInline('detail-chart-inline', chartTickerPour(ref), ref.nom, {
            lignes, sous: ref.sjLabel || ref.sj,
          });
        }
        break;
      }
    }
    el.scrollTop = saved;
    renderNav();
    mettreAJourBadgeSource();
    if (state.page === 'dash') majCartesMarche();
  }

  async function chargerActus() {
    const el = document.getElementById('news-section');
    if (!el) return;
    try {
      const news = await AppAPI.chargerNews();
      const html = renderNewsSection(news);
      if (document.getElementById('news-section')) {
        document.getElementById('news-section').innerHTML = html;
        document.getElementById('news-section').className = '';
      }
    } catch {
      if (document.getElementById('news-section')) {
        document.getElementById('news-section').innerHTML = '<p class="news-empty">Actualités indisponibles (back local requis).</p>';
        document.getElementById('news-section').className = '';
      }
    }
  }

  // Met à jour les cartes Actifs (Brent, Or, Bitcoin) avec le dernier cours. La garde évite
  // les mises à jour concurrentes (chiffres qui s'affolent) ; les valeurs live sont écrites
  // dans MACRO pour qu'un re-rendu ne repasse pas aux valeurs statiques.
  let majMarcheEnCours = false;
  async function majCartesMarche() {
    if (typeof AppAPI === 'undefined' || !AppAPI.historyUrl || majMarcheEnCours) return;
    majMarcheEnCours = true;
    try {
      for (const card of document.querySelectorAll('[data-macro]')) {
        const gid = card.getAttribute('data-macro');
        if (!gid || gid.indexOf('fred:') === 0 || gid.indexOf('hicp:') === 0) continue;
        try {
          const r = await fetch(AppAPI.historyUrl(gid, '1j'), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
          if (!r.ok) continue;
          const pts = (await r.json()).points || [];
          if (pts.length < 2) continue;
          const last = pts[pts.length - 1].c, first = pts[0].c;
          const nomActif = card.querySelector('.index-name')?.textContent || '';
          const valStr = last.toLocaleString('fr-FR', { maximumFractionDigits: last >= 100 ? 0 : 2 }) + ' $';
          const valEl = card.querySelector('[data-macro-val]');
          const varEl = card.querySelector('[data-macro-var]');
          if (valEl) valEl.textContent = valStr;
          let varStr = null, up = null;
          if (first) {
            const pct = (last - first) / first * 100; up = pct >= 0;
            varStr = (up ? '+' : '') + pct.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
            // Or & Bitcoin : hausse = vert. Brent : inversé (hausse = rouge).
            const favorable = /Brent/i.test(nomActif) ? !up : up;
            if (varEl) { varEl.textContent = varStr; varEl.className = 'index-var tnum ' + (favorable ? 'up' : 'down'); }
          }
          // Persiste dans MACRO (direction brute dans hausse ; la couleur est calculée au rendu).
          if (typeof MACRO !== 'undefined') {
            const m = MACRO.find(x => graphIdPour(x.nom) === gid);
            if (m) { m.valeur = valStr; if (varStr != null) { m.var = varStr; m.hausse = up; } }
          }
        } catch (_) { /* on garde la valeur affichée */ }
      }
      sauvegarderEtat();
    } finally {
      majMarcheEnCours = false;
    }
  }

  // Récupère la valeur courante du CMS 10 ans (vrai swap EUR 10y via FT, proxifié par le
  // Worker) et l'applique au tableau de bord et aux produits CMS. Repli sur la saisie manuelle.
  async function majCMS() {
    if (typeof AppAPI === 'undefined' || !AppAPI.cmsUrl) return;
    try {
      const r = await fetch(AppAPI.cmsUrl(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!r.ok) return;
      const d = await r.json();
      if (d.valeur == null) return;
      const valStr = d.valeur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
      const t = (donnees.taux || []).find(x => /CMS/.test(x.nom));
      if (t) {
        // Variation en pb comme les autres taux ; hausse = true → rouge, baisse → vert.
        const dp = d.deltaPb;
        t.valeur = valStr;
        t.var = dp == null ? '' : (dp > 0 ? '+' : '') + dp + ' pb';
        t.hausse = dp == null || dp === 0 ? null : dp > 0;
        t.manuel = false; t.dateMaj = null;
      }
      (donnees.produits || []).forEach(p => { if (p.type === 'cms') p.niveau = valStr; });
      renderPage();
    } catch (_) { /* on garde la valeur saisie */ }
  }

  function mettreAJourBadgeSource() {
    const badge = document.getElementById('source-badge');
    if (!badge) return;
    if (donnees.source === 'api' || donnees.source === 'snapshot') {
      badge.textContent = '● Données en ligne';
      badge.className = 'source-badge live';
    } else {
      badge.textContent = '○ Données statiques';
      badge.className = 'source-badge offline';
    }
  }

  function fermerFormulaire() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  function initPullToRefresh() {
    const content = document.getElementById('content');
    const main    = document.getElementById('main');
    const THRESHOLD = 65;
    let startY = 0, pulling = false, refreshing = false;

    const ind = document.createElement('div');
    ind.id = 'ptr-indicator';
    ind.innerHTML = '<span>↻</span>';
    main.prepend(ind);

    content.addEventListener('touchstart', e => {
      if (content.scrollTop === 0 && !refreshing) {
        startY  = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    content.addEventListener('touchmove', e => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) {
        ind.style.height = Math.min(dy * 0.5, 52) + 'px';
        ind.querySelector('span').style.transform =
          `rotate(${Math.min(dy / THRESHOLD, 1) * 180}deg)`;
      } else {
        pulling = false;
        ind.style.height = '';
      }
    }, { passive: true });

    async function doRefresh() {
      if (refreshing) return;
      refreshing = true;
      ind.style.transition = 'height .15s';
      ind.style.height = '52px';
      ind.classList.add('refreshing');
      donnees = await AppAPI.chargerDonnees();
      sauvegarderEtat();
      renderPage();
      majCMS();
      ind.classList.remove('refreshing');
      ind.style.height = '0';
      setTimeout(() => { ind.style.transition = ''; refreshing = false; }, 200);
    }

    content.addEventListener('touchend', e => {
      if (!pulling) return;
      pulling = false;
      ind.querySelector('span').style.transform = '';
      const dy = e.changedTouches[0].clientY - startY;
      if (dy >= THRESHOLD) {
        doRefresh();
      } else {
        ind.style.transition = 'height .2s';
        ind.style.height = '0';
        setTimeout(() => { ind.style.transition = ''; }, 220);
      }
    });

    content.addEventListener('touchcancel', () => {
      pulling = false;
      ind.style.height = '';
      ind.querySelector('span').style.transform = '';
    });
  }

  async function init() {
    restaurerEtat();
    renderPage();
    initPullToRefresh();
    donnees = await AppAPI.chargerDonnees();
    if (donnees.source !== 'api') {
      // Back indisponible : réappliquer le taux CMS saisi manuellement s'il existe.
      try {
        const raw = localStorage.getItem(CMS_OVERRIDE_KEY);
        if (raw) { const v = parseFloat(raw); if (!isNaN(v) && v > 0) appliquerCMSInterne(v); }
      } catch {}
    } else {
      // Back disponible : il est la source de vérité, l'override local est obsolète.
      try { localStorage.removeItem(CMS_OVERRIDE_KEY); } catch {}
    }
    sauvegarderEtat();
    renderPage();
    majCMS();
  }

  return {
    toggleSidebar() {
      const sidebar  = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      const isOpen   = sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open', isOpen);
      const ham = document.querySelector('.btn-hamburger');
      if (ham) ham.textContent = isOpen ? '✕' : '☰';
    },
    goto(page) {
      state = { ...state, page, q: '', detailIsin: null };
      sauvegarderEtat();
      fermerFormulaire();
      // Ferme la sidebar sur mobile après navigation
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('open');
      const ham = document.querySelector('.btn-hamburger');
      if (ham) ham.textContent = '☰';
      renderPage();
    },
    setFilter(filter) {
      state = { ...state, filter: state.filter === filter ? 'tous' : filter };
      renderPage(true);
    },
    setCat(cat) {
      state = { ...state, cat: state.cat === cat ? null : cat };
      renderPage(true);
    },
    setUcCat(cat) {
      state = { ...state, ucCat: state.ucCat === cat ? null : cat };
      sauvegarderEtat();
      renderPage(true);
    },
    prodSearch(q) {
      state = { ...state, q };
      const el = document.getElementById('content');
      el.innerHTML = renderProduits(donnees.produits, state);
      const input = document.getElementById('prod-search');
      if (input) { input.focus(); input.setSelectionRange(q.length, q.length); }
      renderNav();
    },
    voirDetail(isin) {
      state = { ...state, page: 'detail', detailIsin: isin };
      renderPage();
    },
    voirDetailGroupe(isinsStr) {
      state = { ...state, page: 'detail-groupe', detailIsins: isinsStr.split(','), detailIsin: null };
      renderPage();
    },
    fermerDetail() {
      state = { ...state, page: 'prod', detailIsin: null };
      renderPage();
    },
    async supprimerProduit(id) {
      if (!confirm('Supprimer ce produit définitivement ?')) return;
      try {
        await AppAPI.supprimerProduit(id);
        donnees = await AppAPI.chargerDonnees();
        state = { ...state, page: 'prod', detailIsin: null };
        renderPage();
      } catch (err) {
        alert('Erreur : ' + (err.message || 'serveur indisponible'));
      }
    },
    ouvrirFormulaire() {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = renderFormulaireAjout();
    },
    fermerFormulaire,
    ouvrirGraphique(id, label, sous) {
      if (window.Chart) Chart.ouvrir(id, label, { sous: sous || '' });
    },
    ouvrirGraphiqueUC(isin) {
      if (!window.Chart) return;
      const u = (typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : []).find(x => x.isin === isin);
      if (u && u.graphId) Chart.ouvrir(u.graphId, u.nom, { sous: u.categorie, compoIsin: u.isin });
    },
    ouvrirCategorie(cat) {
      const membres = donnees.produits.filter(p => categorieProduit(p) === cat);
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = renderModalCategorie(cat, membres);
    },
    fermerModal() {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    },
    ouvrirGraphiqueProduit(isin) {
      if (!window.Chart) return;
      const p = donnees.produits.find(x => x.isin === isin);
      if (!p) return;
      const lignes = lignesPour(p);
      const cat = categorieProduit(p);
      Chart.ouvrir(chartTickerPour(p), p.nom, {
        lignes, sous: p.sjLabel || p.sj, retour: () => App.ouvrirCategorie(cat),
      });
    },
    appliquerCMSLocal(valeur) { appliquerCMSInterne(valeur); },
    toggleStrikeField(type) {
      const f = document.getElementById('field-strike');
      if (f) f.classList.toggle('disabled-field', type === 'cms');
    },
    async soumettreFormulaire(e) {
      e.preventDefault();
      const form = e.target;
      const submitBtn = document.getElementById('form-submit');
      const errEl    = document.getElementById('form-error');

      const data = {
        isin:             form.isin.value.trim().toUpperCase(),
        nom:              form.nom.value.trim(),
        sousJacent:       form.sousJacent.value.trim(),
        sousJacentLabel:  form.sousJacentLabel.value.trim(),
        typeProduit:      form.typeProduit.value,
        coupon:           parseFloat(form.coupon.value),
        strike:           form.strike.value ? parseFloat(form.strike.value) : null,
        barriereAutocall: parseFloat(form.barriereAutocall.value),
        barriereCoupon:   form.barriereCoupon.value ? parseFloat(form.barriereCoupon.value) : null,
        constat:          form.constat.value.trim(),
        echeance:         form.echeance.value,
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enregistrement…';
      errEl.style.display = 'none';

      try {
        await AppAPI.ajouterProduit(data);
        donnees = await AppAPI.chargerDonnees();
        fermerFormulaire();
        state = { ...state, page: 'prod' };
        renderPage();
      } catch (err) {
        errEl.textContent = 'Erreur : ' + (err.message || 'impossible de contacter le serveur');
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enregistrer le produit';
      }
    },
    init,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());

// Service worker désactivé (évite les pages blanches dues à un cache figé).
// On nettoie toute inscription et tout cache existants ; on ne réenregistre rien.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}
