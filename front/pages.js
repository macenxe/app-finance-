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
    : 'heure de cotation indisponible';

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
          ${gid ? `<div class="index-spark" data-spark="${gid}"></div>` : ''}
        </div>`; }).join('')}
      </div>

      <!-- Actifs -->
      <div class="flex-sb mb-12">
        <span class="section-label">Actifs</span>
      </div>
      <div class="grid-3 mb-24">
        ${MACRO.map(m => { const gid = graphIdPour(m.nom);
          // Or & Bitcoin : hausse = vert. Brent : inversé (hausse = rouge). Couleur = favorabilité.
          const favorable = m.hausse === null ? null : (/Brent/i.test(m.nom) ? !m.hausse : m.hausse);
          return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${m.nom}')"` : ''}${gid ? ` data-macro="${gid}"` : ''}>
          <div class="index-name">${m.nom}</div>
          <div class="index-val tnum" data-macro-val>${m.valeur || '—'}</div>
          <div class="index-var tnum ${favorable === null ? 'flat' : favorable ? 'up' : 'down'}" data-macro-var>${m.var || ''}</div>
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
          // Fraîcheur : date pré-formatée pour les séries FRED (HISTO_DERNIER), sinon date ISO
          // du CMS (live FT) convertie en « au JJ/MM ».
          const dateLbl = (h && h.date) ? h.date
            : (t.dateMaj && /^\d{4}-\d{2}-\d{2}/.test(t.dateMaj)) ? 'au ' + t.dateMaj.slice(8, 10) + '/' + t.dateMaj.slice(5, 7)
            : '';
          return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${t.nom}')"` : ''}>
          <div class="index-name index-name-taux">
            ${t.nom}
          </div>
          <div class="index-val tnum">${valeur || '—'}</div>
          <div class="taux-var tnum ${hausse === null ? 'flat' : hausse ? 'up' : 'down'}">${vr || ''}</div>
          ${dateLbl ? `<div class="taux-maj">${escHtml(dateLbl)}</div>` : ''}
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

function renderActus() {
  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Actualités économiques</div>
        <div class="page-sub">Flux en direct · économie globale & vos produits</div>
      </div>
    </header>
    <div class="page-body">
      <div id="news-section" class="news-loading">
        <div class="news-spinner">Chargement des actualités…</div>
      </div>
    </div>
  </div>`;
}

function renderNewsSection(news) {
  const TAG_AUTOCALLS = {
    'BNP Paribas':  ['Ath. BNP'],
    'Stellantis':   ['Ath. Stellantis'],
    'Capgemini':    ['Ath. Capgemini'],
    'Rheinmetall':  ['Ath. Rheinmetall'],
    'ES Banks':     ['CAP'],
    'BCE / Taux':   ['CMS'],
    'Inflation':    ['CMS'],
  };

  const fmtDate = (rssDate) => {
    if (!rssDate) return '';
    try {
      return new Date(rssDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  };

  const articleHtml = (a) => {
    const autocalls = TAG_AUTOCALLS[a.tag] || [];
    return `
    <a class="news-article" href="${escHtml(a.lien)}" target="_blank" rel="noopener">
      <div class="news-badges">
        ${a.tag ? `<span class="news-tag">${escHtml(a.tag)}</span>` : ''}
        ${autocalls.map(p => `<span class="news-badge-prod">${escHtml(p)}</span>`).join('')}
      </div>
      <div class="news-titre">${escHtml(a.titre)}</div>
      <div class="news-meta">${escHtml(a.source)}${a.date ? ' · ' + fmtDate(a.date) : ''}</div>
    </a>`;
  };

  const tous = [...(news.globales || []), ...(news.produits || [])]
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  if (!tous.length) return '<p class="news-empty">Aucune actualité disponible.</p>';
  return `<div class="news-articles-grid">${tous.map(articleHtml).join('')}</div>`;
}

function renderProduits(produits, state, rappeles) {
  const q = (state.q || '').trim().toLowerCase();
  const fmtRes = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const rapNote = (rappeles && rappeles.length > 0)
    ? ` · ${rappeles.length} rappelé${rappeles.length > 1 ? 's' : ''} (retiré${rappeles.length > 1 ? 's' : ''} de la liste)`
    : '';
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
        <div class="page-sub">${produits.length} produits suivis${rapNote}</div>
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
            // CMS : règle dédiée pour la pastille de niveau — vert si le taux <= barrière de
            // coupon (strike), orange jusqu'à +0,15 pt au-dessus, rouge au-delà.
            if (r.type === 'cms' && r.bCouponNum != null) {
              const nivCms = parseFloat(String(r.niveau).replace(/[^0-9,.-]/g, '').replace(',', '.'));
              if (isFinite(nivCms)) {
                const dd = nivCms - r.bCouponNum;
                pctCouleur = dd <= 0 ? 'green' : dd <= 0.15 ? 'orange' : 'red';
              }
            }
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
              const resVals = g.membres.map(m => m.couponsReserve || 0).filter(v => v > 0);
              let resGroupHtml = '';
              if (resVals.length > 0) {
                const rmin = Math.min(...resVals), rmax = Math.max(...resVals);
                const lbl = rmin === rmax ? `+${fmtRes(rmin)} % réserve` : `+${fmtRes(rmin)}-${fmtRes(rmax)} % réserve`;
                resGroupHtml = `<span class="coupon-reserve">${lbl}</span>`;
              }
              const nplusGroup = r.nPlusX ? `<span class="badge-nplus">${r.nPlusX}</span>` : '';
              return sep + `
          <div class="products-table-row">
            <span class="col-nom" onclick="App.voirDetailGroupe('${g.membres.map(m=>m.isin).join(',')}')">
              <span class="col-nom-text">${groupName}</span>
            </span>
            <span class="tnum col-dim" style="font-size:11.5px;">${abregerDate(r.constat)}${nplusGroup}</span>
            <span class="col-landscape tnum col-right" style="font-size:11.5px;">${r.strike || '—'}</span>
            <span class="col-center col-pct tnum">${niveauBadge}</span>
            <span class="tnum col-center col-coupon">${cpnRange}${resGroupHtml}</span>
            <span class="col-center">${barrCell(r.bCoupon, couponColor)}</span>
            <span class="col-center">${barrCell(r.bAuto, autoColor, r.type === 'equity' && r.estBaisse)}</span>
            <span class="col-landscape">${statutCell}</span>
          </div>`;
            }
            const resHtml = r.couponsReserve > 0 ? `<span class="coupon-reserve">+${fmtRes(r.couponsReserve)} % réserve</span>` : '';
            const nplusHtml = r.nPlusX ? `<span class="badge-nplus">${r.nPlusX}</span>` : '';
            return sep + `
          <div class="products-table-row">
            <span class="col-nom" onclick="App.voirDetail('${r.isin}')">
              <span class="col-nom-text">${abregerMois(r.nom)}</span>
            </span>
            <span class="tnum col-dim" style="font-size:11.5px;">${abregerDate(r.constat)}${nplusHtml}</span>
            <span class="col-landscape tnum col-right" style="font-size:11.5px;">${r.strike || '—'}</span>
            <span class="col-center col-pct tnum">${niveauBadge}</span>
            <span class="tnum col-center col-coupon">${r.coupon}${resHtml}</span>
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

function renderDetail(produit) {
  const typLabel = produit.type === 'equity' ? 'Actions' : 'Taux (CMS)';
  const fmtC = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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
          <div class="card-title mb-12">Coupons</div>
          <div class="detail-rows">
            <div class="detail-row"><span class="detail-key">Période en cours</span><span class="detail-val tnum">${escHtml(produit.nPlusX ?? 'N+1')}</span></div>
            <div class="detail-row"><span class="detail-key">Coupons versés</span><span class="detail-val tnum">${fmtC(produit.couponsVerses ?? 0)} %</span></div>
            <div class="detail-row"><span class="detail-key">Coupons en réserve</span><span class="detail-val tnum"${(produit.couponsReserve ?? 0) > 0 ? ' style="font-weight:600;color:#b06a1a;"' : ''}>${fmtC(produit.couponsReserve ?? 0)} %</span></div>
          </div>
          <div class="detail-note" style="margin-top:10px;">${produit.bCouponNum != null
            ? 'Effet mémoire : les coupons en réserve sont versés à la première constatation où la barrière de coupon est franchie.'
            : 'Coupons capitalisés : versés en une fois au rappel ou à l\'échéance.'}</div>
          ${produit.evaluationIncomplete ? `<div class="detail-note" style="margin-top:6px;color:#9a3535;">Historique de cours incomplet : réserve indicative.</div>` : ''}
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

function renderDetailGroupe(membres) {
  const ref = membres[0];
  const fmtC = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const groupNom = ref.nom.replace(/\bCAP\s+\d+\s+/, 'CAP ');
  const niveauPct = (ref.strikeNum && ref.niveauNum)
    ? (ref.niveauNum / ref.strikeNum * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
    : '—';
  const pctColor = ref.k === 'red' ? '#9a3535' : ref.k === 'orange' ? '#b06a1a' : '#1d6f4c';

  return `
  <div>
    <header class="page-header">
      <div style="display:flex;align-items:center;gap:16px;">
        <button class="btn-back" onclick="App.fermerDetail()">← Retour</button>
        <div>
          <div class="page-title">${escHtml(groupNom)}</div>
          <div class="page-sub">${escHtml(ref.sj)} · Constat. ${escHtml(ref.constat)} · Échéance ${escHtml(ref.ech)}</div>
        </div>
      </div>
    </header>

    <div class="detail-content">
      <div id="detail-chart-inline" class="detail-chart-inline"></div>

      <div class="detail-groupe-section">
        <div class="detail-groupe-titre">Niveaux de protection disponibles</div>
        <div class="detail-groupe-table">
          <div class="detail-groupe-header">
            <span>Protection</span>
            <span class="col-center">Coupon</span>
            <span class="col-center">Réserve</span>
            <span class="col-center">Statut</span>
          </div>
          ${membres.map(m => {
            const couponColor = m.bCouponNum != null ? (m.couponAtteint ? 'green' : 'red') : null;
            const autoColor   = m.zoneAutocall === 'OUI' ? 'green' : 'red';
            const cPill = couponColor != null ? `<span class="statut-pill ${couponColor}">Coupon</span>` : '';
            const rPill = `<span class="statut-pill ${autoColor}">Rappel</span>`;
            const statut = m.belowProtection
              ? `<span class="badge red">Risque</span>`
              : `<div class="statut-pills">${cPill}${rPill}</div>`;
            const prot = m.protection || '—';
            return `
          <div class="detail-groupe-row">
            <span class="detail-groupe-prot tnum">${escHtml(String(prot))}</span>
            <span class="col-center tnum">${escHtml(String(m.coupon))}</span>
            <span class="col-center tnum">${m.couponsReserve > 0 ? '+' + fmtC(m.couponsReserve) + ' %' : '—'}</span>
            <span class="col-center">${statut}</span>
          </div>`;
          }).join('')}
        </div>
      </div>

      <div style="margin-top:16px;">
        <div class="card p-18">
          <div class="card-title mb-12">Données communes</div>
          <div class="detail-rows">
            <div class="detail-row"><span class="detail-key">Sous-jacent</span><span class="detail-val">${escHtml(ref.sj)}</span></div>
            <div class="detail-row"><span class="detail-key">Strike initial</span><span class="detail-val tnum">${escHtml(String(ref.strike))}</span></div>
            <div class="detail-row"><span class="detail-key">Niveau actuel</span><span class="detail-val tnum">${escHtml(String(ref.niveau))}</span></div>
            <div class="detail-row">
              <span class="detail-key">% du strike</span>
              <span class="detail-val tnum" style="font-weight:600;color:${pctColor};">${niveauPct}</span>
            </div>
            <div class="detail-row"><span class="detail-key">Barrière autocall</span><span class="detail-val tnum">${escHtml(String(ref.bAuto))}</span></div>
            <div class="detail-row"><span class="detail-key">Prochaine constatation</span><span class="detail-val tnum">${escHtml(ref.constat)}</span></div>
            <div class="detail-row"><span class="detail-key">Échéance finale</span><span class="detail-val tnum">${escHtml(ref.ech)}</span></div>
          </div>
        </div>
      </div>

      <div class="detail-note">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
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
        ${ucFiltrees.map(u => {
          const filterLabel = u.nom.includes('Conservateur') ? 'C'
            : CAT_MAP[u.categorie] === 'Actions thématique' ? 'Thématique'
            : CAT_MAP[u.categorie] === 'Actions'            ? 'Actions'
            : CAT_MAP[u.categorie] === 'Mixte / Flexible'   ? 'Mixte'
            : CAT_MAP[u.categorie] === 'Obligataire'        ? 'Oblig.'
            : u.categorie;
          return `
        <div class="uc-item${u.graphId ? ' clic' : ''}"${u.graphId ? ` onclick="App.ouvrirGraphiqueUC('${u.isin}')"` : ''}>
          <div class="uc-item-haut">
            <div class="uc-item-id">
              <div class="uc-item-nom">
                ${u.nom}<span class="uc-filtre-badge">${filterLabel}</span>
              </div>
              <div class="uc-item-isin tnum">${u.isin}</div>
            </div>
            <div class="uc-item-right">
              ${perfBadge(u.isin, ucPerfs)}
            </div>
          </div>
          <div class="uc-item-bas">
            <span class="uc-expo">Actions ${u.equity} %</span>
            <span class="uc-srri-inline"><span class="uc-srri-label">SRI</span>${srriDots(u.srri)}</span>
          </div>
        </div>`;
        }).join('')}
      </div>

      <div class="table-note mt-16">Taux FE nets de frais de gestion · performances UC indicatives · sources internes.</div>
    </div>
  </div>`;
}
