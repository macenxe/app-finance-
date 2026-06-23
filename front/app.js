const App = (() => {
  let state   = { page: 'dash', filter: 'tous', q: '', detailIsin: null };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS), taux: TAUX };

  const NAV = [
    { key: 'dash',   label: 'Tableau de bord'     },
    { key: 'prod',   label: 'Produits structurés'  },
    { key: 'alloc',  label: 'Allocation & Marchés' },
    { key: 'veille', label: 'Veille économique'    },
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
      case 'dash':   el.innerHTML = renderDashboard(indices, produits, donnees.taux); break;
      case 'prod':   el.innerHTML = renderProduits(produits, state);    break;
      case 'alloc':  el.innerHTML = renderAllocation();                 break;
      case 'veille': el.innerHTML = renderVeille();                     break;
      case 'detail': {
        const p = produits.find(p => p.isin === state.detailIsin);
        el.innerHTML = p ? renderDetail(p) : renderProduits(produits, state);
        break;
      }
    }
    el.scrollTop = 0;
    renderNav();
  }

  function fermerFormulaire() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  // ── Tiroir latéral (mobile) ──
  function majBoutonNav(open) {
    const btn = document.getElementById('sidebar-toggle');
    if (!btn) return;
    btn.textContent = open ? '✕' : '☰';
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  function toggleNav() {
    majBoutonNav(document.body.classList.toggle('nav-open'));
  }
  function fermerNav() {
    document.body.classList.remove('nav-open');
    majBoutonNav(false);
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
    goto(page) {
      state = { ...state, page, q: '', detailIsin: null };
      fermerFormulaire();
      fermerNav();
      renderPage();
    },
    setFilter(filter) {
      state = { ...state, filter };
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
    toggleNav,
    fermerNav,
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  // Recharge la page dès qu'un nouveau service worker prend le contrôle,
  // pour que l'utilisateur voie immédiatement la nouvelle version.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
