const App = (() => {
  let state   = { page: 'dash', familleFiltre: 'tous', detailIsin: null };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS), taux: TAUX };
  let ucPerfsCache = {};
  let ucPerfsFetching = false;
  let ucSecteursCache = {};
  let ucSecteursCharge = false;
  let ucMetaCache = {};
  let ucMetaGenere = null;
  let ucMetaCharge = false;

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
    (donnees.produits || []).forEach(p => {
      if (p.type !== 'cms') return;
      p.niveauNum = valeurNum;
      p.niveau = valeur;
      p.zoneAutocall = p.bAutoNum != null ? (valeurNum <= p.bAutoNum ? 'OUI' : 'NON') : p.zoneAutocall;
      p.couponAtteint = p.bCouponNum != null ? valeurNum <= p.bCouponNum : false;
      p.k = p.zoneAutocall === 'OUI' ? 'green' : 'orange';
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
        ucSel: state.ucSel || null,
        ucTri: state.ucTri || null,
        acTri: state.acTri || null,
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
        if (c.page && estRafraichissement) state = { ...state, page: c.page, ucCat: c.ucCat || null, ucSel: c.ucSel || null, feOuvert: !!c.feOuvert };
        // Le tri choisi survit au rafraîchissement, comme le filtre de catégorie (même écran,
        // même attente) — y compris à une ouverture fraîche, où il n'y a rien à « remettre à zéro ».
        if (c.ucTri && c.ucTri.cle) state = { ...state, ucTri: c.ucTri };
        if (c.acTri && c.acTri.cle) state = { ...state, acTri: c.acTri };
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

  // Perfs des UC : deux séries par fonds, dont on tire les colonnes du tableau.
  //  · '1a' est QUOTIDIENNE → performance de l'année en cours et 1 an glissant, à la clôture
  //    de la veille et cohérentes avec le graphique de la fiche.
  //  · '5a' est HEBDOMADAIRE (Yahoo ne sert pas de quotidien au-delà d'un an, cf. PERIODES dans
  //    worker/src/index.js) → 3 ans et 5 ans glissants, arrêtés au dernier jeudi.
  // La performance de l'année précédente ne vient PAS d'ici : c'est la performance calendaire
  // officielle du fichier fonds-meta.json (chargerMetaUC), exacte au 31 décembre.
  async function chargerPerfsUC() {
    if (ucPerfsFetching || typeof AppAPI === 'undefined' || !AppAPI.historyUrl) return;
    if (typeof UC_CATALOGUE === 'undefined') return;
    ucPerfsFetching = true;
    const debutAnnee = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    const debut3a = Math.floor(Date.now() / 1000) - 3 * 365 * 86400;
    const variation = (a, b) => (a > 0 ? (b - a) / a * 100 : null);
    const bornes = pts => (pts.length > 1 ? variation(pts[0].c, pts[pts.length - 1].c) : null);
    const serie = async (gid, periode) => {
      const r = await fetch(AppAPI.historyUrl(gid, periode), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!r.ok) return { points: [], devise: null };
      const d = await r.json();
      return { points: d.points || [], devise: d.devise || null };
    };
    await Promise.allSettled(
      UC_CATALOGUE.filter(u => u.graphId).map(async u => {
        try {
          const [rJour, rSemaine] = await Promise.all([serie(u.graphId, '1a'), serie(u.graphId, '5a')]);
          const jour = rJour.points, semaine = rSemaine.points;
          if (jour.length < 2 && semaine.length < 2) return;
          const dernier = jour[jour.length - 1] || semaine[semaine.length - 1];
          ucPerfsCache[u.isin] = {
            ytd: bornes(jour.filter(p => p.t >= debutAnnee)),
            an:  bornes(jour),
            a3:  bornes(semaine.filter(p => p.t >= debut3a)),
            a5:  bornes(semaine),
            // Dernière VALEUR LIQUIDATIVE connue du fonds (montant + date de valorisation par la
            // société de gestion, pas date de rafraîchissement du site) : colonne « VL du ».
            // Les VL sont publiées avec un jour ouvré de décalage, d'où une date antérieure à
            // celle des indices boursiers — et souvent identique pour tous les fonds.
            t:   dernier ? dernier.t : null,
            vl:  dernier ? dernier.c : null,
            devise: rJour.devise || rSemaine.devise,
          };
        } catch { /* on ignore */ }
      })
    );
    ucPerfsFetching = false;
    if (state.page === 'contrats') renderPage(true);
  }

  // Fiche signalétique des fonds : note Morningstar, note de risque, société de gestion et
  // performances calendaires. Instantané statique régénéré par la CI (back/src/fonds-meta.ts) —
  // même origine, donc pas de CORS ni de cookie/crumb Yahoo à gérer dans le navigateur, et la
  // page reste utilisable si le fichier manque (colonnes à « — »).
  async function chargerMetaUC() {
    if (ucMetaCharge) return;
    ucMetaCharge = true;
    try {
      const r = await fetch('./data/fonds-meta.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const d = await r.json();
      ucMetaCache = d.fonds || {};
      ucMetaGenere = d.genere || null;
    } catch { /* on ignore : la liste s'affiche sans les notes */ }
    if (state.page === 'contrats') renderPage(true);
  }

  // Premier secteur de chaque UC, lu dans les compositions statiques déjà présentes
  // (front/data/uc-compo/<ISIN>.json, servies aussi à la fiche et au comparatif).
  // Seuil d'exposition : sous 10 % d'actions, la répartition sectorielle décrit une poche
  // résiduelle et afficherait des « Finance 100 % » trompeurs sur un fonds obligataire.
  // Une seule campagne par session (ucSecteursCharge) : ces fichiers ne bougent pas.
  const SECTEUR_EXPO_MIN = 10;
  async function chargerSecteursUC() {
    if (ucSecteursCharge || typeof UC_CATALOGUE === 'undefined') return;
    ucSecteursCharge = true;
    await Promise.allSettled(
      UC_CATALOGUE.map(async u => {
        try {
          const r = await fetch(`./data/uc-compo/${u.isin}.json`, { cache: 'force-cache' });
          if (!r.ok) return;
          const d = await r.json();
          const s = (d.secteurs || [])[0];
          const actions = (d.alloc && d.alloc.action) || 0;
          if (s && actions >= SECTEUR_EXPO_MIN) ucSecteursCache[u.isin] = { nom: s.nom, pct: s.pct };
        } catch { /* on ignore */ }
      })
    );
    if (state.page === 'contrats') renderPage(true);
  }

  const NAV_ICONS = {
    dash:     '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    prod:     '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
    contrats: '<polygon points="12,4 20,9 12,14 4,9"/><polyline points="4,14 12,19 20,14"/>',
    outils:   '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    actus:    '<rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
  };
  const NAV = [
    { key: 'dash',     label: 'Tableau de bord', court: 'Accueil',  def: 'Synthèse des marchés' },
    { key: 'prod',     label: 'Autocall',        court: 'Autocall', def: 'Produits à mécanisme de rappel automatique' },
    { key: 'contrats', label: 'Fonds € & UC',    court: 'Fonds',    def: 'Fonds en euros · Unités de compte · Le Conservateur' },
    { key: 'outils',   label: 'Outils',          court: 'Outils',   def: 'Aide-mémoire fiscal' },
    { key: 'actus',    label: 'Actualités',      court: 'Actus',    def: 'Sélection du cabinet · fil marché en direct' },
  ];

  function renderNav() {
    const activeKey = state.page;
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
    // Bandeau bleu fixe en haut (mobile) : titre + descriptif de la page courante — remplacent
    // .page-title/.page-sub masqués dans le contenu (voir style.css) pour éviter le doublon.
    // Le descriptif est lu directement dans le DOM (déjà rendu à ce stade par renderPage)
    // plutôt que recopié depuis NAV.def, pour garder les parties dynamiques (ex. l'heure de
    // cotation du tableau de bord).
    const mobileTitle = document.querySelector('.mobile-topbar-title');
    const mobileDesc = document.querySelector('.mobile-topbar-desc');
    if (mobileTitle) {
      const actif = NAV.find(item => item.key === activeKey) || NAV[0];
      mobileTitle.textContent = actif.label;
      const pageSub = document.querySelector('.page-header .page-sub');
      mobileDesc.textContent = pageSub ? pageSub.textContent : (actif ? actif.def : '');
    }
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.innerHTML = NAV.map(item => `
        <button class="bottom-nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[item.key]}</svg>
          <span>${item.court}</span>
        </button>`).join('');
    }
    // Onglets bureau (barre du haut, remplace la sidebar sur desktop) — le .page-title de
    // chaque page est masqué sur bureau (voir style.css) : l'onglet actif porte donc aussi
    // la description (ex-.page-sub) pour rester aussi parlant que l'ancien gros titre.
    const topNav = document.getElementById('top-nav');
    if (topNav) {
      topNav.innerHTML = NAV.map(item => {
        const active = activeKey === item.key;
        return `
        <div class="top-nav-item${active ? ' active' : ''}" onclick="App.goto('${item.key}')">
          <span class="top-nav-label">${item.label}</span>
          ${active ? `<span class="top-nav-desc">${item.def}</span>` : ''}
        </div>`;
      }).join('');
    }
    const dtDate = document.querySelector('.dt-date');
    if (dtDate && !dtDate.textContent) {
      dtDate.textContent = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  // Bureau : la fiche détail se déplie dans la liste. Mobile : feuille modale (inchangé).
  function estBureau() { return window.innerWidth >= 641; }

  // Euro Stoxx Banks est tracé via l'ETF BNKE.PA (bon historique) mais à une autre échelle que
  // l'indice (ETF ~381 vs indice ~303). Renvoie le niveau réel de l'indice pour rééchelonner le
  // graphe, ou null si le ticker n'est pas ce proxy. Repli sur le niveau du produit si besoin.
  function rebaseESBanks(ticker, niveauFallback) {
    if (ticker !== 'BNKE.PA') return null;
    const i = (donnees.indices || []).find(x => x.nom === 'Euro Stoxx Banks');
    const n = i ? parseFloat(String(i.valeur).replace(/[^0-9,.-]/g, '').replace(',', '.')) : NaN;
    return !isNaN(n) ? n : (niveauFallback != null ? niveauFallback : null);
  }

  // Hauteur du viewBox du tracé de la fiche Autocall. Le panneau du bureau est bien plus large
  // que haut : au gabarit commun (640×300) le tracé n'occupait qu'une bande de ~360px pour ~450px
  // disponibles. 374 comble cette hauteur et adoucit le rapport (2,13:1 → 1,71:1).
  // Le CSS plafonne la largeur d'après ce même rapport (.chart-zone, cf. le 456 de style.css) :
  // toute modification ici oblige à recalculer ce plafond. Mobile inchangé (feuille étroite).
  const VBH_FICHE = 374;

  function initChartDetail(p, containerId = 'detail-chart-inline') {
    if (!window.Chart) return;
    const ticker = chartTickerPour(p);
    Chart.ouvrirInline(containerId, ticker, p.nom, {
      lignes: lignesPour(p), sous: p.sjLabel || p.sj,
      rebase: rebaseESBanks(ticker, p.niveauNum),
      vbh: estBureau() ? VBH_FICHE : undefined,
    });
  }

  // Montage de la fiche Autocall en fenêtre (bureau) : surbrillance de la ligne + fenêtre + tracé.
  // La surbrillance est posée DANS LE DOM plutôt que par un renderPage : un re-rendu complet de la
  // liste pour une simple mise en avant remonterait son défilement (même choix que ouvrirFicheUC).
  // La fiche vit dans #modal-root, que renderPage ne touche pas — son graphique survit donc à un
  // changement de filtre ou de tri.
  function ouvrirFicheAutocall(produit, membres) {
    const root = document.getElementById('modal-root');
    if (!root) return;
    document.querySelectorAll('.ac-card--actif').forEach(e => e.classList.remove('ac-card--actif'));
    const sel = membres
      ? document.querySelector(`.ac-card[data-isins="${membres.map(m => m.isin).join(',')}"]`)
      : document.querySelector(`.ac-card[data-isin="${produit.isin}"]`);
    if (sel) sel.classList.add('ac-card--actif');
    root.innerHTML = membres ? renderDetailModalGroupe(membres) : renderDetailModal(produit);
    if (membres) initChartDetailGroupe(membres); else initChartDetail(produit);
  }

  // Carte « Comparateur » du tableau de bord — alimentée en cliquant directement sur une carte
  // Indices/Actions/Actifs/Taux (App.clicActif → App.toggleSerieCmp), plus de sélecteur séparé.
  // Catalogue = tout ce qui a un graphique sur le tableau de bord (indices, sous-jacents actions,
  // actifs, taux) : sert à retrouver le libellé d'un ticker présent dans state.cmpSeries.
  // Clé = ticker (identité stable), dédoublonné : un sous-jacent qui recoupe un indice déjà
  // listé (ex. ES Banks / Euro Stoxx Banks, même ticker BNKE.PA) n'apparaît qu'une fois.
  const CMP_TICKERS_DEFAUT = ['^FCHI'];
  function catalogueComparaison() {
    const out = new Map();
    (donnees.indices || []).forEach(i => {
      const t = (typeof graphIdPour === 'function' ? graphIdPour(i.nom) : null) || i.ticker;
      if (t && !out.has(t)) out.set(t, { ticker: t, label: i.nom });
    });
    sousJacentsUniques(donnees.produits).forEach(s => {
      if (!out.has(s.ticker)) out.set(s.ticker, { ticker: s.ticker, label: s.label });
    });
    if (typeof MACRO !== 'undefined') MACRO.forEach(m => {
      const t = graphIdPour(m.nom);
      if (t && !out.has(t)) out.set(t, { ticker: t, label: m.nom });
    });
    [...(donnees.taux || []), { nom: 'Inflation zone €' }].forEach(x => {
      const t = graphIdPour(x.nom);
      if (t && !out.has(t)) out.set(t, { ticker: t, label: x.nom });
    });
    return out;
  }

  function initComparaisonIndices() {
    if (state.page !== 'dash' || !window.Chart) return;
    if (!document.getElementById('cmp-indices')) return;
    const catalogue = catalogueComparaison();
    if (!state.cmpSeries) state = { ...state, cmpSeries: CMP_TICKERS_DEFAUT.filter(t => catalogue.has(t)) };
    // Reflète la sélection sur les cartes elles-mêmes (pas de re-rendu complet de la page ici) :
    // même mécanisme que majCartesMarche ([data-macro]) pour les mises à jour ciblées du DOM.
    document.querySelectorAll('[data-cmp-ticker]').forEach(el => {
      el.classList.toggle('index-card--actif', state.cmpSeries.includes(el.getAttribute('data-cmp-ticker')));
    });
    const series = state.cmpSeries.map(t => catalogue.get(t)).filter(Boolean);
    // Bureau : graphique plus bas que le gabarit commun (-32 %) — la page dashboard aligne
    // beaucoup de cartes et c'est ce comparateur qui fixait la hauteur totale, donc le
    // défilement résiduel sur les écrans 768px de haut (mesuré : 205 ramène 1366×768 à 0px).
    // Mobile : la carte est bien plus étroite (~350px) et le viewBox 640 de large est mis à
    // l'échelle par la largeur — avec 205 la courbe ne ferait que ~110px de haut. On garde donc
    // le gabarit commun (300 → ~165px de tracé), la page défile de toute façon.
    if (series.length) Chart.comparer('cmp-indices', series, { vbh: estBureau() ? 205 : 300 });
    else {
      const zone = document.getElementById('cmp-indices');
      if (zone) zone.innerHTML = '<div class="chart-loading">Sélectionnez un actif ci-dessus pour afficher son graphique.</div>';
    }
  }

  function initChartDetailGroupe(membres, containerId = 'detail-chart-inline') {
    if (!window.Chart) return;
    const ref = membres[0];
    const lignes = [];
    if (ref.type === 'equity' && ref.strikeNum) {
      lignes.push({ valeur: ref.strikeNum, label: 'Strike', couleur: '#16304f' });
      if (ref.bAutoNum != null) {
        const v = (ref.bAutoNum / 100) * ref.strikeNum;
        if (Math.abs(v - ref.strikeNum) > ref.strikeNum * 0.005) lignes.push({ valeur: v, label: 'B. autocall', couleur: '#1d6f4c' });
      }
      // Les TROIS paliers de protection du groupe (−40, −50, −60 %), et non plus le seul palier
      // le moins protecteur : c'est ce qui distingue les produits regroupés sur la ligne, et la
      // fiche est le seul endroit où on peut les situer sur le cours.
      const paliers = [...new Set(membres.map(m => {
        const pm = String(m.protection || '').match(/-(\d+)/);
        return pm ? parseInt(pm[1], 10) : null;
      }).filter(v => v != null))].sort((a, b) => a - b);
      paliers.forEach(pct => {
        lignes.push({ valeur: ref.strikeNum * (1 - pct / 100), label: 'Protection −' + pct + ' %', couleur: '#b06a1a' });
      });
    }
    const tickerRef = chartTickerPour(ref);
    Chart.ouvrirInline(containerId, tickerRef, ref.nom, {
      lignes, sous: ref.sjLabel || ref.sj,
      rebase: rebaseESBanks(tickerRef, ref.niveauNum),
      vbh: estBureau() ? VBH_FICHE : undefined,
    });
  }

  // Graphique + composition d'une fiche UC, d'après les attributs data-* portés par le panneau.
  // Partagé par le panneau permanent du bureau et la feuille modale du mobile : les deux rendent
  // le même markup (renderUCPanneau), seuls les ids de conteneurs diffèrent (voir plus bas).
  // Dès qu'une (ou plusieurs) UC sont ajoutées via les puces « Comparer », le graphique passe en
  // mode comparaison base 100 (comme le comparateur d'indices du tableau de bord) et la
  // composition simple fait place à un comparatif carte par carte (Chart.comparerCompo).
  function initChartUC(panneau) {
    if (!panneau || !window.Chart) return;
    const gid = panneau.getAttribute('data-graph');
    const isin = panneau.getAttribute('data-uc');
    const compareIsins = (panneau.getAttribute('data-compare') || '').split(',').filter(Boolean);
    if (!gid) return;
    // Conteneurs propres à ce panneau : la feuille mobile et le panneau de page coexistent dans
    // le DOM (celui-ci reste rendu, juste masqué), donc ils ne peuvent pas partager leurs ids.
    const chartId = panneau.getAttribute('data-chart-id') || 'uc-chart-inline';
    const compoId = panneau.getAttribute('data-compo-id') || 'uc-compo-cmp';
    const uc = typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : [];
    const u = uc.find(x => x.isin === isin);
    // Indices du tableau de bord ajoutés à la comparaison : de simples séries de plus, mais qui
    // suffisent à faire passer la fiche en mode comparé même sans second fonds.
    const idxTickers = (panneau.getAttribute('data-cmp-idx') || '').split(',').filter(Boolean);
    const catIdx = typeof ucIndicesComparables === 'function' ? ucIndicesComparables() : [];
    const seriesIdx = idxTickers.map(t => ({ ticker: t, label: (catIdx.find(i => i.ticker === t) || {}).label || t }));
    if (compareIsins.length || seriesIdx.length) {
      const extras = compareIsins.map(i => uc.find(x => x.isin === i)).filter(x => x && x.graphId);
      const series = [{ ticker: gid, label: u ? u.nom : '' }, ...extras.map(e => ({ ticker: e.graphId, label: e.nom })), ...seriesIdx];
      // Bureau : graphique plus bas que le gabarit commun, car le comparatif de composition
      // vient s'ajouter sous la courbe dans le même panneau. Mobile : conteneur étroit, le viewBox
      // 640 de large y est réduit d'autant — même valeur qu'au comparateur du tableau de bord.
      Chart.comparer(chartId, series, { vbh: estBureau() ? 215 : 300 });
      // La composition ne compare que des FONDS : un indice n'a pas de poches d'actifs à opposer.
      if (Chart.comparerCompo && extras.length) {
        const items = [{ isin, nom: u ? u.nom : '' }, ...extras.map(e => ({ isin: e.isin, nom: e.nom }))];
        Chart.comparerCompo(compoId, items);
      }
    } else {
      Chart.ouvrirInline(chartId, gid, u ? u.nom : '', { sous: u ? u.categorie : '', compoIsin: isin });
    }
  }

  // Réinstalle le graphique du panneau de détail après un re-rendu (le conteneur fait partie
  // de la page en bureau : un renderPage le vide, contrairement à la feuille modale).
  // On lit l'ISIN affiché sur le panneau : sans sélection explicite, il montre le 1er produit.
  function rafraichirChartPanneau() {
    if (!estBureau()) return;
    // Seul l'Autocall a encore un panneau dans la page ; la fiche d'un fonds vit dans
    // #modal-root, qu'un renderPage ne touche pas — d'où l'exclusion explicite.
    const panneau = document.querySelector('#content .ac-detail-panneau');
    if (!panneau) return;
    if (state.page === 'contrats') { initChartUC(panneau); return; }
    if (state.page !== 'prod') return;
    const isins = panneau.getAttribute('data-isins');
    if (isins) {
      const membres = isins.split(',').map(i => donnees.produits.find(p => p.isin === i)).filter(Boolean);
      if (membres.length) initChartDetailGroupe(membres);
      return;
    }
    const isin = panneau.getAttribute('data-isin');
    const p = isin ? donnees.produits.find(x => x.isin === isin) : null;
    if (p) initChartDetail(p);
  }

  // L'en-tête de colonnes des tableaux (fonds ET autocall) est en dehors du conteneur qui défile :
  // sans compensation, ses colonnes de droite sont décalées de la largeur de la barre de
  // défilement (19px sous Windows, 0 sur un trackpad macOS). On la mesure ici et on l'expose en
  // variable CSS. Les deux listes ont leur propre variable : elles ne défilent pas en même temps.
  function majGouttiereUC() {
    [['.uc-liste', '--uc-gouttiere'], ['.ac-list', '--ac-gouttiere']].forEach(([sel, varCss]) => {
      const liste = document.querySelector(sel);
      if (!liste) return;
      const g = Math.max(0, liste.offsetWidth - liste.clientWidth);
      document.documentElement.style.setProperty(varCss, g + 'px');
    });
  }

  function renderPage(keepScroll = false) {
    const el = document.getElementById('content');
    const saved = keepScroll ? el.scrollTop : 0;
    const { indices, produits } = donnees;
    switch (state.page) {
      case 'dash':     el.innerHTML = renderDashboard(indices, produits, donnees.taux, state.cmpSeries); break;
      case 'prod':
        el.innerHTML = renderProduits(produits, state, donnees.rappeles);
        majGouttiereUC();
        break;
      case 'actus':    el.innerHTML = renderActus(state); chargerActus(); break;
      case 'contrats':
        el.innerHTML = renderContrats(state, ucPerfsCache, ucSecteursCache, ucMetaCache, ucMetaGenere);
        if (!ucPerfsFetching && Object.keys(ucPerfsCache).length === 0) chargerPerfsUC();
        chargerSecteursUC();
        chargerMetaUC();
        majGouttiereUC();
        break;
      case 'outils':   el.innerHTML = renderOutils(); break;
    }
    el.scrollTop = saved;
    renderNav();
    // La carte « Actualités des sous-jacents » est en .bureau-seul : inutile d'aller chercher
    // le fil RSS sur mobile, où elle reste masquée.
    if (state.page === 'dash') { majCartesMarche(); initComparaisonIndices(); if (estBureau()) chargerActusSousJacents(); }
    rafraichirChartPanneau();
  }

  // ── Verrou « une fenêtre est ouverte » ──
  // Toute fenêtre (feuille mobile, modale bureau, fiche fiscale, formulaire) vit dans #modal-root.
  // Un MutationObserver suffit donc à couvrir TOUS les chemins d'ouverture/fermeture, présents et
  // à venir, sans avoir à toucher chaque fonction ouvrir*/fermer*.
  // Deux effets quand une fenêtre est ouverte :
  //  1. la classe `modal-ouvert` sur <html> active `overscroll-behavior-y: contain` → le navigateur
  //     n'enchaîne plus l'élan du balayage vers le bas sur son propre « tirer pour actualiser »,
  //     qui rechargeait la page (et donc refermait la fenêtre) en conflit avec le tirage de la feuille ;
  //  2. `modalOuvert()` désarme le pull-to-refresh maison et le swipe entre onglets.
  function modalOuvert() {
    const root = document.getElementById('modal-root');
    return !!(root && root.firstElementChild);
  }

  function initVerrouModal() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const maj = () => document.documentElement.classList.toggle('modal-ouvert', modalOuvert());
    new MutationObserver(maj).observe(root, { childList: true });
    maj();
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

  // Feuille UC (mobile) : re-rend son contenu en place. Les puces « Comparer » ne peuvent pas
  // passer par renderPage — le panneau vit dans #modal-root, pas dans la page.
  // Quand le graphique ne change pas (ouverture du sélecteur, dépliage de la stratégie), on
  // replante le conteneur existant dans le nouveau markup plutôt que de rappeler initChartUC :
  // le tracé reste affiché et l'historique n'est pas re-téléchargé.
  function majUCSheet() {
    const host = document.getElementById('uc-sheet-corps');
    if (!host) return false;
    const uc = typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : [];
    const u = uc.find(x => x.isin === state.ucSel);
    if (!u) return false;
    const signature = (el) => el ? el.getAttribute('data-graph') + '|' + (el.getAttribute('data-compare') || '') + '|' + (el.getAttribute('data-cmp-idx') || '') : null;
    const ancien = host.querySelector('.ac-detail-panneau');
    const sig = signature(ancien);
    const chart = ancien && ancien.querySelector('#' + UC_SHEET_IDS.chartId);
    const compo = ancien && ancien.querySelector('#' + UC_SHEET_IDS.compoId);
    // sansChips en bureau : la fiche y est une simple visionneuse, la comparaison se compose
    // dans le tableau. Doit rester aligné sur renderUCModal, sinon les puces réapparaîtraient
    // au premier re-rendu en place (dépliage de la stratégie, par exemple).
    host.innerHTML = renderUCPanneau(u, ucPerfsCache, state, { ...UC_SHEET_IDS, sansChips: estBureau() });
    const panneau = host.querySelector('.ac-detail-panneau');
    if (sig && sig === signature(panneau) && chart) {
      panneau.querySelector('#' + UC_SHEET_IDS.chartId).replaceWith(chart);
      const cible = panneau.querySelector('#' + UC_SHEET_IDS.compoId);
      if (cible && compo) cible.replaceWith(compo);
      return true;
    }
    initChartUC(panneau);
    return true;
  }

  function fermerSheet() {
    const root = document.getElementById('modal-root');
    const backdrop = root.querySelector('.sheet-backdrop');
    if (!backdrop) { root.innerHTML = ''; return; }
    backdrop.classList.remove('sheet-open');
    setTimeout(() => { root.innerHTML = ''; }, 300);
  }

  // Le fil RSS alimente deux cibles : la page Actualités (#news-section, tout le fil) et la
  // carte « Actualités des sous-jacents » du tableau de bord (#news-sj, filtrée). Même cache,
  // même séquence (cache d'abord pour un affichage immédiat, puis réseau en arrière-plan) —
  // d'où ce chargeur générique paramétré par la cible et sa fonction de rendu.
  const NEWS_CACHE_KEY = 'news_cache_v1';
  async function chargerNewsVers(idCible, rendre, messageErreur) {
    // La cible est relue à chaque étape : l'utilisateur peut avoir changé de page entre-temps.
    const poser = (html) => {
      const el = document.getElementById(idCible);
      if (!el) return;
      el.innerHTML = html;
      el.className = '';
    };
    if (!document.getElementById(idCible)) return;
    try {
      const cached = localStorage.getItem(NEWS_CACHE_KEY);
      if (cached) poser(rendre(JSON.parse(cached)));
    } catch {}
    try {
      const news = await AppAPI.chargerNews();
      try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(news)); } catch {}
      poser(rendre(news));
    } catch {
      if (!localStorage.getItem(NEWS_CACHE_KEY)) poser(messageErreur);
    }
  }

  function chargerActus() {
    return chargerNewsVers('news-section', renderNewsSection,
      '<p class="news-empty">Actualités indisponibles (back local requis).</p>');
  }

  function chargerActusSousJacents() {
    return chargerNewsVers('news-sj', (news) => renderNewsSousJacents(news, donnees.produits),
      '<p class="news-empty">Actualités indisponibles (back local requis).</p>');
  }

  // Met à jour les cartes Actifs (Brent, Or, Bitcoin) et Actions (sous-jacents Autocall, ex.
  // Stellantis) avec le dernier cours. La garde évite les mises à jour concurrentes (chiffres
  // qui s'affolent) ; les valeurs live des Actifs sont écrites
  // dans MACRO pour qu'un re-rendu ne repasse pas aux valeurs statiques.
  let majMarcheEnCours = false;
  // Dernier cours d'un actif. Marché ouvert : intraday du jour (référence = ouverture).
  // Marché fermé (week-end/férié : Or et Brent sont des futures sans cotation continue) :
  // repli sur les clôtures journalières récentes (« 1m », interval 1 jour) pour ne pas
  // afficher « — ». Référence de variation = clôture précédente.
  async function coursMacro(gid) {
    const lire = async (per) => {
      const r = await fetch(AppAPI.historyUrl(gid, per), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      return r.ok ? ((await r.json()).points || []) : [];
    };
    try { const p = await lire('1j'); if (p.length >= 2) return { last: p[p.length - 1].c, ref: p[0].c }; } catch (_) {}
    try { const p = await lire('1m'); if (p.length >= 2) return { last: p[p.length - 1].c, ref: p[p.length - 2].c }; } catch (_) {}
    return null;
  }

  async function majCartesMarche() {
    if (typeof AppAPI === 'undefined' || !AppAPI.historyUrl || majMarcheEnCours) return;
    majMarcheEnCours = true;
    try {
      for (const card of document.querySelectorAll('[data-macro]')) {
        const gid = card.getAttribute('data-macro');
        if (!gid || gid.indexOf('fred:') === 0 || gid.indexOf('hicp:') === 0) continue;
        const cm = await coursMacro(gid);
        if (!cm) continue;
        const last = cm.last, first = cm.ref;
        const nomActif = card.querySelector('.index-name')?.textContent || '';
        // Actions (unité €) : toujours 2 décimales, comme l'affichage statique des produits.
        // Actifs (unité $ par défaut, Brent/Or/Bitcoin) : décimales au nombre de chiffres,
        // comportement d'origine inchangé.
        const unite = card.getAttribute('data-macro-unit') || '$';
        const valStr = unite === '€'
          ? last.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + unite
          : last.toLocaleString('fr-FR', { maximumFractionDigits: last >= 100 ? 0 : 2 }) + ' ' + unite;
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
      if (content.scrollTop === 0 && !refreshing && !modalOuvert()) {
        startY  = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    content.addEventListener('touchmove', e => {
      // Une fenêtre ouverte en cours de geste (tap sur une carte puis glissement) annule le tirage.
      if (pulling && modalOuvert()) { pulling = false; ind.style.height = ''; return; }
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
      if (modalOuvert()) { ind.style.height = ''; return; }
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
      if (e.touches.length !== 1 || modalOuvert() || scrolleHorizontalement(e.target)) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    content.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      if (modalOuvert()) return;
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
    initVerrouModal();
    initPullToRefresh();
    initSwipeTabs();
    // Seul écouteur de redimensionnement de l'app : la barre de défilement de la liste des fonds
    // apparaît ou disparaît selon la hauteur de fenêtre, et l'en-tête de colonnes doit suivre.
    // Rien n'est re-rendu ici, juste une variable CSS mise à jour (une frame au plus).
    let rafGouttiere = 0;
    window.addEventListener('resize', () => {
      if (rafGouttiere) return;
      rafGouttiere = requestAnimationFrame(() => { rafGouttiere = 0; majGouttiereUC(); });
    });
    // Échap ferme le tiroir latéral / la modale ouverte (confort bureau).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const root = document.getElementById('modal-root');
      // Rien d'ouvert et une sélection à comparer en cours : Échap sort du mode sélection.
      if (!root || !root.firstChild) {
        if (state.ucModeCompare) App.toggleModeCompare();
        return;
      }
      if (root.querySelector('.sheet-backdrop')) fermerSheet();
      // Fiche Autocall : passer par fermerDetail() plutôt que vider la racine, sinon la ligne
      // reste surlignée dans le tableau alors que plus rien n'est ouvert.
      else if (root.querySelector('.ac-modal')) App.fermerDetail();
      else root.innerHTML = '';
    });
    // Ferme le sélecteur d'indices de la barre « Comparer » si on clique en dehors.
    document.addEventListener('click', (e) => {
      if (!state.ucIdxPickerOuvert) return;
      const wrap = document.getElementById('uc-idx-wrap');
      if (wrap && !wrap.contains(e.target)) {
        state = { ...state, ucIdxPickerOuvert: false };
        App.majBarreCompare();
      }
    });
    // Ferme le sélecteur de séries comparées si on clique en dehors.
    document.addEventListener('click', (e) => {
      if (state.ucComparePickerOuvert) {
        const host = document.getElementById('uc-compare-chips');
        if (host && !host.contains(e.target)) {
          state = { ...state, ucComparePickerOuvert: false };
          if (!majUCSheet()) renderPage(true);
        }
      }
    });
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
    goto(page) {
      if (page === state.page) return;
      const idx = NAV.findIndex(n => n.key === state.page);
      const idxCible = NAV.findIndex(n => n.key === page);
      const direction = (idx !== -1 && idxCible !== -1 && idxCible < idx) ? -1 : 1;
      allerAAnime(page, direction);
    },
    setFamilleFiltre(tab) {
      state = { ...state, familleFiltre: tab };
      renderPage(true);
    },
    // Comparateur du tableau de bord : App.clicActif est le point d'entrée depuis une carte
    // Indices/Actions/Actifs/Taux (même mécanique en bureau et en mobile). toggleSerieCmp fait
    // à la fois ajout et retrait (reclique une carte déjà sélectionnée pour l'enlever) : plus
    // de bouton « + Ajouter » séparé.
    toggleSerieCmp(ticker) {
      const set = new Set(state.cmpSeries || []);
      const ajout = !set.has(ticker);
      if (ajout) set.add(ticker); else set.delete(ticker);
      state = { ...state, cmpSeries: [...set] };
      initComparaisonIndices();
      // Mobile : le comparateur est sous les trois grilles de cartes, donc hors écran au moment
      // du tap — sans ce recentrage, ajouter une valeur ne donnerait aucun retour visible autre
      // que la bordure de la carte. `block:'nearest'` ne défile que si la carte n'est pas déjà
      // visible : taper plusieurs valeurs de suite ne relance donc pas le défilement.
      if (ajout && !estBureau()) {
        const carte = document.querySelector('.cmp-card');
        if (carte) carte.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    // Puces « Comparer » de la fiche UC (page Fonds € & UC) : ajoutent d'autres UC sur le
    // graphique de l'UC actuellement ouverte (state.ucSel), sans carte séparée. Bureau : panneau
    // de droite re-rendu avec la page. Mobile : feuille modale re-rendue en place (majUCSheet).
    toggleUcComparePicker() {
      state = { ...state, ucComparePickerOuvert: !state.ucComparePickerOuvert };
      if (majUCSheet()) return;
      renderPage(true);
    },
    ajouterUcCompare(isin) {
      const set = new Set(state.ucCompare || []);
      set.add(isin);
      state = { ...state, ucCompare: [...set], ucComparePickerOuvert: false };
      if (majUCSheet()) return;
      renderPage(true);
    },
    retirerUcCompare(isin) {
      const reste = (state.ucCompare || []).filter(i => i !== isin);
      state = { ...state, ucCompare: reste };
      if (majUCSheet()) return;
      renderPage(true);
    },
    setNewsTheme(theme) {
      state = { ...state, newsTheme: theme || null };
      renderPage();
    },
    // Tri du tableau des fonds par clic sur un en-tête de colonne. Re-cliquer la colonne active
    // inverse le sens. Les colonnes de texte partent en A→Z, les colonnes chiffrées en
    // décroissant (la meilleure performance, la meilleure note en tête) — c'est le sens attendu
    // dans les deux cas, et ça évite un premier clic « pour rien ».
    trierUC(cle) {
      const TEXTE = ['nom', 'societe', 'categorie', 'secteur'];
      const actuel = state.ucTri || { cle: 'ytd', sens: -1 };
      const sens = actuel.cle === cle ? -actuel.sens : (TEXTE.includes(cle) ? 1 : -1);
      state = { ...state, ucTri: { cle, sens } };
      sauvegarderEtat();
      renderPage(true);
    },
    setUcCat(cat) {
      // Le filtre peut faire disparaître l'UC ouverte de la liste (le panneau retombe alors sur
      // la 1re UC du nouveau filtre) : on referme la comparaison en cours pour ne pas la lui laisser attachée.
      state = { ...state, ucCat: state.ucCat === cat ? null : cat, ucCompare: [], ucComparePickerOuvert: false, ucStrategieOuvert: false };
      sauvegarderEtat();
      renderPage(true);
    },
    toggleFondsEuros() {
      state = { ...state, feOuvert: !state.feOuvert };
      sauvegarderEtat();
      renderPage(true);
    },
    // Bandeau dépliable « Stratégie des fonds » de la fiche UC quand plusieurs UC sont comparées :
    // replié par défaut pour ne pas repousser le graphique sous la ligne de flottaison.
    toggleUcStrategie() {
      state = { ...state, ucStrategieOuvert: !state.ucStrategieOuvert };
      if (majUCSheet()) return;
      renderPage(true);
    },
    voirDetail(isin) {
      const p = donnees.produits.find(x => x.isin === isin);
      if (!p) return;
      if (estBureau()) {
        // La liste occupe toute la largeur : la fiche s'ouvre en fenêtre par-dessus. Venant
        // d'une autre page (ex. alertes du tableau de bord), on bascule sur l'onglet Autocall et
        // on réinitialise le filtre de famille pour que le produit visé soit bien dans la liste.
        const depuisAutrePage = state.page !== 'prod';
        state = {
          ...state, page: 'prod', detailIsin: isin, detailIsins: null,
          familleFiltre: depuisAutrePage ? 'tous' : state.familleFiltre,
        };
        if (depuisAutrePage) { sauvegarderEtat(); renderPage(true); }
        ouvrirFicheAutocall(p, null);
        return;
      }
      state = { ...state, detailIsin: isin, detailIsins: null };
      ouvrirSheet(renderDetail(p));
      initChartDetail(p, 'detail-chart-inline-sheet');
    },
    voirDetailGroupe(isinsStr) {
      const isins = isinsStr.split(',');
      const membres = isins.map(isin => donnees.produits.find(p => p.isin === isin)).filter(Boolean);
      if (membres.length === 0) return;
      if (estBureau()) {
        const depuisAutrePage = state.page !== 'prod';
        state = {
          ...state, page: 'prod', detailIsins: isins, detailIsin: null,
          familleFiltre: depuisAutrePage ? 'tous' : state.familleFiltre,
        };
        if (depuisAutrePage) { sauvegarderEtat(); renderPage(true); }
        ouvrirFicheAutocall(null, membres);
        return;
      }
      state = { ...state, detailIsins: isins, detailIsin: null };
      ouvrirSheet(renderDetailGroupe(membres));
      initChartDetailGroupe(membres, 'detail-chart-inline-sheet');
    },
    // Clic sur un titre de colonne du tableau Autocall (bureau). Texte en A→Z au premier clic,
    // chiffres du meilleur au moins bon — même convention que le tableau des fonds.
    trierAC(cle) {
      const courant = state.acTri || { cle: 'constat', sens: 1 };
      const texte = ['nom', 'famille', 'sj'].includes(cle);
      const sens = courant.cle === cle ? -courant.sens : (texte || cle === 'constat' ? 1 : -1);
      state = { ...state, acTri: { cle, sens } };
      sauvegarderEtat();
      renderPage(true);
    },
    fermerDetail() {
      if (estBureau()) {
        document.querySelectorAll('.ac-card--actif').forEach(e => e.classList.remove('ac-card--actif'));
        state = { ...state, detailIsin: null, detailIsins: null };
        App.fermerModal();
        return;
      }
      fermerSheet();
      state = { ...state, detailIsin: null, detailIsins: null };
    },
    fermerFormulaire,
    // Clic (ou tap) sur une carte Indices/Actions/Actifs/Taux du tableau de bord : ajoute ou
    // retire la série du comparateur situé sous les cartes. Même comportement en bureau et en
    // mobile depuis que le comparateur y est aussi affiché (avant, le mobile ouvrait une fiche
    // graphique modale — remplacée par cette sélection multiple).
    clicActif(id) {
      App.toggleSerieCmp(id);
    },
    // Clic sur une ligne du tableau des fonds : ouvre sa fiche, SAUF en mode « Comparer » (bureau),
    // où le clic coche/décoche la ligne pour la sélection à comparer.
    clicUC(isin) {
      if (state.ucModeCompare) return App.choisirUC(isin);
      App.ouvrirUC(isin);
    },
    // ── Mode « Comparer » du tableau (bureau) ──────────────────────────────────────────────
    // Le même bouton fait les deux temps : entrer en sélection, puis lancer. La sélection n'est
    // pas persistée (état d'écran, comme le thème d'actualités) et l'ordre des clics est celui
    // du graphique — le premier fonds coché porte la fiche, les autres viennent en comparaison.
    toggleModeCompare() {
      const on = !state.ucModeCompare;
      state = { ...state, ucModeCompare: on, ucSelection: [], ucCmpIndices: [] };
      renderPage(true);
    },
    // Sélecteur d'indices de la barre : ajoute des courbes de référence (les « Indices clés » du
    // tableau de bord) à la prochaine comparaison. La liste est vidée dès que la comparaison est
    // lancée (comme les fonds cochés) et à chaque entrée/sortie du mode : rien n'est gardé en
    // mémoire d'une comparaison à l'autre, chacune repart d'une feuille blanche.
    toggleIndicePicker() {
      state = { ...state, ucIdxPickerOuvert: !state.ucIdxPickerOuvert };
      App.majBarreCompare();
    },
    toggleIndiceCmp(ticker) {
      const idx = state.ucCmpIndices || [];
      state = { ...state, ucCmpIndices: idx.includes(ticker) ? idx.filter(t => t !== ticker) : [...idx, ticker] };
      App.majBarreCompare();
    },
    viderIndicesCmp() {
      state = { ...state, ucCmpIndices: [] };
      App.majBarreCompare();
    },
    // Remplace la seule barre, sans renderPage : la liste garde son défilement et ses coches.
    majBarreCompare() {
      const barre = document.getElementById('uc-cmp-barre');
      if (barre) barre.outerHTML = ucCmpBarreHtml(state);
    },
    choisirUC(isin) {
      const sel = state.ucSelection || [];
      const dedans = sel.includes(isin);
      state = { ...state, ucSelection: dedans ? sel.filter(i => i !== isin) : [...sel, isin] };
      // Coche la ligne dans le DOM plutôt que de re-rendre la page : un renderPage complet
      // reconstruirait la liste et remonterait son défilement en pleine sélection.
      const ligne = document.querySelector(`.uc-item[data-isin="${isin}"]`);
      if (ligne) ligne.classList.toggle('uc-item--choisi', !dedans);
      App.majBarreCompare();
    },
    lancerComparaison() {
      const sel = state.ucSelection || [];
      const idx = state.ucCmpIndices || [];
      if (!sel.length || sel.length + idx.length < 2) return;
      // ucCompareIdx fige les indices POUR la fiche qui s'ouvre ; ucCmpIndices (le choix de la
      // barre) est vidé dans le même mouvement, pour que le prochain « Comparer » reparte vierge.
      state = { ...state, ucModeCompare: false, ucSelection: [], ucCmpIndices: [], ucStrategieOuvert: false, ucIdxPickerOuvert: false,
                ucSel: sel[0], ucCompare: sel.slice(1), ucCompareIdx: idx, ucComparePickerOuvert: false };
      renderPage(true);
      App.ouvrirFicheUC(sel[0]);
    },
    // Bureau : sélectionne l'UC dans le panneau de droite. Mobile : même fiche, en feuille modale
    // (elle porte donc aussi les puces « Comparer », la stratégie et la composition comparée).
    ouvrirUC(isin) {
      // Changer l'UC ouverte referme la comparaison en cours : elle porte sur le graphique
      // affiché, pas sur une sélection indépendante.
      state = { ...state, ucSel: isin, ucCompare: [], ucCompareIdx: [], ucComparePickerOuvert: false, ucStrategieOuvert: false };
      sauvegarderEtat();
      App.ouvrirFicheUC(isin);
    },
    // Montage de la fiche seule (surbrillance + fenêtre/feuille + graphique), sans toucher à
    // state.ucCompare : lancerComparaison() vient justement de le remplir.
    ouvrirFicheUC(isin) {
      const u = (typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : []).find(x => x.isin === isin);
      if (!u) return;
      // La ligne ouverte est marquée directement dans le DOM : un renderPage complet pour une
      // simple surbrillance détruirait la liste et remonterait son défilement.
      document.querySelectorAll('.uc-item--actif').forEach(e => e.classList.remove('uc-item--actif'));
      const ligne = document.querySelector(`.uc-item[data-isin="${isin}"]`);
      if (ligne) ligne.classList.add('uc-item--actif');
      if (!estBureau()) {
        ouvrirSheet(renderUCSheet(u, ucPerfsCache, state));
        initChartUC(document.querySelector('#uc-sheet-corps .ac-detail-panneau'));
        return;
      }
      const root = document.getElementById('modal-root');
      if (!root) return;
      root.innerHTML = renderUCModal(u, ucPerfsCache, state);
      initChartUC(root.querySelector('.ac-detail-panneau'));
    },
    fermerUC() { fermerSheet(); },
    fermerModal() {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    },
    // Page Outils : ouvre une fiche de référence fiscale (contenu HTML statique, voir
    // OUTILS_FICHES/renderFiche* dans pages.js) — même gabarit modal/sheet que Chart (overlay
    // bureau, feuille dépliée sur mobile, refermable au doigt via initSheetDrag).
    ouvrirFiche(cle) {
      const root = document.getElementById('modal-root');
      const fiche = OUTILS_FICHES[cle];
      if (!root || !fiche) return;
      const contenu = (OUTILS_CORPS[cle] || renderFicheRevenus)();
      const corps = `
        <div class="modal-header">
          <span class="modal-title">${escHtml(fiche.titre)}</span>
          <button class="modal-close" onclick="App.fermerFiche()">✕</button>
        </div>
        <div class="modal-body">${contenu}</div>`;
      if (estBureau()) {
        root.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)App.fermerFiche()">
          <div class="modal-panel fisc-panel">${corps}</div>
        </div>`;
        return;
      }
      root.innerHTML = `
        <div class="sheet-backdrop" onclick="if(event.target===this)App.fermerFiche()">
          <div class="sheet-panel fisc-panel sheet-expanded">
            <div class="sheet-handle"></div>
            ${corps}
          </div>
        </div>`;
      const backdrop = root.querySelector('.sheet-backdrop');
      void backdrop.offsetWidth; // force le reflow pour déclencher la transition d'ouverture
      backdrop.classList.add('sheet-open');
      const panel = backdrop.querySelector('.sheet-panel');
      if (panel && typeof initSheetDrag === 'function') initSheetDrag(panel, App.fermerFiche);
    },
    fermerFiche() {
      const root = document.getElementById('modal-root');
      if (!root) return;
      const backdrop = root.querySelector('.sheet-backdrop');
      if (!backdrop) { root.innerHTML = ''; return; }
      backdrop.classList.remove('sheet-open');
      setTimeout(() => { root.innerHTML = ''; }, 300);
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
