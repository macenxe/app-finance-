const App = (() => {
  let state   = { page: 'dash', familleFiltre: 'tous', detailIsin: null };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS), taux: TAUX };
  let ucPerfsCache = {};
  let ucPerfsFetching = false;

  const CACHE_KEY       = 'app-cache-v3';
  const CMS_OVERRIDE_KEY = 'cms-taux-override';
  const CMS_LIVE_KEY = 'cms-live-v1';
  // Dernière valeur live connue du CMS (FT), mémorisée pour éviter le saut de valeur au
  // rafraîchissement : chargerDonnees renvoie une valeur snapshot qu'on remplace aussitôt.
  let dernierCMS = null;

  // Source unique : applique une valeur numérique de CMS au tableau de bord ET recalcule
  // tous les indicateurs des produits CMS (niveau, zone autocall, coupon, statut). Sert la
  // valeur live (FT) comme la saisie manuelle, pour ne jamais laisser des pastilles calculées
  // sur une ancienne valeur pendant que le niveau affiché, lui, a changé.
  function appliquerCMS(valeurNum, meta) {
    if (valeurNum == null || isNaN(valeurNum)) return;
    meta = meta || {};
    const valeur = valeurNum.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
    const t = (donnees.taux || []).find(x => /CMS/.test(x.nom));
    if (t) { t.valeur = valeur; t.var = meta.var ?? ''; t.hausse = meta.hausse ?? null; t.manuel = false; t.dateMaj = meta.dateMaj ?? null; }
    const statuts = { green: 'Zone Rappel', orange: 'Zone Coupon', red: 'Risque' };
    (donnees.produits || []).forEach(p => {
      if (p.type !== 'cms') return;
      p.niveauNum = valeurNum;
      p.niveau = valeur;
      p.zoneAutocall = p.bAutoNum != null ? (valeurNum <= p.bAutoNum ? 'OUI' : 'NON') : p.zoneAutocall;
      p.couponAtteint = p.bCouponNum != null ? valeurNum <= p.bCouponNum : false;
      p.k = p.zoneAutocall === 'OUI' ? 'green' : 'orange';
      p.statut = statuts[p.k];
    });
  }

  function appliquerCMSLive() {
    if (!dernierCMS) return;
    const num = dernierCMS.valeurNum != null ? dernierCMS.valeurNum : parseFloat(String(dernierCMS.valeur).replace(',', '.'));
    appliquerCMS(num, { var: dernierCMS.var, hausse: dernierCMS.hausse, dateMaj: dernierCMS.dateMaj || null });
  }

  function appliquerCMSInterne(valeur) {
    appliquerCMS(valeur, { dateMaj: new Date().toISOString().slice(0, 10) });
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
        page: state.page,
        ucCat: state.ucCat || null,
        feOuvert: !!state.feOuvert,
        indices: donnees.indices,
        taux: donnees.taux,
        produits: donnees.produits,
        rappeles: donnees.rappeles || [],
        macro: (typeof MACRO !== 'undefined') ? MACRO.map(m => ({ nom: m.nom, valeur: m.valeur, var: m.var, hausse: m.hausse })) : null,
      }));
    } catch {}
  }

  function restaurerEtat() {
    // sessionStorage survit au F5 mais est effacé à la fermeture de l'onglet.
    // Si absent → ouverture fraîche → on reste sur le tableau de bord.
    const estRafraichissement = !!sessionStorage.getItem('session_active');
    sessionStorage.setItem('session_active', '1');
    try { const rc = localStorage.getItem(CMS_LIVE_KEY); if (rc) dernierCMS = JSON.parse(rc); } catch {}
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.page && estRafraichissement) state = { ...state, page: c.page, ucCat: c.ucCat || null, feOuvert: !!c.feOuvert };
        if (c.indices) donnees = { ...donnees, indices: c.indices, taux: c.taux || donnees.taux, produits: c.produits || donnees.produits };
        donnees.rappeles = c.rappeles || [];
        // Réapplique les dernières valeurs live des Actifs pour éviter le retour aux valeurs statiques au 1er rendu.
        if (c.macro && typeof MACRO !== 'undefined') {
          c.macro.forEach(s => { const m = MACRO.find(x => x.nom === s.nom); if (m) { m.valeur = s.valeur; m.var = s.var; m.hausse = s.hausse; } });
        }
      }
    } catch {}
    appliquerCMSLive();
  }

  async function chargerPerfsUC() {
    if (ucPerfsFetching || typeof AppAPI === 'undefined' || !AppAPI.historyUrl) return;
    if (typeof UC_CATALOGUE === 'undefined') return;
    ucPerfsFetching = true;
    await Promise.allSettled(
      UC_CATALOGUE.filter(u => u.graphId).map(async u => {
        try {
          const url = AppAPI.historyUrl(u.graphId, 'ytd');
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

  const NAV_ICONS = {
    dash:     '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    prod:     '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
    contrats: '<polygon points="12,4 20,9 12,14 4,9"/><polyline points="4,14 12,19 20,14"/>',
    actus:    '<rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
  };
  const NAV = [
    { key: 'dash',     label: 'Tableau de bord',       court: 'Accueil'  },
    { key: 'prod',     label: 'Autocalls',              court: 'Autocall' },
    { key: 'contrats', label: 'Fonds € et UC',          court: 'Fonds'    },
    { key: 'actus',    label: 'Actualités économiques', court: 'Actus'    },
  ];

  function renderNav() {
    const activeKey = state.page;
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.innerHTML = NAV.map(item => `
        <button class="bottom-nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[item.key]}</svg>
          <span>${item.court}</span>
        </button>`).join('');
    }
  }

  function renderPage(keepScroll = false) {
    const el = document.getElementById('content');
    const saved = keepScroll ? el.scrollTop : 0;
    const { indices, produits } = donnees;
    switch (state.page) {
      case 'dash':     el.innerHTML = renderDashboard(indices, produits, donnees.taux); break;
      case 'prod':     el.innerHTML = renderProduits(produits, state, donnees.rappeles);  break;
      case 'actus':    el.innerHTML = renderActus(); chargerActus(); break;
      case 'contrats':
        el.innerHTML = renderContrats(state, ucPerfsCache);
        if (!ucPerfsFetching && Object.keys(ucPerfsCache).length === 0) chargerPerfsUC();
        break;
    }
    el.scrollTop = saved;
    renderNav();
    if (state.page === 'dash') { majCartesMarche(); }
  }

  // Fiches détail Autocall : présentées en feuille modale (bottom sheet) plutôt qu'en page,
  // pour rester dans le contexte de la liste (fermeture par clic en dehors de la feuille).
  function ouvrirSheet(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = html;
    const backdrop = root.querySelector('.sheet-backdrop');
    if (!backdrop) return;
    void backdrop.offsetWidth; // force le reflow pour déclencher la transition d'ouverture
    backdrop.classList.add('sheet-open');
    const panel = backdrop.querySelector('.sheet-panel');
    if (panel && typeof initSheetDrag === 'function') initSheetDrag(panel, fermerSheet);
  }

  function fermerSheet() {
    const root = document.getElementById('modal-root');
    const backdrop = root.querySelector('.sheet-backdrop');
    if (!backdrop) { root.innerHTML = ''; return; }
    backdrop.classList.remove('sheet-open');
    setTimeout(() => { root.innerHTML = ''; }, 300);
  }

  async function chargerActus() {
    const el = document.getElementById('news-section');
    if (!el) return;
    const CACHE_KEY = 'news_cache_v1';
    // Affiche immédiatement le cache si disponible
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const news = JSON.parse(cached);
        if (document.getElementById('news-section')) {
          document.getElementById('news-section').innerHTML = renderNewsSection(news);
          document.getElementById('news-section').className = '';
        }
      }
    } catch {}
    // Puis actualise en arrière-plan
    try {
      const news = await AppAPI.chargerNews();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(news)); } catch {}
      if (document.getElementById('news-section')) {
        document.getElementById('news-section').innerHTML = renderNewsSection(news);
        document.getElementById('news-section').className = '';
      }
    } catch {
      if (!localStorage.getItem(CACHE_KEY) && document.getElementById('news-section')) {
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
  let majCMSEnCours = false;
  async function majCMS() {
    if (typeof AppAPI === 'undefined' || !AppAPI.cmsUrl || majCMSEnCours) return;
    majCMSEnCours = true;
    try {
      const r = await fetch(AppAPI.cmsUrl(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!r.ok) return;
      const d = await r.json();
      if (d.valeur == null) return;
      // Variation en pb comme les autres taux ; hausse = true → rouge, baisse → vert.
      const dp = d.deltaPb;
      const nouveau = {
        valeurNum: d.valeur,
        var: dp == null ? '' : (dp > 0 ? '+' : '') + dp + ' pb',
        hausse: dp == null || dp === 0 ? null : dp > 0,
        dateMaj: d.date || null,
      };
      // Ne re-rend que si la valeur a changé, et sans réinitialiser le scroll ni le graphique
      // de la fiche en cours (renderPage(true)) : évite le saut en haut de page après ~1-8 s.
      const inchange = dernierCMS && dernierCMS.valeurNum === nouveau.valeurNum && dernierCMS.var === nouveau.var;
      dernierCMS = nouveau;
      try { localStorage.setItem(CMS_LIVE_KEY, JSON.stringify(dernierCMS)); } catch {}
      appliquerCMSLive();
      if (!inchange) renderPage(true);
    } catch (_) { /* on garde la valeur saisie */ } finally { majCMSEnCours = false; }
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
      appliquerCMSLive();
      sauvegarderEtat();
      renderPage();
      if (typeof Autocall !== 'undefined') {
        Autocall.appliquer(donnees.produits).then(({ actifs, rappeles }) => {
          donnees.produits = actifs;
          donnees.rappeles = rappeles;
          appliquerCMSLive();
          sauvegarderEtat();
          renderPage(true);
        }).catch(() => {});
      }
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

  // Navigue vers un onglet (utilisé par la nav cliquée comme par le swipe).
  function allerA(page) {
    state = { ...state, page, detailIsin: null };
    sauvegarderEtat();
    fermerFormulaire();
    renderPage();
  }

  // Comme allerA, mais avec un petit glissement + fondu dans le sens du swipe (direction : 1 =
  // onglet suivant, le contenu sort vers la gauche et le nouveau entre par la droite ; -1 =
  // l'inverse). Purement cosmétique : l'état et le rendu restent ceux d'allerA.
  let animationOngletEnCours = false;
  function allerAAnime(page, direction) {
    const content = document.getElementById('content');
    if (!content || animationOngletEnCours) { allerA(page); return; }
    animationOngletEnCours = true;
    const decalage = direction > 0 ? 22 : -22;
    content.style.transition = 'transform .15s ease, opacity .15s ease';
    content.style.transform = `translateX(${-decalage}px)`;
    content.style.opacity = '0';
    setTimeout(() => {
      allerA(page);
      content.style.transition = 'none';
      content.style.transform = `translateX(${decalage}px)`;
      content.style.opacity = '0';
      void content.offsetWidth; // force le reflow avant de réactiver la transition
      content.style.transition = 'transform .2s ease, opacity .2s ease';
      content.style.transform = 'translateX(0)';
      content.style.opacity = '1';
      setTimeout(() => {
        content.style.transition = '';
        content.style.transform = '';
        content.style.opacity = '';
        animationOngletEnCours = false;
      }, 210);
    }, 150);
  }

  // Swipe gauche/droite sur le contenu = onglet suivant/précédent (Accueil ↔ Autocall ↔ Fonds
  // ↔ Actus, dans l'ordre de NAV). Ignoré si le geste est plus vertical qu'horizontal (scroll),
  // ou s'il démarre dans une zone qui défile elle-même horizontalement.
  function initSwipeTabs() {
    const content = document.getElementById('content');
    if (!content) return;
    const SEUIL_X = 60, RATIO_MIN = 1.4;
    let startX = 0, startY = 0, tracking = false;

    function scrolleHorizontalement(el) {
      while (el && el !== content) {
        if (el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true;
        el = el.parentElement;
      }
      return false;
    }

    content.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || scrolleHorizontalement(e.target)) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    content.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < SEUIL_X || Math.abs(dx) < Math.abs(dy) * RATIO_MIN) return;
      const idx = NAV.findIndex(n => n.key === state.page);
      if (idx === -1) return;
      const direction = dx < 0 ? 1 : -1;
      const suivant = idx + direction;
      if (suivant < 0 || suivant >= NAV.length) return;
      allerAAnime(NAV[suivant].key, direction);
    }, { passive: true });
  }

  async function init() {
    restaurerEtat();
    renderPage();
    initPullToRefresh();
    initSwipeTabs();
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
    // Réapplique le dernier CMS live (FT) sur les données fraîches, avant le rendu.
    appliquerCMSLive();
    sauvegarderEtat();
    renderPage();
    // Rappel automatique (asynchrone, non bloquant) : masque les produits rappelés.
    if (typeof Autocall !== 'undefined') {
      Autocall.appliquer(donnees.produits).then(({ actifs, rappeles }) => {
        donnees.produits = actifs;
        donnees.rappeles = rappeles;
        appliquerCMSLive();
        sauvegarderEtat();
        renderPage(true);
      }).catch(() => {});
    }
    majCMS();
  }

  return {
    goto(page) { allerA(page); },
    setFamilleFiltre(tab) {
      state = { ...state, familleFiltre: tab };
      renderPage(true);
    },
    setUcCat(cat) {
      state = { ...state, ucCat: state.ucCat === cat ? null : cat };
      sauvegarderEtat();
      renderPage(true);
    },
    toggleFondsEuros() {
      state = { ...state, feOuvert: !state.feOuvert };
      sauvegarderEtat();
      renderPage(true);
    },
    voirDetail(isin) {
      const p = donnees.produits.find(x => x.isin === isin);
      if (!p) return;
      state = { ...state, detailIsin: isin, detailIsins: null };
      ouvrirSheet(renderDetail(p));
      if (window.Chart) {
        Chart.ouvrirInline('detail-chart-inline', chartTickerPour(p), p.nom, {
          lignes: lignesPour(p), sous: p.sjLabel || p.sj,
        });
      }
    },
    voirDetailGroupe(isinsStr) {
      const isins = isinsStr.split(',');
      const membres = isins.map(isin => donnees.produits.find(p => p.isin === isin)).filter(Boolean);
      if (membres.length === 0) return;
      state = { ...state, detailIsins: isins, detailIsin: null };
      ouvrirSheet(renderDetailGroupe(membres));
      if (window.Chart) {
        const ref = membres[0];
        const lignes = [];
        if (ref.type === 'equity' && ref.strikeNum) {
          lignes.push({ valeur: ref.strikeNum, label: 'Strike', couleur: '#16304f' });
          if (ref.bAutoNum != null) {
            const v = (ref.bAutoNum / 100) * ref.strikeNum;
            if (Math.abs(v - ref.strikeNum) > ref.strikeNum * 0.005) lignes.push({ valeur: v, label: 'B. autocall', couleur: '#1d6f4c' });
          }
          // Synthèse : une seule ligne, celle du palier le moins protecteur (risque de perte le
          // plus proche). Le détail des 3 paliers est déjà donné dans la case « Protection » au-dessus.
          const pires = membres.reduce((min, m) => {
            const pm = String(m.protection || '').match(/-(\d+)/);
            const val = pm ? parseInt(pm[1], 10) : null;
            return val != null && (min == null || val < min) ? val : min;
          }, null);
          if (pires != null) {
            lignes.push({ valeur: ref.strikeNum * (1 - pires / 100), label: 'Protection −' + pires + ' %', couleur: '#b06a1a' });
          }
        }
        Chart.ouvrirInline('detail-chart-inline', chartTickerPour(ref), ref.nom, {
          lignes, sous: ref.sjLabel || ref.sj,
        });
      }
    },
    fermerDetail() {
      fermerSheet();
      state = { ...state, detailIsin: null, detailIsins: null };
    },
    fermerFormulaire,
    ouvrirGraphique(id, label, sous) {
      if (window.Chart) Chart.ouvrir(id, label, { sous: sous || '' });
    },
    ouvrirGraphiqueUC(isin) {
      if (!window.Chart) return;
      const u = (typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : []).find(x => x.isin === isin);
      if (u && u.graphId) Chart.ouvrir(u.graphId, u.nom, { sous: u.categorie, compoIsin: u.isin, sheet: true });
    },
    fermerModal() {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
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
