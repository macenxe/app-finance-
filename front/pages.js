// ── Fonctions de rendu des 4 pages ──
// Chaque fonction accepte les données en paramètre (API ou statiques).

function perfBadge(isin, ucPerfs) {
  const v = ucPerfs ? ucPerfs[isin] : null;
  if (v == null) return `<span class="uc-item-perf">—</span>`;
  const up = v >= 0;
  const label = (up ? '+' : '') + v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  return `<span class="uc-item-perf ${up ? 'up' : 'dn'}">${label}</span>`;
}

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
    .replace(/\bConservateur\s+/g, '')
    .replace(/\bLC\s+/g, '')
    .replace(/\bAutocall\s+/g, '')
    .replace(/\bAthena\s+/g, 'Ath. ')
    .replace(/\b(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre|Jan|Fév|Mar|Avr|Juil|Aoû|Sep|Oct|Nov|Déc)\s+(\d{4})\b/g,
      (_, mois, annee) => `${m[mois]}/${annee.slice(2)}`);
}

function abregerDate(s) {
  if (!s) return s;
  return s.replace('1er j./mois', 'j./mois').replace(/\d{2}(\d{2})$/, '$1');
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
          ${prochainsDates.map(({ p, d, jours }) => {
            const couponColor = p.bCouponNum != null ? (p.couponAtteint ? 'green' : 'red') : null;
            const autoColor   = p.zoneAutocall === 'OUI' ? 'green' : 'red';
            const cPill = couponColor != null ? `<span class="statut-pill ${couponColor}">Coupon</span>` : '';
            const rPill = `<span class="statut-pill ${autoColor}">Rappel</span>`;
            const statutCell = p.belowProtection
              ? `<span class="badge red">Risque</span>`
              : `<div class="statut-pills">${cPill}${rPill}</div>`;
            return `
          <div class="dates-cles-row" onclick="App.voirDetail('${p.isin}')">
            <span class="tnum dates-cles-date">${fmtDateCle(d)}</span>
            <span class="tnum dates-cles-jours${jours <= 14 ? ' proche' : ''}">${jours}j</span>
            <span class="dates-cles-nom">${abregerMois(p.nom)}</span>
            <span class="col-right">${statutCell}</span>
          </div>`;
          }).join('')}
        </div>`}
      </div>
    </div>
  </div>`;
}

function renderProduits(produits, state) {
  const q = (state.q || '').trim().toLowerCase();
  const f = state.filter || 'tous';
  const catActive = state.cat || null;
  let rows = produits;
  if      (f === 'green')  rows = produits.filter(r => r.zoneAutocall === 'OUI');
  else if (f === 'orange') rows = produits.filter(r => r.couponAtteint === true);
  else if (f === 'red')    rows = produits.filter(r => r.belowProtection === true);
  if (catActive) rows = rows.filter(r => categorieProduit(r) === catActive);
  if (q) rows = rows.filter(r => (r.nom + ' ' + r.isin + ' ' + r.sj).toLowerCase().includes(q));
  const parseConstat = s => { const m = s && s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2]-1, +m[1]) : new Date(0); };
  rows = [...rows].sort((a, b) => parseConstat(a.constat) - parseConstat(b.constat));

  const countVert   = produits.filter(r => r.zoneAutocall === 'OUI').length;
  const countCoupon = produits.filter(r => r.couponAtteint === true).length;
  const countRisque = produits.filter(r => r.belowProtection === true).length;

  const chips = [
    { key:'tous',   label:`Tous (${produits.length})` },
    { key:'green',  label:'Zone Rappel' },
    { key:'orange', label:'Zone Coupon' },
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
      <div class="prod-stat-chips">
        <button class="prod-stat-chip prod-stat-green${f==='green'?' active':''}" onclick="App.setFilter('green')">
          <span class="prod-stat-dot"></span><span class="prod-stat-count">${countVert}</span><span class="prod-stat-label">Zone Rappel</span>
        </button>
        <button class="prod-stat-chip prod-stat-orange${f==='orange'?' active':''}" onclick="App.setFilter('orange')">
          <span class="prod-stat-dot"></span><span class="prod-stat-count">${countCoupon}</span><span class="prod-stat-label">Zone Coupon</span>
        </button>
        <button class="prod-stat-chip prod-stat-red${f==='red'?' active':''}" onclick="App.setFilter('red')">
          <span class="prod-stat-dot"></span><span class="prod-stat-count">${countRisque}</span><span class="prod-stat-label">Risque</span>
        </button>
      </div>

      <div class="prod-chips-sep"></div>

      <div class="uc-chips prod-chips prod-chips-cats">
        ${grouperCategories(produits).map(c => `
        <button class="uc-chip${catActive===c.cat?' active':''}" onclick="App.setCat('${c.cat}')">${c.cat}</button>`).join('')}
      </div>


<div class="products-table-wrap">
        <div class="products-table">
          <div class="products-table-header">
            <span>Nom commercial</span>
            <span>Constat. ↑</span>
            <span class="col-landscape col-right">Strike</span>
            <span class="col-center col-pct">Niveau</span>
            <span class="col-center">Coupon</span>
            <span class="col-center">B. Coupon</span>
            <span class="col-center">B. Auto</span>
            <span class="col-landscape">Statut</span>
          </div>
          ${(() => {
            const MOIS_FR_TAB = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
            const moisClef = s => { const m = s && s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[2]}-${m[3]}` : null; };
            const moisLabel = s => { const m = s && s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${MOIS_FR_TAB[parseInt(m[2])-1]} ${m[3]}` : null; };
            let dernierMois = null;
            return grouperLignes(rows).map(g => {
            const r = g.type === 'group' ? g.ref : g.r;
            const clef = moisClef(r.constat);
            const labelFallback = r.constat && !clef ? 'Constatation mensuelle' : null;
            const sep = clef && clef !== dernierMois
              ? (() => { dernierMois = clef; return `<div class="month-sep"><span>${moisLabel(r.constat)}</span></div>`; })()
              : (!clef && labelFallback && dernierMois !== '__mensuel__')
                ? (() => { dernierMois = '__mensuel__'; return `<div class="month-sep month-sep--info"><span>${labelFallback}</span></div>`; })()
                : '';
            const niveauPct = (r.type === 'equity' && r.strikeNum && r.niveauNum)
              ? (r.niveauNum / r.strikeNum * 100) : null;
            let pctStr, pctCouleur, couponColor, autoColor;
            if (niveauPct != null) {
              if (r.bCouponNum != null) couponColor = (r.estBaisse ? niveauPct <= r.bCouponNum : niveauPct >= r.bCouponNum) ? 'green' : 'red';
              if (r.bAutoNum   != null) autoColor   = (r.estBaisse ? niveauPct <= r.bAutoNum   : niveauPct >= r.bAutoNum)   ? 'green' : 'red';
            } else if (r.type === 'cms') {
              const niv = parseFloat(String(r.niveau).replace(/[^0-9,.-]/g, '').replace(',', '.'));
              if (isFinite(niv)) {
                if (r.bCouponNum != null) couponColor = niv <= r.bCouponNum ? 'green' : 'red';
                if (r.bAutoNum   != null) autoColor   = niv <= r.bAutoNum   ? 'green' : 'red';
              }
            }
            if (autoColor === 'green') pctCouleur = 'green';
            else if (couponColor === 'green') pctCouleur = 'orange';
            else if (autoColor === 'red' || couponColor === 'red') pctCouleur = 'red';
            const barrCell = (val, color, isBaisse = false) => {
              if (!val || val === '—' || val === 'NA') return '<span style="color:#b5ab95">—</span>';
              const c = color || r.k;
              const displayVal = isBaisse ? `-${val}` : val;
              return `<span class="barrier-badge ${c} barr-portrait">${color === 'green' ? 'OUI' : 'NON'}</span>`
                   + `<span class="barrier-badge ${c} barr-landscape">${displayVal}</span>`;
            };
            const niveauBadge = pctCouleur
              ? `<span class="barrier-badge ${pctCouleur}">${r.niveau || '—'}</span>`
              : `<span style="color:#b5ab95">${r.niveau || '—'}</span>`;

            // Vérification barrière de protection (ex : '-70 %' → seuil = strike × 30%)
            let belowProtection = r.belowProtection ?? false;
            if (!r.belowProtection && r.type === 'equity' && r.strikeNum && r.niveauNum && r.protection) {
              const m = String(r.protection).match(/-(\d+)/);
              if (m) belowProtection = r.niveauNum < r.strikeNum * (1 - parseInt(m[1]) / 100);
            }
            const cPill = r.bCouponNum != null
              ? `<span class="statut-pill ${couponColor || 'grey'}">Coupon</span>` : '';
            const rPill = `<span class="statut-pill ${autoColor || (r.zoneAutocall === 'OUI' ? 'green' : 'red')}">Rappel</span>`;
            const statutCell = belowProtection
              ? `<span class="badge red">Risque</span>`
              : `<div class="statut-pills">${cPill}${rPill}</div>`;

            if (g.type === 'group') {
              const groupName = abregerMois(r.nom).replace(/\s+\d{2}\s+/, ' ');
              const cpnVals = g.membres.map(m => parseFloat(String(m.coupon).replace(',', '.'))).filter(v => !isNaN(v));
              const cpnMin = Math.min(...cpnVals), cpnMax = Math.max(...cpnVals);
              const cpnRange = cpnVals.length > 1 && cpnMin !== cpnMax ? `${cpnMin}–${cpnMax} %` : r.coupon;
              return sep + `
          <div class="products-table-row">
            <span class="col-nom" onclick="App.voirDetail('${g.membres[0].isin}')">
              <span class="col-nom-text">${groupName}</span>
            </span>
            <span class="tnum col-dim" style="font-size:11.5px;">${abregerDate(r.constat)}</span>
            <span class="col-landscape tnum col-right" style="font-size:11.5px;">${r.strike || '—'}</span>
            <span class="col-center col-pct tnum">${niveauBadge}</span>
            <span class="tnum col-center">${cpnRange}</span>
            <span class="col-center">${barrCell(r.bCoupon, couponColor)}</span>
            <span class="col-center">${barrCell(r.bAuto, autoColor, r.type === 'equity' && r.estBaisse)}</span>
            <span class="col-landscape">${statutCell}</span>
          </div>`;
            }
            return sep + `
          <div class="products-table-row">
            <span class="col-nom" onclick="App.voirDetail('${r.isin}')">
              <span class="col-nom-text">${abregerMois(r.nom)}</span>
            </span>
            <span class="tnum col-dim" style="font-size:11.5px;">${abregerDate(r.constat)}</span>
            <span class="col-landscape tnum col-right" style="font-size:11.5px;">${r.strike || '—'}</span>
            <span class="col-center col-pct tnum">${niveauBadge}</span>
            <span class="tnum col-center">${r.coupon}</span>
            <span class="col-center">${barrCell(r.bCoupon, couponColor)}</span>
            <span class="col-center">${barrCell(r.bAuto, autoColor, r.type === 'equity' && r.estBaisse)}</span>
            <span class="col-landscape">${statutCell}</span>
          </div>`;
          }).join(''); })()}
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

    <div class="detail-content">
      <div id="detail-chart-inline" class="detail-chart-inline"></div>

      <div class="detail-status-row">
        ${(() => {
          const couponColor = produit.bCouponNum != null ? (produit.couponAtteint ? 'green' : 'red') : null;
          const autoColor = produit.zoneAutocall === 'OUI' ? 'green' : 'red';
          const cPill = couponColor != null ? `<span class="statut-pill ${couponColor}">Coupon</span>` : '';
          const rPill = `<span class="statut-pill ${autoColor}">Rappel</span>`;
          return produit.belowProtection
            ? `<span class="badge red badge-lg">Risque</span>`
            : `<div class="statut-pills">${cPill}${rPill}</div>`;
        })()}
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
            ${produit.protection != null ? `
            <div class="detail-row">
              <span class="detail-key">Protection capital</span>
              <span class="detail-val tnum" style="font-weight:600;color:#1d6f4c;white-space:nowrap;">${escHtml(String(produit.protection))}</span>
            </div>` : ''}
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
  if (/Autocall CMS/i.test(n)) return 'CMS';
  if (/Athena/i.test(n))       return 'Athena';
  if (/Autocall/i.test(n))     return 'CAC';
  return 'Autres';
}

// Regroupe les lignes CAP qui partagent la même date de constatation et d'échéance.
function grouperLignes(rows) {
  const groupes = [];
  const used = new Set();
  rows.forEach((r, i) => {
    if (used.has(i)) return;
    used.add(i);
    if (categorieProduit(r) !== 'CAP') { groupes.push({ type: 'single', r }); return; }
    const membres = [r];
    rows.forEach((r2, j) => {
      if (j <= i || used.has(j)) return;
      if (categorieProduit(r2) === 'CAP' && r2.constat === r.constat && r2.ech === r.ech) {
        membres.push(r2); used.add(j);
      }
    });
    groupes.push(membres.length > 1
      ? { type: 'group', membres, ref: membres[0] }
      : { type: 'single', r: membres[0] });
  });
  return groupes;
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
function renderContrats(state, ucPerfs) {
  ucPerfs = ucPerfs || {};
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
  const hasPerfs = Object.keys(ucPerfs).length > 0;
  const ucFiltrees = (() => {
    const base = ucCat === 'Conservateur'
      ? uc.filter(u => u.nom.includes('Conservateur'))
      : ucCat ? uc.filter(u => CAT_MAP[u.categorie] === ucCat) : uc;
    if (!hasPerfs) return base;
    return [...base].sort((a, b) => {
      const pa = ucPerfs[a.isin] ?? -Infinity;
      const pb = ucPerfs[b.isin] ?? -Infinity;
      return pb - pa;
    });
  })();

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
        <span class="section-label">Unités de compte</span>
        <span class="section-hint">${uc.length} UC</span>
      </div>

      <div class="uc-chips">
        <button class="uc-chip uc-chip-csr${ucCat === 'Conservateur' ? ' active' : ''}" onclick="App.setUcCat('Conservateur')">C</button>
        <button class="uc-chip${ucCat === 'Actions thématique' ? ' active' : ''}" onclick="App.setUcCat('Actions thématique')">Thématique</button>
        <button class="uc-chip${ucCat === 'Actions' ? ' active' : ''}" onclick="App.setUcCat('Actions')">Actions</button>
        <button class="uc-chip${ucCat === 'Mixte / Flexible' ? ' active' : ''}" onclick="App.setUcCat('Mixte / Flexible')">Mixte</button>
        <button class="uc-chip${ucCat === 'Obligataire' ? ' active' : ''}" onclick="App.setUcCat('Obligataire')">Oblig.</button>
      </div>

      <div class="uc-sort-banner${hasPerfs ? '' : ' loading'}">
        ${hasPerfs ? '↓ Trié par performance 1 an glissant' : '⟳ Chargement des performances…'}
      </div>

      <div class="uc-liste">
        ${ucFiltrees.map(u => `
        <div class="uc-item${u.graphId ? ' clic' : ''}"${u.graphId ? ` onclick="App.ouvrirGraphiqueUC('${u.isin}')"` : ''}>
          <div class="uc-item-haut">
            <div class="uc-item-id">
              <div class="uc-item-nom">${u.nom}</div>
              <div class="uc-item-isin tnum">${u.isin}</div>
            </div>
            <div class="uc-item-right">
              ${perfBadge(u.isin, ucPerfs)}
            </div>
          </div>
          <div class="uc-item-bas">
            <span class="uc-cat-badge">${u.categorie}</span>
            <span class="uc-expo">Actions ${u.equity} %</span>
            <span class="uc-srri-inline"><span class="uc-srri-label">SRI</span>${srriDots(u.srri)}</span>
          </div>
        </div>`).join('')}
      </div>

      <div class="table-note mt-16">Taux FE nets de frais de gestion · performances UC indicatives · sources internes.</div>
    </div>
  </div>`;
}
