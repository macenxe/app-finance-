const App = (() => {
  let state = { page: 'dash', filter: 'tous', q: '' };

  const NAV = [
    { key: 'dash',   label: 'Tableau de bord' },
    { key: 'prod',   label: 'Produits structurés' },
    { key: 'alloc',  label: 'Allocation & Marchés' },
    { key: 'veille', label: 'Veille économique' },
  ];

  function renderNav() {
    document.getElementById('nav').innerHTML = NAV.map(item => `
      <div class="nav-item${state.page === item.key ? ' active' : ''}" onclick="App.goto('${item.key}')">
        <span class="nav-dot"></span>${item.label}
      </div>`).join('');
  }

  function renderPage() {
    const el = document.getElementById('content');
    switch (state.page) {
      case 'dash':   el.innerHTML = renderDashboard(); break;
      case 'prod':   el.innerHTML = renderProduits(state); break;
      case 'alloc':  el.innerHTML = renderAllocation(); break;
      case 'veille': el.innerHTML = renderVeille(); break;
    }
    el.scrollTop = 0;
    renderNav();
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
      // Re-render only the table portion to avoid losing input focus
      const el = document.getElementById('content');
      el.innerHTML = renderProduits(state);
      const input = document.getElementById('prod-search');
      if (input) { input.focus(); input.setSelectionRange(q.length, q.length); }
      renderNav();
    },
    dashSearch(q) {
      // Dashboard search: filter is visual only for now
    },
    init() {
      renderPage();
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
