const App = (() => {
  let state  = { page: 'dash', filter: 'tous', q: '' };
  let donnees = { source: 'statique', indices: INDICES_MARCHE, produits: enrichirProduits(PRODUITS) };

  const NAV = [
    { key: 'dash',   label: 'Tableau de bord'      },
    { key: 'prod',   label: 'Produits structurés'   },
    { key: 'alloc',  label: 'Allocation & Marchés'  },
    { key: 'veille', label: 'Veille économique'     },
  ];

  function renderNav() {
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${state.page === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
  }

  function renderPage() {
    const el = document.getElementById('content');
    const { indices, produits } = donnees;
    switch (state.page) {
      case 'dash':   el.innerHTML = renderDashboard(indices, produits); break;
      case 'prod':   el.innerHTML = renderProduits(produits, state);    break;
      case 'alloc':  el.innerHTML = renderAllocation();                 break;
      case 'veille': el.innerHTML = renderVeille();                     break;
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

  async function init() {
    // Affiche immédiatement avec les données statiques
    renderPage();
    // Puis tente de charger les données réelles depuis l'API
    donnees = await AppAPI.chargerDonnees();
    renderPage();
  }

  return {
    goto(page) {
      state = { ...state, page, q: '' };
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
    init,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
