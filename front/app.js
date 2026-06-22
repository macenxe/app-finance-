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
    mettreAJourBadgeSource();
  }

  function mettreAJourBadgeSource() {
    const badge = document.getElementById('source-badge');
    if (!badge) return;
    if (donnees.source === 'api') {
      badge.textContent = '● Données en direct';
      badge.className = 'source-badge live';
    } else {
      badge.textContent = '○ Données statiques (back hors ligne)';
      badge.className = 'source-badge offline';
    }
  }

  function fermerFormulaire() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  async function init() {
    renderPage();
    donnees = await AppAPI.chargerDonnees();
    renderPage();
  }

  return {
    goto(page) {
      state = { ...state, page, q: '', detailIsin: null };
      fermerFormulaire();
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
}
