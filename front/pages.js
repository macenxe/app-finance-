// ── Fonctions de rendu des 4 pages ──

function renderDashboard() {
  const top5 = enrichirProduits(PRODUITS)
    .filter(p => p.zoneAutocall === 'NON' || p.k !== 'green')
    .sort((a, b) => {
      const ord = { red:0, orange:1, green:2 };
      return ord[a.k] - ord[b.k];
    })
    .slice(0, 6);

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Tableau de bord</div>
        <div class="page-sub">Synthèse des marchés · 20 juin 2026, 17:35 · clôture provisoire</div>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span style="font-size:13px;">⌕</span>
          <input id="dash-search" placeholder="Rechercher un produit, un indice…" oninput="App.dashSearch(this.value)">
        </div>
        <button class="btn-primary">Générer une synthèse conseiller</button>
        <button class="btn-secondary">Export PDF</button>
      </div>
    </header>

    <div class="page-body">
      <!-- Indices -->
      <div class="flex-sb mb-12">
        <span class="section-label">Indices clés</span>
        <span class="section-hint">Données à vérifier</span>
      </div>
      <div class="grid-5 mb-24">
        ${INDICES_MARCHE.map(i => `
        <div class="card index-card">
          <div class="index-name">${i.nom}</div>
          <div class="index-val tnum">${i.valeur}</div>
          <div class="index-var tnum ${i.hausse ? 'up' : 'down'}">${i.hausse ? '▲' : '▼'} ${i.var}</div>
        </div>`).join('')}
      </div>

      <!-- Taux + Macro -->
      <div class="grid-2-narrow mb-24">
        <div class="card p-18">
          <div class="card-title mb-12">Taux & obligations</div>
          <div class="taux-grid">
            ${TAUX.map(t => `
            <div>
              <div class="taux-item-name">${t.nom}</div>
              <div class="taux-val tnum">${t.valeur}</div>
              <div class="taux-var tnum ${t.hausse === null ? 'flat' : t.hausse ? 'up' : 'down'}">${t.var}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card p-18">
          <div class="card-title mb-12">Inflation & banques centrales</div>
          <div class="macro-grid">
            ${MACRO.map(m => `
            <div>
              <div class="taux-item-name">${m.nom}</div>
              <div class="taux-val tnum">${m.valeur}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Alertes + Autocalls -->
      <div class="grid-dash-bottom">
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div class="card p-18">
            <div class="card-title mb-12">Alertes du jour</div>
            ${ALERTES.map(a => `
            <div class="alert-item">
              <span class="alert-dot" style="background:${a.couleur};"></span>
              <div class="alert-text">${a.texte}</div>
            </div>`).join('')}
          </div>
          <div class="card p-18">
            <div class="card-title mb-12">Prochains événements macro</div>
            ${EVENEMENTS.map(e => `
            <div class="event-item">
              <div class="event-date tnum${e.important ? ' important' : ''}">${e.date}</div>
              <div class="event-label">${e.label}</div>
            </div>`).join('')}
          </div>
        </div>

        <div class="card p-18">
          <div class="flex-sb mb-12">
            <div class="card-title">Produits autocall à surveiller</div>
            <span class="voir-lien" onclick="App.goto('prod')">Tout voir →</span>
          </div>
          <div class="autocall-table">
            <div class="autocall-header">
              <span>Produit</span><span>Sous-jacent</span>
              <span style="text-align:right;">% strike</span>
              <span>Prochaine const.</span>
              <span style="text-align:right;">Statut</span>
            </div>
            ${top5.map(p => `
            <div class="autocall-row">
              <span style="color:#16304f;font-weight:500;">${p.nom}</span>
              <span style="color:#6b6e73;">${p.sj}</span>
              <span class="tnum col-right" style="font-weight:600;color:${p.k==='red'?'#9a3535':p.k==='orange'?'#b06a1a':'#6b6e73'};">${p.pct}</span>
              <span class="tnum" style="color:#6b6e73;">${p.constat}</span>
              <span style="text-align:right;"><span class="badge ${p.k}">${p.statut}</span></span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderProduits(state) {
  const all = enrichirProduits(PRODUITS);
  const q = (state.q || '').trim().toLowerCase();
  const f = state.filter || 'tous';
  let rows = f === 'tous' ? all : all.filter(r => r.k === f);
  if (q) rows = rows.filter(r => (r.nom + ' ' + r.isin + ' ' + r.sj).toLowerCase().includes(q));

  const count = k => all.filter(r => r.k === k).length;

  const chips = [
    { key:'tous',   label:`Tous (${all.length})` },
    { key:'green',  label:'Rappel probable' },
    { key:'orange', label:'Surveillance' },
    { key:'red',    label:'Risque' },
  ];

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Produits structurés · Autocalls</div>
        <div class="page-sub">${all.length} produits suivis · niveaux indicatifs à vérifier</div>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span style="font-size:13px;">⌕</span>
          <input id="prod-search" placeholder="ISIN, nom, sous-jacent…" value="${escHtml(state.q||'')}"
                 oninput="App.prodSearch(this.value)">
        </div>
        <button class="btn-secondary">Export PDF</button>
      </div>
    </header>

    <div style="padding:18px 30px 40px;">
      <div class="summary-chips">
        <div class="card chip-card"><div class="chip-card-label">Produits suivis</div><div class="chip-card-val tnum">${all.length}</div></div>
        <div class="card chip-card green"><div class="chip-card-label">Rappel probable</div><div class="chip-card-val tnum">${count('green')}</div></div>
        <div class="card chip-card orange"><div class="chip-card-label">Sous surveillance</div><div class="chip-card-val tnum">${count('orange')}</div></div>
        <div class="card chip-card red"><div class="chip-card-label">En risque</div><div class="chip-card-val tnum">${count('red')}</div></div>
      </div>

      <div class="filter-row">
        <div class="filter-chips">
          ${chips.map(c => `<div class="filter-chip${f===c.key?' active':''}" onclick="App.setFilter('${c.key}')">${c.label}</div>`).join('')}
        </div>
        <div class="filter-count">${rows.length} produits affichés</div>
      </div>

      <div class="products-table-wrap scroll">
        <div class="products-table">
          <div class="products-table-header">
            <span>Code ISIN</span><span>Nom commercial</span><span>Sous-jacent</span>
            <span class="col-right">Coupon</span><span class="col-right">Strike</span>
            <span class="col-right">Niveau</span><span class="col-right">% strike</span>
            <span class="col-right">B. auto</span><span class="col-right">B. coup.</span>
            <span>1ère const.</span><span>Échéance</span><span>Statut</span><span></span>
          </div>
          ${rows.map(r => `
          <div class="products-table-row">
            <span class="col-isin tnum">${r.isin}</span>
            <span class="col-nom">${r.nom}</span>
            <span class="col-sj">${r.sj}</span>
            <span class="tnum col-right">${r.coupon}</span>
            <span class="tnum col-dim">${r.strike}</span>
            <span class="tnum col-num">${r.niveau}</span>
            <span class="tnum col-right" style="font-weight:600;color:${r.type==='equity'?(r.k==='red'?'#9a3535':r.k==='orange'?'#b06a1a':'#1d6f4c'):'#9a8f7a'};">${r.pct}</span>
            <span class="tnum col-dim">${r.bAuto}</span>
            <span class="tnum col-dim">${r.bCoupon}</span>
            <span class="tnum col-dim" style="font-size:11.5px;">${r.constat}</span>
            <span class="tnum col-dim" style="font-size:11.5px;">${r.ech}</span>
            <span><span class="badge ${r.k}">${r.statut}</span></span>
            <span class="col-detail">Détail</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="table-note">% strike = niveau du sous-jacent rapporté au strike initial (indicatif). Produits CMS exprimés en taux. Données à vérifier — validation humaine obligatoire.</div>
    </div>
  </div>`;
}

function renderAllocation() {
  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Allocation & Marchés</div>
        <div class="page-sub">Lecture macro interne · non personnalisée · 20 juin 2026</div>
      </div>
      <button class="btn-primary">Générer une synthèse conseiller</button>
    </header>

    <div class="page-body">
      <div class="card alloc-intro mb-18">
        <div class="card-title mb-12" style="font-size:16px;">Contexte économique</div>
        <p>Désinflation confirmée en zone euro (2,1 %), permettant à la BCE de maintenir un biais accommodant mesuré. Croissance modérée mais résiliente, soutenue par la consommation. Aux États-Unis, la Fed reste prudente face à une inflation collante. Les marchés actions évoluent près de leurs plus hauts ; la pentification des courbes profite aux produits de taux. Environnement globalement porteur pour les structures de rappel, sous réserve de la volatilité bancaire européenne.</p>
      </div>

      <div class="grid-3 mb-18">
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header">
            <div class="card-title">Actions</div>
            <span class="alloc-badge favorable">Favorable</span>
          </div>
          <p class="alloc-asset-body">Indices proches des plus hauts. Préférence pour les grandes capitalisations européennes de qualité. Banques EU volatiles — vigilance sur les sous-jacents bancaires des CAP.</p>
        </div>
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header">
            <div class="card-title">Obligations</div>
            <span class="alloc-badge neutre">Neutre +</span>
          </div>
          <p class="alloc-asset-body">Portage attractif sur le 10 ans souverain. Pentification favorable aux autocalls indexés CMS. Sensibilité au calendrier BCE/Fed.</p>
        </div>
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header">
            <div class="card-title">Monétaire</div>
            <span class="alloc-badge baisse">Rendement en baisse</span>
          </div>
          <p class="alloc-asset-body">Rémunération du monétaire orientée à la baisse avec l'assouplissement BCE. Incite à redéployer la trésorerie longue vers le structuré ou l'obligataire.</p>
        </div>
      </div>

      <div class="grid-2 mb-18">
        <div class="card p-18">
          <div class="card-title mb-12">Risques macro</div>
          <div class="risk-list">
            <div class="risk-item"><span class="risk-dot" style="background:#9a3535;"></span><div class="risk-text">Stress bancaire européen — impact direct sur les sous-jacents Euro Stoxx Banks.</div></div>
            <div class="risk-item"><span class="risk-dot" style="background:#b06a1a;"></span><div class="risk-text">Reprise de l'inflation US retardant les baisses de taux Fed.</div></div>
            <div class="risk-item"><span class="risk-dot" style="background:#b06a1a;"></span><div class="risk-text">Tensions géopolitiques et énergie — volatilité ponctuelle.</div></div>
          </div>
        </div>
        <div class="card p-18">
          <div class="card-title mb-12">Opportunités d'allocation</div>
          <div class="risk-list">
            <div class="risk-item"><span class="risk-dot" style="background:#1d6f4c;"></span><div class="risk-text">Autocalls CMS — portage de taux décorrélé des actions.</div></div>
            <div class="risk-item"><span class="risk-dot" style="background:#1d6f4c;"></span><div class="risk-text">Réinvestissement des capitaux rappelés vers de nouvelles structures.</div></div>
            <div class="risk-item"><span class="risk-dot" style="background:#1d6f4c;"></span><div class="risk-text">Obligataire souverain 7-10 ans pour le socle de rendement.</div></div>
          </div>
        </div>
      </div>

      <div class="reco-box">
        <div class="reco-header">
          <div class="card-title">Recommandations internes</div>
          <span class="reco-tag">Non personnalisées</span>
        </div>
        <div class="reco-grid">
          <div class="reco-item"><b style="color:#16304f;">Surpondérer</b> les structures de taux (CMS) en cœur de portefeuille de rendement.</div>
          <div class="reco-item"><b style="color:#16304f;">Surveiller</b> l'exposition aux banques EU concentrée sur les CAP.</div>
          <div class="reco-item"><b style="color:#16304f;">Préparer</b> le réemploi des capitaux issus des rappels probables (T3 2026).</div>
        </div>
        <div class="reco-footer">Aide à l'analyse à usage interne — ne constitue pas un conseil personnalisé. Toute application à un client requiert une validation humaine et une étude d'adéquation.</div>
      </div>
    </div>
  </div>`;
}

function renderVeille() {
  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Veille économique</div>
        <div class="page-sub">Actualités marchés, taux & patrimoine · sources à vérifier</div>
      </div>
      <button class="btn-primary">Résumer l'impact pour l'allocation</button>
    </header>

    <div class="page-body">
      <div class="veille-tags">
        <div class="veille-tag active">Tout</div>
        <div class="veille-tag">BCE / Fed</div>
        <div class="veille-tag">Inflation & taux</div>
        <div class="veille-tag">Géopolitique</div>
        <div class="veille-tag">Immobilier</div>
        <div class="veille-tag">Fiscalité patrimoniale</div>
      </div>

      <div class="grid-2">
        ${VEILLE.map(v => `
        <div class="card veille-card">
          <div class="veille-card-header">
            <span class="veille-tag-pill" style="background:${v.tagBg};color:${v.tagColor};">${v.tag}</span>
            <span class="veille-date tnum">${v.date}</span>
          </div>
          <div class="veille-titre">${v.titre}</div>
          <p class="veille-corps">${v.corps}</p>
          <div class="veille-link">Résumer l'impact pour l'allocation →</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
