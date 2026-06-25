// ── Fonctions de rendu des 4 pages ──
// Chaque fonction accepte les données en paramètre (API ou statiques).

function barrierCouleur(niveauPct, barrierePct, estBaisse) {
  const diff = estBaisse ? barrierePct - niveauPct : niveauPct - barrierePct;
  if (diff >= 5)  return 'green';
  if (diff > -5)  return 'orange';
  return 'red';
}

function abregerMois(nom) {
  const m = {
    Janvier:'01', Février:'02', Mars:'03', Avril:'04', Mai:'05', Juin:'06',
    Juillet:'07', Août:'08', Septembre:'09', Octobre:'10', Novembre:'11', Décembre:'12',
    Jan:'01', Fév:'02', Mar:'03', Avr:'04', Juil:'07', Aoû:'08', Sep:'09', Oct:'10', Nov:'11', Déc:'12',
  };
  return nom
    .replace(/\bAutocall\s+/g, '')
    .replace(/\b(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre|Jan|Fév|Mar|Avr|Juil|Aoû|Sep|Oct|Nov|Déc)\s+(\d{4})\b/g,
      (_, mois, annee) => `${m[mois]}/${annee.slice(2)}`);
}

function renderDashboard(indices, produits, taux) {
  taux = taux || TAUX;

  // Prochaines dates clés : constatations à venir, triées par date croissante
  const parseConstat = (str) => {
    const m = str && str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1]);
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmtDateCle = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const prochainsDates = produits
    .map(p => { const d = parseConstat(p.constat); return d && d >= today ? { p, d, jours: Math.ceil((d - today) / 86400000) } : null; })
    .filter(x => x && x.jours <= 60)
    .sort((a, b) => a.d - b.d)
    .slice(0, 12);

  const fmtHeure = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const heureRef = indices[0]?.heureCours
    ? fmtHeure(indices[0].heureCours)
    : '20 juin 2026, 17:35 · clôture provisoire';

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Tableau de bord</div>
        <div class="page-sub">Synthèse des marchés · ${heureRef}</div>
      </div>
    </header>

    <div class="page-body">
      <!-- Indices clés -->
      <div class="flex-sb mb-12">
        <span class="section-label">Indices clés</span>
      </div>
      <div class="grid-3 mb-24">
        ${indices.map(i => { const gid = graphIdPour(i.nom) || i.ticker; return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${i.nom}')"` : ''}>
          <div class="index-name">${i.nom}</div>
          <div class="index-val tnum">${i.valeur}</div>
          ${i.var != null
            ? `<div class="index-var tnum ${i.hausse ? 'up' : 'down'}">${i.hausse ? '▲' : '▼'} ${i.var}</div>`
            : `<div class="index-var tnum" style="color:#9a8f7a;">—</div>`
          }
        </div>`; }).join('')}
      </div>

      <!-- Actifs -->
      <div class="flex-sb mb-12">
        <span class="section-label">Actifs</span>
      </div>
      <div class="grid-3 mb-24">
        ${MACRO.map(m => { const gid = graphIdPour(m.nom); return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${m.nom}')"` : ''}${gid ? ` data-macro="${gid}"` : ''}>
          <div class="index-name">${m.nom}</div>
          <div class="index-val tnum" data-macro-val>${m.valeur}</div>
          <div class="index-var tnum ${m.hausse === null ? 'flat' : m.hausse ? 'up' : 'down'}" data-macro-var>${m.hausse ? '▲' : '▼'} ${m.var}</div>
        </div>`; }).join('')}
      </div>

      <!-- Taux et indicateurs macro -->
      <div class="flex-sb mb-12">
        <span class="section-label">Taux &amp; indicateurs macro</span>
      </div>
      <div class="grid-3 mb-24">
        ${[...taux, { nom: 'Inflation zone €' }].map(t => {
          const gid = graphIdPour(t.nom);
          const h = (gid && typeof HISTO_DERNIER !== 'undefined') ? HISTO_DERNIER[gid] : null;
          const valeur = h ? h.valeur : t.valeur;
          const vr = h ? h.var : t.var;
          const hausse = h ? h.hausse : t.hausse;
          return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${t.nom}')"` : ''}>
          <div class="index-name index-name-taux">
            ${t.nom}
            ${t.nom.indexOf('CMS') !== -1 ? `<button class="btn-pencil" onclick="event.stopPropagation();App.ouvrirEditionCMS()" title="Mettre à jour">✎</button>` : ''}
          </div>
          <div class="index-val tnum">${valeur || '—'}</div>
          <div class="taux-var tnum ${hausse === null ? 'flat' : hausse ? 'up' : 'down'}">${vr || ''}</div>
          ${t.manuel && t.dateMaj ? `<div class="taux-maj">${t.dateMaj}</div>` : ''}
        </div>`; }).join('')}
      </div>

      <!-- Événements macro pleine largeur -->
      <div class="card p-18 mb-24">
        <div class="card-title mb-12">Prochains événements macro</div>
        <div class="events-grid">
          ${prochainsEvenementsMacro(6).map(e => { const dl = e.d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); return `
          <div class="event-item">
            <div class="event-date tnum${e.important ? ' important' : ''}">${dl}</div>
            <div class="event-label">${e.label}</div>
            ${e.zone ? `<span class="zone-flag"><span class="fi fi-${({FR:'fr',UE:'eu',US:'us',DE:'de',UK:'gb',JP:'jp',CN:'cn'}[e.zone]||'un')} fis"></span></span>` : ''}
          </div>`; }).join('')}
        </div>
      </div>

      <!-- Prochaines dates clés — pleine largeur -->
      <div class="card p-18">
        <div class="flex-sb mb-12">
          <div>
            <div class="card-title">Prochaines dates clés</div>
            <div style="font-size:11px;color:#9a8f7a;margin-top:3px;">Produits structurés · 60 prochains jours</div>
          </div>
          <span class="voir-lien" onclick="App.goto('prod')">Tout voir →</span>
        </div>
        ${prochainsDates.length === 0
          ? `<div style="font-size:12.5px;color:#9a8f7a;padding:8px 0;">Aucune constatation dans les 60 prochains jours.</div>`
          : `<div class="dates-cles-table">
          <div class="dates-cles-header">
            <span>Date</span><span class="col-right">Dans</span><span>Produit</span><span class="col-right">Statut</span>
          </div>
          ${prochainsDates.map(({ p, d, jours }) => `
          <div class="dates-cles-row" onclick="App.voirDetail('${p.isin}')">
            <span class="tnum dates-cles-date">${fmtDateCle(d)}</span>
            <span class="tnum dates-cles-jours${jours <= 14 ? ' proche' : ''}">${jours}j</span>
            <span class="dates-cles-nom">${p.nom.replace('Conservateur ', 'C. ')}</span>
            <span class="col-right"><span class="badge ${p.k}">${p.statut}</span></span>
          </div>`).join('')}
        </div>`}
      </div>
    </div>
  </div>`;
}

function renderProduits(produits, state) {
  const q = (state.q || '').trim().toLowerCase();
  const f = state.filter || 'tous';
  const catActive = state.cat || null;
  let rows = f === 'tous' ? produits : produits.filter(r => r.k === f);
  if (catActive) rows = rows.filter(r => categorieProduit(r) === catActive);
  if (q) rows = rows.filter(r => (r.nom + ' ' + r.isin + ' ' + r.sj).toLowerCase().includes(q));

  const count = k => produits.filter(r => r.k === k).length;

  const chips = [
    { key:'tous',   label:`Tous (${produits.length})` },
    { key:'green',  label:'Rappel probable' },
    { key:'orange', label:'Surveillance' },
    { key:'red',    label:'Risque' },
  ];

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Autocalls · Produits structurés</div>
        <div class="page-sub">${produits.length} produits suivis</div>
      </div>
      <div class="header-actions">
        <button class="btn-primary" onclick="App.ouvrirFormulaire()">+ Ajouter un produit</button>
      </div>
    </header>

    <div style="padding:18px 30px 40px;">
      <div class="summary-chips">
        <div class="card chip-card green${f==='green'?' active':''}" onclick="App.setFilter('${f==='green'?'tous':'green'}')"><div class="chip-card-label">Rappel probable</div><div class="chip-card-val tnum">${count('green')}</div></div>
        <div class="card chip-card orange${f==='orange'?' active':''}" onclick="App.setFilter('${f==='orange'?'tous':'orange'}')"><div class="chip-card-label">Sous surveillance</div><div class="chip-card-val tnum">${count('orange')}</div></div>
        <div class="card chip-card red${f==='red'?' active':''}" onclick="App.setFilter('${f==='red'?'tous':'red'}')"><div class="chip-card-label">En risque</div><div class="chip-card-val tnum">${count('red')}</div></div>
      </div>

      <div class="cat-block">
        <div class="section-label mb-12">Sous-jacents par catégorie</div>
        <div class="cat-grid">
          ${grouperCategories(produits).map(c => `
          <div class="card cat-card${catActive === c.cat ? ' active' : ''}" onclick="App.setCat('${c.cat}')">
            <div class="cat-card-nom">${c.cat}</div>
            <div class="cat-card-meta">${c.n} produit${c.n > 1 ? 's' : ''}</div>
            <div class="cat-card-sj">${c.sjLabels}</div>
          </div>`).join('')}
        </div>
      </div>


<div class="products-table-wrap">
        <div class="products-table">
          <div class="products-table-header">
            <span>Nom commercial</span>
            <span>Prochaine const.</span>
            <span class="col-right">Coupon</span>
            <span class="col-landscape col-right">Strike</span>
            <span class="col-center">% Strike</span>
            <span class="col-center">B. Coupon</span>
            <span class="col-center">B. Autocall</span>
            <span class="col-landscape">Statut</span>
          </div>
          ${rows.map(r => {
            const niveauPct = (r.type === 'equity' && r.strikeNum && r.niveauNum)
              ? (r.niveauNum / r.strikeNum * 100) : null;
            // CMS : on affiche directement le CMS 10 ans, coloré selon sa position vs la barrière
            // de coupon (rappelé/coupon si le taux passe sous la barrière). Vert = bon (sous la
            // barrière), orange = presque (juste au-dessus), rouge = au-dessus.
            let pctStr, pctCouleur;
            if (niveauPct != null) {
              pctStr = niveauPct.toFixed(1) + ' %';
              if (r.bAutoNum != null && niveauPct >= r.bAutoNum) pctCouleur = 'green';
              else if (r.bCouponNum != null && niveauPct >= r.bCouponNum) pctCouleur = 'orange';
              else pctCouleur = 'red';
            } else if (r.type === 'cms' && r.bCouponNum) {
              const niv = parseFloat(String(r.niveau).replace(/[^0-9,.-]/g, '').replace(',', '.'));
              if (isFinite(niv)) {
                pctStr = niv.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
                // Vert si le CMS est au niveau du strike (barrière coupon) ou en dessous ;
                // orange jusqu'à 0,15 pt au-dessus ; rouge au-delà.
                const d = niv - r.bCouponNum;
                pctCouleur = d <= 0 ? 'green' : d <= 0.15 ? 'orange' : 'red';
              } else { pctStr = '—'; pctCouleur = null; }
            } else { pctStr = '—'; pctCouleur = null; }
            const barrCell = (val, pct, estBaisse) => {
              if (!val || val === '—' || val === 'NA') return '<span style="color:#b5ab95">—</span>';
              const prefix = estBaisse ? '−' : '';
              const c = (niveauPct != null && pct != null) ? barrierCouleur(niveauPct, pct, estBaisse) : r.k;
              return `<span class="barrier-badge ${c}">${prefix}${val}</span>`;
            };
            return `
          <div class="products-table-row">
            <span class="col-nom" onclick="App.voirDetail('${r.isin}')">
              <span class="col-nom-text">${abregerMois(r.nom.replace('Conservateur ', 'C. '))}</span>
              <span class="col-nom-hint">voir détail</span>
            </span>
            <span class="tnum col-dim" style="font-size:11.5px;">${r.constat}</span>
            <span class="tnum col-right">${r.coupon}</span>
            <span class="col-landscape tnum col-right" style="font-size:11.5px;">${r.strike || '—'}</span>
            <span class="col-center tnum">
              ${pctCouleur ? `<span class="barrier-badge ${pctCouleur}">${pctStr}</span>` : `<span style="color:#b5ab95">${pctStr}</span>`}
            </span>
            <span class="col-center">${barrCell(r.bCoupon, r.bCouponNum, false)}</span>
            <span class="col-center">${barrCell(r.bAuto, r.bAutoNum, r.estBaisse)}</span>
            <span class="col-landscape"><span class="badge ${r.k}">${r.statut}</span></span>
          </div>`;
          }).join('')}
        </div>
      </div>
      <div class="table-note">Données indicatives · validation humaine obligatoire.</div>
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
    </header>

    <div class="page-body">
      <div class="card alloc-intro mb-18">
        <div class="card-title mb-12" style="font-size:16px;">Contexte économique</div>
        <p>Désinflation confirmée en zone euro (2,1 %), permettant à la BCE de maintenir un biais accommodant mesuré. Croissance modérée mais résiliente, soutenue par la consommation. Aux États-Unis, la Fed reste prudente face à une inflation collante. Les marchés actions évoluent près de leurs plus hauts ; la pentification des courbes profite aux produits de taux. Environnement globalement porteur pour les structures de rappel, sous réserve de la volatilité bancaire européenne.</p>
      </div>

      <div class="grid-3 mb-18">
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header"><div class="card-title">Actions</div><span class="alloc-badge favorable">Favorable</span></div>
          <p class="alloc-asset-body">Indices proches des plus hauts. Préférence pour les grandes capitalisations européennes de qualité. Banques EU volatiles — vigilance sur les sous-jacents bancaires des CAP.</p>
        </div>
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header"><div class="card-title">Obligations</div><span class="alloc-badge neutre">Neutre +</span></div>
          <p class="alloc-asset-body">Portage attractif sur le 10 ans souverain. Pentification favorable aux autocalls indexés CMS. Sensibilité au calendrier BCE/Fed.</p>
        </div>
        <div class="card alloc-asset-card">
          <div class="alloc-asset-header"><div class="card-title">Monétaire</div><span class="alloc-badge baisse">Rendement en baisse</span></div>
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
        <div class="page-sub">Actualités marchés, taux & patrimoine</div>
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

function renderDetail(produit) {
  const typLabel = produit.type === 'equity' ? 'Actions' : 'Taux (CMS)';
  const canDelete = produit.id != null;

  return `
  <div>
    <header class="page-header">
      <div style="display:flex;align-items:center;gap:16px;">
        <button class="btn-back" onclick="App.fermerDetail()">← Retour</button>
        <div>
          <div class="page-title">${escHtml(produit.nom)}</div>
          <div class="page-sub">${escHtml(produit.isin)} · ${typLabel}</div>
        </div>
      </div>
    </header>

    <div style="padding:18px 30px 40px;">
      <div class="detail-status-row">
        <span class="badge ${produit.k} badge-lg">${produit.statut}</span>
        ${produit.zoneAutocall === 'OUI' ? `<span class="detail-autocall-tag">Zone autocall franchie</span>` : ''}
      </div>

      <div class="detail-grid">
        <div class="card p-18">
          <div class="card-title mb-12">Identification</div>
          <div class="detail-rows">
            <div class="detail-row"><span class="detail-key">Code ISIN</span><span class="detail-val tnum">${escHtml(produit.isin)}</span></div>
            <div class="detail-row"><span class="detail-key">Nom commercial</span><span class="detail-val">${escHtml(produit.nom)}</span></div>
            <div class="detail-row"><span class="detail-key">Sous-jacent</span><span class="detail-val">${escHtml(produit.sj)}</span></div>
            <div class="detail-row"><span class="detail-key">Type de produit</span><span class="detail-val">${typLabel}</span></div>
            <div class="detail-row"><span class="detail-key">Coupon annuel</span><span class="detail-val tnum">${escHtml(produit.coupon)}</span></div>
          </div>
        </div>

        <div class="card p-18">
          <div class="card-title mb-12">Niveaux de marché</div>
          <div class="detail-rows">
            ${produit.type === 'equity' ? `
            <div class="detail-row"><span class="detail-key">Strike initial</span><span class="detail-val tnum">${escHtml(produit.strike)}</span></div>
            <div class="detail-row"><span class="detail-key">Niveau actuel</span><span class="detail-val tnum">${escHtml(produit.niveau)}</span></div>
            <div class="detail-row">
              <span class="detail-key">% du strike</span>
              <span class="detail-val tnum" style="font-weight:600;color:${produit.k==='red'?'#9a3535':produit.k==='orange'?'#b06a1a':'#1d6f4c'};">${escHtml(produit.pct)}</span>
            </div>` : `
            <div class="detail-row"><span class="detail-key">Taux CMS 10 ans</span><span class="detail-val tnum">${escHtml(produit.niveau)}</span></div>`}
            <div class="detail-row"><span class="detail-key">Barrière autocall</span><span class="detail-val tnum">${escHtml(produit.bAuto)}</span></div>
            <div class="detail-row"><span class="detail-key">Barrière coupon</span><span class="detail-val tnum">${escHtml(produit.bCoupon)}</span></div>
            <div class="detail-row">
              <span class="detail-key">Zone autocall</span>
              <span class="detail-val">${produit.zoneAutocall === 'OUI' ? '<span style="color:#1d6f4c;font-weight:600;">OUI ✓</span>' : 'NON'}</span>
            </div>
          </div>
        </div>

        <div class="card p-18">
          <div class="card-title mb-12">Dates clés</div>
          <div class="detail-rows">
            <div class="detail-row"><span class="detail-key">Prochaine constatation</span><span class="detail-val tnum">${escHtml(produit.constat)}</span></div>
            <div class="detail-row"><span class="detail-key">Échéance finale</span><span class="detail-val tnum">${escHtml(produit.ech)}</span></div>
          </div>
        </div>
      </div>

      <div class="detail-note">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
    </div>
  </div>`;
}

function renderFormulaireAjout() {
  return `
  <div class="modal-overlay" onclick="if(event.target===this)App.fermerFormulaire()">
    <div class="modal-panel">
      <div class="modal-header">
        <div class="modal-title">Ajouter un produit structuré</div>
        <button class="modal-close" onclick="App.fermerFormulaire()">✕</button>
      </div>
      <div class="modal-body">
        <form id="form-ajout" onsubmit="App.soumettreFormulaire(event)">
          <div class="form-section-label">Identification</div>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="f-isin">Code ISIN <span class="form-req">*</span></label>
              <input id="f-isin" name="isin" placeholder="FR001400XXXX" required maxlength="12" style="text-transform:uppercase;">
            </div>
            <div class="form-field">
              <label for="f-type">Type de produit <span class="form-req">*</span></label>
              <select id="f-type" name="typeProduit" onchange="App.toggleStrikeField(this.value)">
                <option value="equity">Actions (equity)</option>
                <option value="cms">Taux (CMS)</option>
              </select>
            </div>
          </div>
          <div class="form-field">
            <label for="f-nom">Nom commercial <span class="form-req">*</span></label>
            <input id="f-nom" name="nom" placeholder="Ex : Conservateur Autocall CAC 90% Déc 2026" required>
          </div>

          <div class="form-section-label">Sous-jacent</div>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="f-sj">Ticker Yahoo Finance <span class="form-req">*</span></label>
              <input id="f-sj" name="sousJacent" placeholder="Ex : ^STOXX50E, SX7E.PA" required>
            </div>
            <div class="form-field">
              <label for="f-sjlabel">Libellé affiché <span class="form-req">*</span></label>
              <input id="f-sjlabel" name="sousJacentLabel" placeholder="Ex : Euro Stoxx 50" required>
            </div>
          </div>

          <div class="form-section-label">Caractéristiques financières</div>
          <div class="form-grid-3">
            <div class="form-field">
              <label for="f-coupon">Coupon (%) <span class="form-req">*</span></label>
              <input id="f-coupon" name="coupon" type="number" step="0.01" min="0" placeholder="6.00" required>
            </div>
            <div class="form-field" id="field-strike">
              <label for="f-strike">Strike initial</label>
              <input id="f-strike" name="strike" type="number" step="0.01" placeholder="7 346">
            </div>
            <div class="form-field">
              <label for="f-bauto">Barrière autocall (%) <span class="form-req">*</span></label>
              <input id="f-bauto" name="barriereAutocall" type="number" step="0.01" min="0" placeholder="100" required>
            </div>
            <div class="form-field">
              <label for="f-bcoupon">Barrière coupon (%)</label>
              <input id="f-bcoupon" name="barriereCoupon" type="number" step="0.01" min="0" placeholder="80">
            </div>
          </div>

          <div class="form-section-label">Dates</div>
          <div class="form-grid-2">
            <div class="form-field">
              <label for="f-constat">Prochaine constatation <span class="form-req">*</span></label>
              <input id="f-constat" name="constat" placeholder="Ex : 13/07/2026" required>
            </div>
            <div class="form-field">
              <label for="f-ech">Échéance finale <span class="form-req">*</span></label>
              <input id="f-ech" name="echeance" type="date" required>
            </div>
          </div>

          <div id="form-error" class="form-error" style="display:none;"></div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="App.fermerFormulaire()">Annuler</button>
        <button type="submit" form="form-ajout" class="btn-primary" id="form-submit">Enregistrer le produit</button>
      </div>
    </div>
  </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Catégories de produits (CAP, Autocall CMS, Athena…) ──
function categorieProduit(p) {
  const n = p.nom || '';
  if (/^CAP\b/i.test(n))       return 'CAP';
  if (/Autocall CMS/i.test(n)) return 'Autocall CMS';
  if (/Athena/i.test(n))       return 'Athena';
  if (/Autocall/i.test(n))     return 'Autocall indice';
  return 'Autres';
}

// Regroupe les produits par catégorie (ordre d'apparition conservé).
function grouperCategories(produits) {
  const map = new Map();
  produits.forEach(p => {
    const c = categorieProduit(p);
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(p);
  });
  return [...map.entries()].map(([cat, membres]) => ({
    cat, membres, n: membres.length,
    sjLabels: [...new Set(membres.map(m => m.sjLabel || m.sj))].join(', '),
  }));
}

// Modale : liste des membres d'une catégorie. Clic sur un membre → graphique.
function renderModalCategorie(cat, membres) {
  return `
  <div class="modal-overlay" onclick="if(event.target===this)App.fermerModal()">
    <div class="modal-panel modal-panel--sm">
      <div class="modal-header">
        <span class="modal-title">${escHtml(cat)}</span>
        <button class="modal-close" onclick="App.fermerModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="cat-membres">
          ${membres.map(m => `
          <div class="cat-membre" onclick="App.ouvrirGraphiqueProduit('${m.isin}')">
            <div class="cat-membre-info">
              <div class="cat-membre-nom">${escHtml(m.nom)}</div>
              <div class="cat-membre-sj">${escHtml(m.sjLabel || m.sj)}${m.strike && m.strike !== 'NA' ? ' · strike ' + escHtml(String(m.strike)) : ''}</div>
            </div>
            <span class="cat-membre-go">graphique →</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderModalEditionCMS(valeurActuelle) {
  const placeholder = valeurActuelle ? String(valeurActuelle).replace(',', '.') : '3.15';
  return `
  <div class="modal-overlay" onclick="if(event.target===this)App.fermerEditionCMS()">
    <div class="modal-panel modal-panel--sm">
      <div class="modal-header">
        <span class="modal-title">CMS 10 ans — EUR IRS 10Y</span>
        <button class="modal-close" onclick="App.fermerEditionCMS()">✕</button>
      </div>
      <div class="modal-body">
        <p class="cms-modal-hint">EUR 10Y Interest Rate Swap · Source : Bloomberg / Reuters<br>Saisir le taux en pourcentage (ex : 3,15 pour 3,15 %).</p>
        <div class="form-field">
          <label>Nouveau taux (%)</label>
          <input id="cms-input" type="number" step="0.01" min="0" max="20"
                 placeholder="${placeholder}" autofocus
                 onkeydown="if(event.key==='Enter')App.soumettreEditionCMS()">
        </div>
        <div id="cms-error" style="color:#9a3535;font-size:12px;margin-top:4px;display:none;"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="App.fermerEditionCMS()">Annuler</button>
        <button class="btn-primary" onclick="App.soumettreEditionCMS()">Enregistrer</button>
      </div>
    </div>
  </div>`;
}

// ── Page F€ & UC ──
function renderContrats(state) {
  function srriDots(n) {
    const filled = Math.max(0, Math.min(7, n));
    let s = '';
    for (let i = 1; i <= 7; i++) s += `<span class="srri-dot${i <= filled ? ' on' : ''}"></span>`;
    return `<span class="srri-bar">${s}</span>`;
  }

  const perf   = typeof FONDS_EUROS_PERF !== 'undefined' ? FONDS_EUROS_PERF : null;
  const uc     = typeof UC_CATALOGUE    !== 'undefined' ? UC_CATALOGUE    : [];
  const ucCat  = (state && state.ucCat) || null;

  // Regroupement des catégories UC en 4 groupes d'affichage
  const CAT_MAP = {
    'Actions thématique':  'Actions thématique',
    'Actions Monde':       'Actions',
    'Actions Europe':      'Actions',
    'Flexible':            'Mixte / Flexible',
    'Mixte / Flexible':    'Mixte / Flexible',
    'Mixte obligataire':   'Obligataire',
    'Obligataire flexible':'Obligataire',
  };
  const CATS_ORDER = ['Actions thématique', 'Actions', 'Mixte / Flexible', 'Obligataire'];
  const nCsr = uc.filter(u => u.nom.includes('Conservateur')).length;
  const ucFiltrees = ucCat === 'Conservateur'
    ? uc.filter(u => u.nom.includes('Conservateur'))
    : ucCat ? uc.filter(u => CAT_MAP[u.categorie] === ucCat) : uc;

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Fonds € &amp; UC</div>
        <div class="page-sub">Fonds en euros · Unités de compte · Le Conservateur</div>
      </div>
    </header>

    <div class="page-body">

      ${perf ? `
      <!-- ── Fonds en euros ── -->
      <div class="flex-sb mb-12">
        <span class="section-label">Fonds en euros · Taux ${perf.annee}</span>
      </div>
      <div class="card p-18 mb-24">
        <div class="fe-contrats mb-16">
          Applicable aux contrats : <strong>${perf.contrats.join(' · ')}</strong>
        </div>

        <div class="fe-perf-table mb-16">
          <div class="fe-perf-head">
            <div class="fe-col-uc">% investi en UC</div>
            <div class="fe-col-rate">&lt; 150 000 €</div>
            <div class="fe-col-rate">≥ 150 000 €</div>
          </div>
          ${perf.tranches.map((t, i) => `
          <div class="fe-perf-row${i % 2 === 1 ? ' alt' : ''}">
            <div class="fe-col-uc">${t.label}</div>
            <div class="fe-col-rate tnum fe-rate${i === 0 ? ' best' : ''}">${t.inf150}</div>
            <div class="fe-col-rate tnum fe-rate${i === 0 ? ' best' : ''}">${t.sup150}</div>
          </div>`).join('')}
        </div>

        <div style="font-size:11px;color:#b5ab95;margin-top:4px;">Nets de frais de gestion · avant prélèvements sociaux et fiscaux</div>
      </div>` : ''}

      <!-- ── Unités de compte ── -->
      <div class="flex-sb mb-12">
        <span class="section-label">Unités de compte suivies</span>
        <span class="section-hint">${uc.length} UC · cliquer pour le graphique</span>
      </div>

      <div class="cat-block">
        <div class="cat-grid uc-cat-grid">
          <div class="card cat-card cat-card-csr${ucCat === 'Conservateur' ? ' active' : ''}" onclick="App.setUcCat('Conservateur')">
            <div class="cat-card-csr-icon">C</div>
            <div class="cat-card-nom">Conservateur</div>
            <div class="cat-card-meta">${nCsr} fonds</div>
          </div>
          ${CATS_ORDER.map(cat => {
            const n = uc.filter(u => CAT_MAP[u.categorie] === cat).length;
            return `<div class="card cat-card${ucCat === cat ? ' active' : ''}" onclick="App.setUcCat('${cat}')">
              <div class="cat-card-nom">${cat}</div>
              <div class="cat-card-meta">${n} fonds</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="uc-liste">
        ${ucFiltrees.map(u => `
        <div class="uc-item${u.graphId ? ' clic' : ''}"${u.graphId ? ` onclick="App.ouvrirGraphiqueUC('${u.isin}')"` : ''}>
          <div class="uc-item-haut">
            <span class="uc-item-rang tnum">${u.rang}</span>
            <div class="uc-item-id">
              <div class="uc-item-nom">${u.nom}</div>
              <div class="uc-item-isin tnum">${u.isin}</div>
            </div>
            ${u.graphId ? `<span class="uc-item-go">graphique →</span>` : `<span class="uc-item-go muted">indisponible</span>`}
          </div>
          <div class="uc-item-bas">
            <span class="uc-cat-badge">${u.categorie}</span>
            <span class="uc-expo">Actions ${u.equity} %</span>
            ${srriDots(u.srri)}
          </div>
        </div>`).join('')}
      </div>

      <div class="table-note mt-16">Taux FE nets de frais de gestion · performances UC indicatives · sources internes.</div>
    </div>
  </div>`;
}
