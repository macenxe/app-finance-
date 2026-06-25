const App = (() => {
  let state   = { page: 'dash', filter: 'tous', cat: null, q: '', detailIsin: null };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS), taux: TAUX };

  const NAV = [
    { key: 'dash',     label: 'Tableau de bord'      },
    { key: 'prod',     label: 'Autocalls'             },
    { key: 'contrats', label: 'Fonds € et UC'          },
    { key: 'alloc',    label: 'Allocation & Marchés' },
    { key: 'veille',   label: 'Veille économique'    },
  ];

  function renderNav() {
    const activeKey = state.page === 'detail' ? 'prod' : state.page;
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${activeKey === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
  }

  function renderPage() {
    const el = document.getElementById('content');
    const { indices, produits } = donnees;
    switch (state.page) {
      case 'dash':     el.innerHTML = renderDashboard(indices, produits, donnees.taux); break;
      case 'prod':     el.innerHTML = renderProduits(produits, state);  break;
      case 'contrats': el.innerHTML = renderContrats(state);            break;
      case 'alloc':    el.innerHTML = renderAllocation();               break;
      case 'veille':   el.innerHTML = renderVeille();                   break;
      case 'detail': {
        const p = produits.find(p => p.isin === state.detailIsin);
        el.innerHTML = p ? renderDetail(p) : renderProduits(produits, state);
        break;
      }
    }
    el.scrollTop = 0;
    renderNav();
    mettreAJourBadgeSource();
    if (state.page === 'dash') majCartesMarche();
  }

  // Met à jour les cartes macro Yahoo (Brent, Or, Bitcoin) avec le dernier cours,
  // pour que la valeur affichée colle au dernier point du graphique.
  async function majCartesMarche() {
    if (typeof AppAPI === 'undefined' || !AppAPI.historyUrl) return;
    for (const card of document.querySelectorAll('[data-macro]')) {
      const gid = card.getAttribute('data-macro');
      if (!gid || gid.indexOf('fred:') === 0 || gid.indexOf('hicp:') === 0) continue;
      try {
        const r = await fetch(AppAPI.historyUrl(gid, '1j'), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!r.ok) continue;
        const pts = (await r.json()).points || [];
        if (pts.length < 2) continue;
        const last = pts[pts.length - 1].c, first = pts[0].c;
        const valEl = card.querySelector('[data-macro-val]');
        const varEl = card.querySelector('[data-macro-var]');
        if (valEl) valEl.textContent = last.toLocaleString('fr-FR', { maximumFractionDigits: last >= 100 ? 0 : 2 }) + ' $';
        if (varEl && first) {
          const pct = (last - first) / first * 100, up = pct >= 0;
          varEl.textContent = (up ? '+' : '') + pct.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
          varEl.className = 'taux-var tnum ' + (up ? 'up' : 'down');
        }
      } catch (_) { /* on garde la valeur affichée */ }
    }
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
      renderPage();
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
    renderPage();
    initPullToRefresh();
    donnees = await AppAPI.chargerDonnees();
    renderPage();
  }

  return {
    toggleSidebar() {
      const sidebar  = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      const isOpen   = sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open', isOpen);
    },
    goto(page) {
      state = { ...state, page, q: '', detailIsin: null };
      fermerFormulaire();
      // Ferme la sidebar sur mobile après navigation
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('open');
      renderPage();
    },
    setFilter(filter) {
      state = { ...state, filter };
      renderPage();
    },
    setCat(cat) {
      state = { ...state, cat: state.cat === cat ? null : cat };
      renderPage();
    },
    setUcCat(cat) {
      state = { ...state, ucCat: state.ucCat === cat ? null : cat };
      renderPage();
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
      // Repères fins : strike, barrière autocall, barrière coupon (produits actions).
      const lignes = [];
      if (p.type === 'equity' && p.strikeNum) {
        lignes.push({ valeur: p.strikeNum, label: 'Strike', couleur: '#16304f' });
        if (p.bAutoNum != null) {
          const v = (p.bAutoNum / 100) * p.strikeNum;
          if (Math.abs(v - p.strikeNum) > p.strikeNum * 0.005) lignes.push({ valeur: v, label: 'B. autocall', couleur: '#1d6f4c' });
        }
        if (p.bCouponNum != null) lignes.push({ valeur: (p.bCouponNum / 100) * p.strikeNum, label: 'B. coupon', couleur: '#9a3535' });
      }
      const cat = categorieProduit(p);
      Chart.ouvrir(p.ticker || p.sjLabel || p.sj, p.nom, {
        lignes, sous: p.sjLabel || p.sj, retour: () => App.ouvrirCategorie(cat),
      });
    },
    ouvrirEditionCMS() {
      const tausCMS = donnees.taux.find(t => t.nom === 'CMS 10 ans');
      const valActuelle = tausCMS ? parseFloat(tausCMS.valeur) || null : null;
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = renderModalEditionCMS(valActuelle);
      setTimeout(() => { const inp = document.getElementById('cms-input'); if (inp) inp.focus(); }, 50);
    },
    fermerEditionCMS() {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    },
    async soumettreEditionCMS() {
      const input = document.getElementById('cms-input');
      const errEl = document.getElementById('cms-error');
      const valeur = parseFloat(input.value.replace(',', '.'));
      if (isNaN(valeur) || valeur <= 0 || valeur > 20) {
        errEl.textContent = 'Valeur invalide — entrez un taux entre 0 et 20 (ex : 3.15).';
        errEl.style.display = 'block';
        return;
      }
      const btn = document.querySelector('.modal-footer .btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }
      try {
        await AppAPI.mettreAJourCMS(valeur);
        donnees = await AppAPI.chargerDonnees();
        const root = document.getElementById('modal-root');
        if (root) root.innerHTML = '';
        renderPage();
      } catch (err) {
        errEl.textContent = 'Erreur : ' + (err.message || 'serveur indisponible');
        errEl.style.display = 'block';
        if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
      }
    },
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
