// ── Fonctions de rendu des 4 pages ──
// Chaque fonction accepte les données en paramètre (API ou statiques).

function renderDashboard(indices, produits, taux) {
  taux = taux || TAUX;
  // Priorité d'affichage : risque > surveillance > rappel probable
  const top6 = [...produits]
    .sort((a, b) => {
      const ord = { red: 0, orange: 1, green: 2 };
      return ord[a.k] - ord[b.k];
    })
    .slice(0, 6);

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
      <div class="header-actions">
        <div class="search-box">
          <span style="font-size:13px;">⌕</span>
          <input id="dash-search" placeholder="Rechercher un produit, un indice…">
        </div>
        <button class="btn-primary">Générer une synthèse conseiller</button>
        <button class="btn-secondary">Export PDF</button>
      </div>
    </header>

    <div class="page-body">
      <!-- Indices -->
      <div class="flex-sb mb-12">
        <span class="section-label">Indices clés</span>
      </div>
      <div class="grid-5 mb-24">
        ${indices.map(i => `
        <div class="card index-card${i.ticker ? ' index-clic' : ''}"${i.ticker ? ` onclick="App.ouvrirGraphique('${i.ticker}','${i.nom}')"` : ''}>
          <div class="index-name">${i.nom}</div>
          <div class="index-val tnum">${i.valeur}</div>
          ${i.var != null
            ? `<div class="index-var tnum ${i.hausse ? 'up' : 'down'}">${i.hausse ? '▲' : '▼'} ${i.var}</div>`
            : `<div class="index-var tnum" style="color:#9a8f7a;">—</div>`
          }
        </div>`).join('')}
      </div>

      <!-- Taux + Macro -->
      <div class="grid-2-narrow mb-24">
        <div class="card p-18">
          <div class="card-title mb-12">Taux & obligations</div>
          <div class="taux-grid">
            ${taux.map(t => `
            <div>
              <div class="taux-item-name">
                ${t.nom}
                ${t.nom === 'CMS 10 ans' ? `<button class="btn-pencil" onclick="App.ouvrirEditionCMS()" title="Mettre à jour">✎</button>` : ''}
              </div>
              <div class="taux-val tnum">${t.valeur}</div>
              <div class="taux-var tnum ${t.hausse === null ? 'flat' : t.hausse ? 'up' : 'down'}">${t.var}</div>
              ${t.manuel && t.dateMaj ? `<div class="taux-maj">saisie du ${t.dateMaj}</div>` : ''}
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

      <!-- Alertes + Autocalls + Événements -->
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
              <span>% strike</span>
              <span>Prochaine const.</span>
              <span>Statut</span>
            </div>
            ${top6.map(p => `
            <div class="autocall-row">
              <span style="color:#16304f;font-weight:500;">${p.nom}</span>
              <span style="color:#6b6e73;">${p.sj}</span>
              <span class="tnum" style="font-weight:600;color:${p.k==='red'?'#9a3535':p.k==='orange'?'#b06a1a':'#6b6e73'};">${p.pct}</span>
              <span class="tnum" style="color:#6b6e73;">${p.constat}</span>
              <span><span class="badge ${p.k}">${p.statut}</span></span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderProduits(produits, state) {
  const q = (state.q || '').trim().toLowerCase();
  const f = state.filter || 'tous';
  let rows = f === 'tous' ? produits : produits.filter(r => r.k === f);
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
        <div class="page-title">Produits structurés · Autocalls</div>
        <div class="page-sub">${produits.length} produits suivis</div>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span style="font-size:13px;">⌕</span>
          <input id="prod-search" placeholder="ISIN, nom, sous-jacent…" value="${escHtml(state.q||'')}"
                 oninput="App.prodSearch(this.value)">
        </div>
        <button class="btn-primary" onclick="App.ouvrirFormulaire()">+ Ajouter un produit</button>
        <button class="btn-secondary">Export PDF</button>
      </div>
    </header>

    <div style="padding:18px 30px 40px;">
      <div class="summary-chips">
        <div class="card chip-card"><div class="chip-card-label">Produits suivis</div><div class="chip-card-val tnum">${produits.length}</div></div>
        <div class="card chip-card green"><div class="chip-card-label">Rappel probable</div><div class="chip-card-val tnum">${count('green')}</div></div>
        <div class="card chip-card orange"><div class="chip-card-label">Sous surveillance</div><div class="chip-card-val tnum">${count('orange')}</div></div>
        <div class="card chip-card red"><div class="chip-card-label">En risque</div><div class="chip-card-val tnum">${count('red')}</div></div>
      </div>

      <div class="cat-block">
        <div class="section-label mb-12">Sous-jacents par catégorie</div>
        <div class="cat-grid">
          ${grouperCategories(produits).map(c => `
          <div class="card cat-card" onclick="App.ouvrirCategorie('${c.cat}')">
            <div class="cat-card-nom">${c.cat}</div>
            <div class="cat-card-meta">${c.n} produit${c.n > 1 ? 's' : ''}</div>
            <div class="cat-card-sj">${c.sjLabels}</div>
          </div>`).join('')}
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-chips">
          ${chips.map(c => `<div class="filter-chip${f===c.key?' active':''}" onclick="App.setFilter('${c.key}')">${c.label}</div>`).join('')}
        </div>
      </div>

      <!-- Vue tableau (desktop) -->
      <div class="products-table-wrap scroll">
        <div class="products-table">
          <div class="products-table-header products-table-row--slim">
            <span>Nom commercial</span><span>Sous-jacent</span>
            <span class="col-right">Coupon</span>
            <span class="col-right">% strike</span>
            <span class="col-center">Autocall</span>
            <span class="col-center">Coupon versé</span>
            <span>Proch. const.</span><span>Échéance</span>
            <span>Statut</span><span></span>
          </div>
          ${rows.map(r => {
            const cv = couponVerse(r);
            const pctColor = r.type==='equity' ? (r.k==='red'?'#9a3535':r.k==='orange'?'#b06a1a':'#1d6f4c') : '#9a8f7a';
            return `
          <div class="products-table-row products-table-row--slim">
            <span class="col-nom">${r.nom}</span>
            <span class="col-sj">${r.sj}</span>
            <span class="tnum col-right">${r.coupon}</span>
            <span class="tnum col-right" style="font-weight:600;color:${pctColor};">${r.pct}</span>
            <span class="col-center">${r.zoneAutocall==='OUI' ? '<span class="oui">✓</span>' : '<span class="non">—</span>'}</span>
            <span class="col-center">${cv===true ? '<span class="oui">✓</span>' : cv===false ? '<span class="non">—</span>' : '<span class="na">NA</span>'}</span>
            <span class="tnum col-dim" style="font-size:11.5px;">${r.constat}</span>
            <span class="tnum col-dim" style="font-size:11.5px;">${r.ech}</span>
            <span><span class="badge ${r.k}">${r.statut}</span></span>
            <span class="col-detail" onclick="App.voirDetail('${r.isin}')">Détail →</span>
          </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Vue cartes accordéon (mobile) -->
      <div class="prod-cards">
        ${rows.map(r => renderProduitCard(r)).join('')}
      </div>

      <div class="table-note">% strike = niveau du sous-jacent rapporté au strike initial (indicatif). Produits CMS exprimés en taux. Validation humaine obligatoire.</div>
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
      <div class="header-actions">
        ${canDelete
          ? `<button class="btn-danger" onclick="App.supprimerProduit(${produit.id})">Supprimer ce produit</button>`
          : `<span class="detail-hint">Suppression disponible avec les données API</span>`}
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

// Retourne true si le coupon est versé, false si barrière non atteinte, null si non applicable.
function couponVerse(r) {
  if (!r.bCoupon || r.bCoupon === '—' || r.bCoupon === 'NA') return null;
  if (r.type === 'cms') {
    const b = parseFloat(r.bCoupon.replace(/[^0-9,\.]/g, '').replace(',', '.'));
    const n = parseFloat((r.niveau || '').replace(/[^0-9,\.]/g, '').replace(',', '.'));
    return (!isNaN(b) && !isNaN(n)) ? n >= b : null;
  }
  const b = parseFloat(r.bCoupon.replace(/[^0-9,\.]/g, '').replace(',', '.'));
  return (!isNaN(b) && r.strikeNum && r.niveauNum) ? r.niveauNum >= r.strikeNum * (b / 100) : null;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Carte produit accordéon (vue mobile) ──
function renderProduitCard(r) {
  const pctColor = r.type === 'equity'
    ? (r.k === 'red' ? 'red' : r.k === 'orange' ? 'orange' : 'green')
    : '';

  const details = r.type === 'equity' ? `
    <div><div class="pcard-key">Niveau actuel</div><div class="pcard-val tnum">${escHtml(r.niveau)}</div></div>
    <div><div class="pcard-key">% du strike</div><div class="pcard-val tnum ${pctColor}">${escHtml(r.pct)}</div></div>
    <div><div class="pcard-key">Proch. const.</div><div class="pcard-val tnum">${escHtml(r.constat)}</div></div>
    <div><div class="pcard-key">Barrière auto.</div><div class="pcard-val tnum">${escHtml(r.bAuto)}</div></div>
    <div><div class="pcard-key">Échéance</div><div class="pcard-val tnum">${escHtml(r.ech)}</div></div>
    ${r.zoneAutocall === 'OUI' ? `<div><div class="pcard-key">Zone autocall</div><div class="pcard-val green">Franchie ✓</div></div>` : ''}
  ` : `
    <div><div class="pcard-key">CMS actuel</div><div class="pcard-val tnum">${escHtml(r.niveau)}</div></div>
    <div><div class="pcard-key">Barrière auto.</div><div class="pcard-val tnum">${escHtml(r.bAuto)}</div></div>
    <div><div class="pcard-key">Barrière coupon</div><div class="pcard-val tnum">${escHtml(r.bCoupon)}</div></div>
    <div><div class="pcard-key">Proch. const.</div><div class="pcard-val tnum">${escHtml(r.constat)}</div></div>
    <div><div class="pcard-key">Échéance</div><div class="pcard-val tnum">${escHtml(r.ech)}</div></div>
  `;

  return `
  <div class="prod-card" data-k="${r.k}" data-isin="${escHtml(r.isin)}" onclick="toggleCard('${escHtml(r.isin)}')">
    <div class="pcard-top">
      <div class="pcard-left">
        <div class="pcard-nom">${escHtml(r.nom)}</div>
        <div class="pcard-meta">${escHtml(r.sjLabel || r.sj)} · ${escHtml(r.coupon)}</div>
      </div>
      <div class="pcard-right">
        <span class="badge ${r.k}">${escHtml(r.statut)}</span>
        <span class="pcard-chevron">›</span>
      </div>
    </div>
    <div class="pcard-body">
      <div class="pcard-grid">${details}</div>
      <button class="pcard-link" onclick="event.stopPropagation();App.voirDetail('${escHtml(r.isin)}')">Voir le détail →</button>
    </div>
  </div>`;
}

function toggleCard(isin) {
  const card = document.querySelector(`.prod-card[data-isin="${isin}"]`);
  if (card) card.classList.toggle('open');
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
