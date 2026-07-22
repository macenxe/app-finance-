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

function renderDashboard(indices, produits, taux) {
  taux = taux || TAUX;

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

// ── Page Autocall : formatage dates ──
function parseDateFlexible(s) {
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function formatDateLongue(s) {
  const d = parseDateFlexible(s);
  if (!d) return s || '';
  const MOIS = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
// Format court JJ/MM/AA, utilisé partout où les dates doivent tenir sur une ligne compacte.
function formatDateCourte(s) {
  const d = parseDateFlexible(s);
  if (!d) return null;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
// Délai avant une date : nombre de jours si ≤ 1 mois, sinon nombre de mois arrondi.
function delaiRestant(s) {
  const d = parseDateFlexible(s);
  if (!d) return null;
  const now = new Date();
  const j = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffJours = Math.round((j(d) - j(now)) / 86400000);
  if (diffJours <= 0) return "Aujourd'hui";
  if (diffJours <= 30) return `${diffJours} j`;
  const mois = Math.round(diffJours / 30.44);
  return `${mois} mois`;
}
// Format court MM/AAAA (le jour n'a pas de sens dans un titre de produit).
function formatMoisAnnee(s) {
  const d = parseDateFlexible(s);
  if (!d) return null;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
// Condense le suffixe « Mois AAAA » d'un nom de produit en MM/AAAA (à partir de l'échéance),
// pour que le titre tienne sur une seule ligne quelle que soit sa longueur.
const MOIS_TITRE_RE = /\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+\d{4}\s*$/i;
function condenserTitreProduit(nom, ech) {
  if (!nom) return nom;
  const m = nom.match(MOIS_TITRE_RE);
  if (!m) return nom;
  const court = formatMoisAnnee(ech);
  if (!court) return nom;
  return `${nom.slice(0, m.index)} ${court}`;
}

// ── Page Autocall : géométrie de la barre de barrières ──
// Calcule les positions (% de largeur) de la barrière coupon, de la barrière de rappel,
// du niveau actuel et de la zone de perte en capital, dans l'unité native du produit
// (€ pour equity, en niveau du strike ; % pour CMS).
// Construit la fonction de positionnement (% de largeur) à partir de l'échelle du jeu de valeurs.
// Pour un produit « à la baisse » (rappel déclenché par une chute du sous-jacent, ex. CMS),
// on inverse l'axe : la zone de rappel reste visuellement du même côté que pour un produit
// « à la hausse », au lieu de suivre l'ordre brut des valeurs (ce qui inversait la lecture).
function creerPositionneur(vals, estBaisse) {
  const hi = (Math.max(...vals) || 0) * 1.1 || 1;
  return v => {
    if (v == null || !isFinite(v)) return null;
    const p = Math.min(97, Math.max(2, (v / hi) * 100));
    return estBaisse ? 100 - p : p;
  };
}
function geometrieBarre(r) {
  const isCms = r.type === 'cms';
  let couponVal = null, autoVal = null, niveauVal = null, protVal = null, protPct = null;
  if (isCms) {
    const parseNum = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9,.-]/g, '').replace(',', '.'));
    couponVal = r.bCouponNum;
    autoVal   = r.bAutoNum;
    niveauVal = parseNum(r.niveau);
    if (isNaN(niveauVal)) niveauVal = r.niveauNum;
  } else if (r.type === 'equity' && r.strikeNum) {
    couponVal = r.bCouponNum != null ? r.strikeNum * r.bCouponNum / 100 : null;
    autoVal   = r.bAutoNum   != null ? r.strikeNum * r.bAutoNum   / 100 : null;
    niveauVal = r.niveauNum != null ? r.niveauNum : null;
    const m = String(r.protection || '').match(/-(\d+)/);
    if (m) { protPct = parseInt(m[1], 10); protVal = r.strikeNum * (1 - protPct / 100); }
  }
  const vals = [couponVal, autoVal, niveauVal, protVal].filter(v => v != null && isFinite(v));
  if (!vals.length) return null;
  const estBaisse = !!r.estBaisse;
  const pos = creerPositionneur(vals, estBaisse);
  return {
    isCms, couponVal, autoVal, niveauVal, protVal, protPct, estBaisse,
    couponPos: pos(couponVal), autoPos: pos(autoVal), niveauPos: pos(niveauVal), protPos: pos(protVal),
  };
}
// Géométrie d'une carte CAP regroupée : mêmes barrières coupon/rappel et même niveau pour
// tous les paliers de protection, mais une position par palier (40 %, 50 %, 60 %…).
function geometrieBarreGroupe(r) {
  if (r.type !== 'equity' || !r.strikeNum) return null;
  const couponVal = r.bCouponNum != null ? r.strikeNum * r.bCouponNum / 100 : null;
  const autoVal   = r.bAutoNum   != null ? r.strikeNum * r.bAutoNum   / 100 : null;
  const niveauVal = r.niveauNum != null ? r.niveauNum : null;
  const paliers = (r.paliers || []).map(p => ({
    ...p, val: p.pct != null ? r.strikeNum * (1 - p.pct / 100) : null,
  }));
  const vals = [couponVal, autoVal, niveauVal, ...paliers.map(p => p.val)].filter(v => v != null && isFinite(v));
  if (!vals.length) return null;
  const estBaisse = !!r.estBaisse;
  const pos = creerPositionneur(vals, estBaisse);
  return {
    isCms: false, couponVal, autoVal, niveauVal, estBaisse,
    couponPos: pos(couponVal), autoPos: pos(autoVal), niveauPos: pos(niveauVal),
    paliers: paliers.map(p => ({ ...p, pos: pos(p.val) })),
  };
}
function fmtBarreNiveau(v, isCms) {
  if (v == null || !isFinite(v)) return '—';
  return isCms
    ? v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'
    : v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}
function fmtBarreBarriere(v, isCms) {
  if (v == null || !isFinite(v)) return '—';
  return isCms
    ? v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'
    : v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}
// Comme fmtBarreBarriere mais sans unité, pour les repères sur le graphique (plus lisible,
// l'unité est déjà donnée par le niveau affiché en en-tête de carte).
function fmtBarreBarriereCourt(v, isCms) {
  if (v == null || !isFinite(v)) return '—';
  return isCms
    ? v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}
// Zone du niveau actuel : risque (sous la protection), zone rappel (barrière franchie),
// zone coupon (barrière coupon franchie sans déclencher le rappel), ou neutre (entre les deux).
function zoneNiveau(r) {
  if (r.belowProtection) return { cle: 'risque', label: 'Risque' };
  if (r.zoneAutocall === 'OUI') return { cle: 'rappel', label: 'Zone rappel' };
  if (r.couponAtteint) return { cle: 'coupon', label: 'Zone coupon' };
  return { cle: 'neutre', label: 'Neutre' };
}
// Famille d'un produit autocall, déduite de son nom (CMS via le type, sinon Athena/CAP).
function familleProduit(r) {
  if (r.type === 'cms') return 'cms';
  const nom = r.nom || '';
  if (/^CAP\b/i.test(nom)) return 'cap';
  if (/Athena/i.test(nom)) return 'athena';
  return 'autre';
}
// Regroupe les CAP d'une même échéance (même sous-jacent, mêmes barrières, seul le palier de
// protection change) en une seule carte listant les différents paliers.
function grouperCapMemeDate(rows) {
  const groupes = new Map();
  const resultat = [];
  for (const r of rows) {
    if (r.rappele || familleProduit(r) !== 'cap') { resultat.push(r); continue; }
    const clef = [r.sj, r.ech, r.strikeNum, r.bAuto, r.bCoupon, r.constat].join('|');
    let groupe = groupes.get(clef);
    if (!groupe) {
      groupe = { ...r, isGroupeCap: true, paliers: [] };
      groupes.set(clef, groupe);
      resultat.push(groupe);
    }
    const m = String(r.protection || '').match(/-(\d+)/);
    groupe.paliers.push({ pct: m ? parseInt(m[1], 10) : null, coupon: r.coupon, isin: r.isin });
  }
  resultat.forEach(r => { if (r.isGroupeCap) r.paliers.sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)); });
  return resultat;
}
function reserveLabelAutocall(r) {
  const fmtRes = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (!r.couponsReserve || r.couponsReserve <= 0) return 'Aucun coupon en réserve';
  const couponNum = parseFloat(String(r.coupon).replace(',', '.'));
  const n = couponNum > 0 ? Math.round(r.couponsReserve / couponNum) : null;
  const nLabel = n ? `${n} coupon${n > 1 ? 's' : ''} en réserve` : 'Coupons en réserve';
  return `${nLabel} (+${fmtRes(r.couponsReserve)} %)`;
}
function fmtCouponAnnuel(coupon) {
  const n = parseFloat(String(coupon).replace(',', '.'));
  if (isNaN(n)) return coupon;
  return '+' + n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %/an';
}

function cardAutocallHtml(r) {
  if (r.isGroupeCap) return cardAutocallGroupeHtml(r);

  const isCms = r.type === 'cms';
  const geo = !r.rappele ? geometrieBarre(r) : null;
  const zone = zoneNiveau(r);

  const barSection = geo ? `
      <div class="ac-bar-row">
        <div class="ac-bar">
          <div class="ac-bar-track"></div>
          <div class="ac-bar-arrow"></div>
          ${geo.protPos != null ? (geo.estBaisse
              ? `<div class="ac-bar-loss" style="left:${geo.protPos}%; right:0;"></div>`
              : `<div class="ac-bar-loss" style="left:0; width:${geo.protPos}%"></div>`) : ''}
          ${geo.protPos != null ? `<div class="ac-bar-mark ac-bar-mark--protection" style="left:${geo.protPos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(geo.protVal, isCms)}</span></div>` : ''}
          ${geo.couponPos != null ? `<div class="ac-bar-mark ac-bar-mark--coupon" style="left:${geo.couponPos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(geo.couponVal, isCms)}</span></div>` : ''}
          ${geo.autoPos != null ? `<div class="ac-bar-mark ac-bar-mark--auto" style="left:${geo.autoPos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(geo.autoVal, isCms)}</span></div>` : ''}
          ${geo.niveauPos != null ? `<div class="ac-bar-niveau" style="left:${geo.niveauPos}%"><span class="ac-bar-niveau-dot"></span></div>` : ''}
        </div>
      </div>`
    : '';

  const protectionLabel = geo && geo.protPct != null ? `${geo.protPct} %` : (geo && isCms ? 'Capital garanti' : null);
  const protectionInfo = protectionLabel ? `
      <span class="ac-card-protection">
        <svg class="ac-shield-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
        ${protectionLabel}
      </span>` : '';

  const infoBlock = r.rappele ? `
      <div class="ac-info-row ac-info-row--coupon"><span class="ac-info-label">Total perçu</span><span class="ac-info-val ac-info-val--coupon">${r.aVerserAuRappel != null ? '+' + r.aVerserAuRappel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %' : '—'}</span></div>
      <div class="ac-info-row ac-info-row--constat">
        <span class="ac-info-label">Rappelé le :</span>
        <span class="ac-info-val">${escHtml(formatDateCourte(r.dateRappel) || formatDateLongue(r.dateRappel))}</span>
      </div>
      <div class="ac-info-statut"><span class="ac-statut-pill grey">Rappelé</span></div>`
    : `
      <div class="ac-info-row ac-info-row--constat">
        <span class="ac-info-label">Proch. constat :</span>
        <span class="ac-info-val">${escHtml(formatDateCourte(r.constat) || formatDateLongue(r.constat))}</span>
      </div>`;

  const niveauEnTete = geo && geo.niveauVal != null ? `
      <div class="ac-card-niveau">
        <span class="ac-card-niveau-label ac-card-niveau-label--${zone.cle}">${zone.label}</span>
        <span class="ac-card-niveau-val ac-card-niveau-val--${zone.cle}">${fmtBarreBarriere(geo.niveauVal, isCms)}</span>
      </div>` : '';

  const titreCourt = condenserTitreProduit(r.nom, r.ech);

  return `
  <div class="ac-card${r.rappele ? ' ac-card--rappele' : ''}"${r.rappele ? '' : ` onclick="App.voirDetail('${r.isin}')"`}>
    <div class="ac-card-left">
      <div class="ac-card-top">
        <div class="ac-card-titre">
          <div class="ac-card-nom">${escHtml(titreCourt)}</div>
          <div class="ac-card-sj"><span class="ac-card-sj-nom">${escHtml(r.sjLabel || r.sj || '')}</span>${protectionInfo}</div>
        </div>
        ${niveauEnTete}
      </div>
      ${barSection}
    </div>
    <div class="ac-info">${infoBlock}</div>
  </div>`;
}

// Carte CAP regroupée : une ligne par échéance, avec un repère de protection par palier
// (40 %, 50 %, 60 %…) plutôt qu'une carte séparée pour chaque palier.
function cardAutocallGroupeHtml(r) {
  const geo = geometrieBarreGroupe(r);
  const zone = zoneNiveau(r);

  // Les paliers sont proches les uns des autres : celui du milieu (ex. -50 %) passe au-dessus
  // de la frise pour ne pas chevaucher les libellés des paliers voisins.
  const paliersPos = (geo ? geo.paliers : []).filter(p => p.pos != null).sort((a, b) => a.pos - b.pos);
  // Le palier le moins protégé (pct le plus faible, ex. -40 %) est le premier à être franchi :
  // la zone de perte démarre donc à son niveau.
  const paliersAsc = geo ? [...geo.paliers].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)) : [];
  const paliersMoinsProtege = paliersAsc.length ? paliersAsc[0] : null;

  const barSection = geo ? `
      <div class="ac-bar-row">
        <div class="ac-bar">
          <div class="ac-bar-track"></div>
          <div class="ac-bar-arrow"></div>
          ${paliersMoinsProtege && paliersMoinsProtege.pos != null ? (geo.estBaisse
              ? `<div class="ac-bar-loss" style="left:${paliersMoinsProtege.pos}%; right:0;"></div>`
              : `<div class="ac-bar-loss" style="left:0; width:${paliersMoinsProtege.pos}%"></div>`) : ''}
          ${paliersPos.map((p, i) => `<div class="ac-bar-mark ac-bar-mark--protection${i % 2 === 1 ? ' ac-bar-mark--haut' : ''}" style="left:${p.pos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(p.val, false)}</span></div>`).join('')}
          ${geo.couponPos != null ? `<div class="ac-bar-mark ac-bar-mark--coupon" style="left:${geo.couponPos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(geo.couponVal, false)}</span></div>` : ''}
          ${geo.autoPos != null ? `<div class="ac-bar-mark ac-bar-mark--auto" style="left:${geo.autoPos}%"><span class="ac-bar-mark-tick"></span><span class="ac-bar-mark-label">${fmtBarreBarriereCourt(geo.autoVal, false)}</span></div>` : ''}
          ${geo.niveauPos != null ? `<div class="ac-bar-niveau" style="left:${geo.niveauPos}%"><span class="ac-bar-niveau-dot"></span></div>` : ''}
        </div>
      </div>`
    : '';

  const infoBlock = `
      <div class="ac-info-row ac-info-row--constat">
        <span class="ac-info-label">Proch. constat :</span>
        <span class="ac-info-val">${escHtml(formatDateCourte(r.constat) || formatDateLongue(r.constat))}</span>
      </div>`;

  const niveauEnTete = geo && geo.niveauVal != null ? `
      <div class="ac-card-niveau">
        <span class="ac-card-niveau-label ac-card-niveau-label--${zone.cle}">${zone.label}</span>
        <span class="ac-card-niveau-val ac-card-niveau-val--${zone.cle}">${fmtBarreBarriere(geo.niveauVal, false)}</span>
      </div>` : '';

  const titreGroupe = `CAP ${formatMoisAnnee(r.ech) || ''}`.trim();
  const isinsGroupe = r.paliers.map(p => p.isin).filter(Boolean).join(',');

  const paliersPct = r.paliers.map(p => p.pct).filter(n => n != null).sort((a, b) => a - b);
  const protectionLabel = paliersPct.length
    ? (paliersPct[0] === paliersPct[paliersPct.length - 1] ? `${paliersPct[0]} %` : `${paliersPct[0]} à ${paliersPct[paliersPct.length - 1]} %`)
    : null;
  const protectionInfo = protectionLabel ? `
      <span class="ac-card-protection">
        <svg class="ac-shield-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
        ${protectionLabel}
      </span>` : '';

  return `
  <div class="ac-card"${isinsGroupe ? ` onclick="App.voirDetailGroupe('${isinsGroupe}')"` : ''}>
    <div class="ac-card-left">
      <div class="ac-card-top">
        <div class="ac-card-titre">
          <div class="ac-card-nom">${escHtml(titreGroupe)}</div>
          <div class="ac-card-sj"><span class="ac-card-sj-nom">${escHtml(r.sjLabel || r.sj || '')}</span>${protectionInfo}</div>
        </div>
        ${niveauEnTete}
      </div>
      ${barSection}
    </div>
    <div class="ac-info">${infoBlock}</div>
  </div>`;
}

function renderProduits(produits, state, rappeles) {
  rappeles = rappeles || [];
  const famille = state.familleFiltre || 'tous';

  let rows = [...produits, ...rappeles.map(r => ({ ...r, rappele: true }))];
  if (famille !== 'tous') rows = rows.filter(r => familleProduit(r) === famille);
  rows = grouperCapMemeDate(rows);

  // Rappelés en fin de liste (plus de prochaine constatation) ; les autres du plus proche au plus lointain.
  const dateTri = r => {
    if (r.rappele) return Infinity;
    const d = parseDateFlexible(r.constat);
    return d ? d.getTime() : Infinity;
  };
  rows = [...rows].sort((a, b) => dateTri(a) - dateTri(b));

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Autocall</div>
        <div class="page-sub">Produits à mécanisme de rappel automatique</div>
      </div>
    </header>

    <div class="page-body">
      <div class="ac-toolbar">
        <div class="filter-chips ac-tabs">
          <button class="filter-chip${famille === 'tous' ? ' active' : ''}" onclick="App.setFamilleFiltre('tous')">Tous</button>
          <button class="filter-chip${famille === 'athena' ? ' active' : ''}" onclick="App.setFamilleFiltre('athena')">Athena</button>
          <button class="filter-chip${famille === 'cap' ? ' active' : ''}" onclick="App.setFamilleFiltre('cap')">CAP</button>
          <button class="filter-chip${famille === 'cms' ? ' active' : ''}" onclick="App.setFamilleFiltre('cms')">CMS</button>
        </div>
      </div>

      <div class="ac-legend">
        <span class="ac-legend-item"><span class="ac-legend-swatch ac-legend-swatch--loss"></span><span class="ac-legend-full">Zone de perte en capital</span><span class="ac-legend-court">Perte en capital</span></span>
        <span class="ac-legend-item"><span class="ac-legend-swatch ac-legend-swatch--coupon"></span><span class="ac-legend-full">Barrière coupon</span><span class="ac-legend-court">Coupon</span></span>
        <span class="ac-legend-item"><span class="ac-legend-swatch ac-legend-swatch--auto"></span><span class="ac-legend-full">Barrière rappel</span><span class="ac-legend-court">Rappel</span></span>
        <span class="ac-legend-item"><span class="ac-legend-swatch ac-legend-swatch--niveau"></span>Niveau actuel</span>
      </div>

      <div class="uc-sort-banner">↓ Trié par date de constatation</div>

      <div class="ac-list">
        ${rows.length ? rows.map(cardAutocallHtml).join('') : `<div class="ac-empty">Aucun produit ne correspond à cette recherche.</div>`}
      </div>

      <div class="table-note">Données indicatives · validation humaine obligatoire.</div>
    </div>
  </div>`;
}

// Grille de synthèse (coupon / protection / barrières) affichée en tête des fiches détail,
// avant le graphique, pour donner l'essentiel d'un coup d'œil.
function detailInfoGrid(boxes) {
  return `<div class="detail-info-grid">${boxes.map(b => `
    <div class="detail-info-box">
      <div class="detail-info-label">${b.label}</div>
      <div class="detail-info-val${b.cls ? ' ' + b.cls : ''}">${b.value}</div>
    </div>`).join('')}</div>`;
}

// Barrière au format « % · Montant » (equity) ou juste « % » (CMS, déjà exprimé en taux).
function detailBarriereTxt(strikeNum, pct, num, isCms) {
  if (pct == null || pct === 'NA') return '—';
  if (isCms || strikeNum == null || num == null) return escHtml(String(pct));
  const montant = strikeNum * num / 100;
  return `${escHtml(String(pct))} · ${montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}

function renderDetail(produit) {
  const typLabel = produit.type === 'equity' ? 'Actions' : 'Taux (CMS)';
  const isCms = produit.type === 'cms';

  // Coupon en mémoire : périodes où la barrière coupon n'a pas été franchie, dont le gain
  // reste en réserve jusqu'à la prochaine constatation qui la franchit (ou le rappel/échéance).
  const couponRate = parseFloat(String(produit.coupon).replace(',', '.'));
  const reserveNum = produit.couponsReserve ?? 0;
  const nbCoupons = couponRate > 0 ? Math.round(reserveNum / couponRate) : 0;
  const couponMemoireVal = nbCoupons > 0
    ? `${nbCoupons} coupon${nbCoupons > 1 ? 's' : ''} · +${reserveNum.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
    : '—';

  const infoBoxes = [
    { label: 'Coupon annuel', value: escHtml(produit.coupon) + ' / an', cls: 'green' },
    { label: 'Protection', value: escHtml(String(produit.protection ?? '—')) },
    { label: 'Barrière coupon', value: detailBarriereTxt(produit.strikeNum, produit.bCoupon, produit.bCouponNum, isCms) },
    { label: 'Barrière rappel', value: detailBarriereTxt(produit.strikeNum, produit.bAuto, produit.bAutoNum, isCms) },
  ];

  return `
  <div class="sheet-backdrop" onclick="if(event.target===this) App.fermerDetail()">
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="page-title">${escHtml(produit.nom)}</div>
        <div class="page-sub">${escHtml(produit.isin)} · ${typLabel}</div>
      </div>

    <div class="detail-content">
      ${detailInfoGrid(infoBoxes)}

      <div id="detail-chart-inline" class="detail-chart-inline"></div>

      <div class="card p-18">
        <div class="card-title mb-12">Description</div>
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-key">Sous-jacent</span><span class="detail-val">${escHtml(produit.sj)}</span></div>
          ${produit.type === 'equity' ? `
          <div class="detail-row"><span class="detail-key">Strike initial</span><span class="detail-val tnum">${escHtml(produit.strike)}</span></div>
          <div class="detail-row"><span class="detail-key">Niveau actuel</span><span class="detail-val tnum">${escHtml(produit.niveau)}</span></div>
          <div class="detail-row">
            <span class="detail-key">% du strike</span>
            <span class="detail-val tnum" style="font-weight:600;color:${produit.k==='red'?'#9a3535':produit.k==='orange'?'#b06a1a':'#1d6f4c'};">${escHtml(produit.pct)}</span>
          </div>` : `
          <div class="detail-row"><span class="detail-key">Taux CMS 10 ans</span><span class="detail-val tnum">${escHtml(produit.niveau)}</span></div>`}
          <div class="detail-row"><span class="detail-key">Barrière coupon</span><span class="detail-val tnum">${escHtml(produit.bCoupon)}</span></div>
          <div class="detail-row"><span class="detail-key">Barrière rappel</span><span class="detail-val tnum">${escHtml(produit.bAuto)}</span></div>
          <div class="detail-row">
            <span class="detail-key">Coupon en mémoire</span>
            <span class="detail-val tnum"${nbCoupons > 0 ? ' style="font-weight:600;color:#b06a1a;"' : ''}>${couponMemoireVal}</span>
          </div>
          <div class="detail-row"><span class="detail-key">Prochaine constatation</span><span class="detail-val tnum">${escHtml(produit.constat)}</span></div>
          <div class="detail-row"><span class="detail-key">Échéance finale</span><span class="detail-val tnum">${escHtml(produit.ech)}</span></div>
        </div>
        ${produit.evaluationIncomplete ? `<div class="detail-note" style="margin-top:10px;color:#9a3535;">Historique de cours incomplet : réserve indicative.</div>` : ''}
      </div>

      <div class="detail-note">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
    </div>
    </div>
  </div>`;
}

function renderDetailGroupe(membres) {
  const ref = membres[0];
  const groupNom = ref.nom.replace(/\bCAP\s+\d+\s+/, 'CAP ');
  const niveauPct = (ref.strikeNum && ref.niveauNum)
    ? (ref.niveauNum / ref.strikeNum * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
    : '—';
  const pctColor = ref.k === 'red' ? '#9a3535' : ref.k === 'orange' ? '#b06a1a' : '#1d6f4c';

  // Même ordre pour tous les champs par palier (protection croissante en valeur absolue,
  // ex. -40/-50/-60) : coupon et gain en mémoire suivent, même si le coupon y est décroissant.
  const membresParProtection = [...membres].sort((a, b) => {
    const pa = Math.abs(parseInt(String(a.protection || '').match(/-?\d+/)?.[0], 10) || 0);
    const pb = Math.abs(parseInt(String(b.protection || '').match(/-?\d+/)?.[0], 10) || 0);
    return pa - pb;
  });
  const protVals = membresParProtection.map(m => String(m.protection || '').match(/-?\d+/)?.[0]).filter(Boolean);
  const protectionTxt = protVals.length ? protVals.join('/') + ' %' : '—';
  const couponsNum = membresParProtection.map(m => parseFloat(String(m.coupon).replace(',', '.'))).filter(n => !isNaN(n));
  const couponTxt = couponsNum.length ? couponsNum.map(n => n.toLocaleString('fr-FR')).join('-') + ' % / an' : '—';

  // Coupon en mémoire : même historique de franchissement pour tous les paliers (barrière
  // coupon commune), donc même nombre de coupons en réserve — seul le gain % diffère (taux propre à chaque palier).
  const refRate = parseFloat(String(ref.coupon).replace(',', '.'));
  const nbCouponsGroupe = refRate > 0 ? Math.round((ref.couponsReserve ?? 0) / refRate) : 0;
  const gainsMembres = membresParProtection.map(m => (m.couponsReserve ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
  const couponMemoireTxt = nbCouponsGroupe > 0
    ? `${nbCouponsGroupe} coupon${nbCouponsGroupe > 1 ? 's' : ''} · +${gainsMembres.join('-')} %`
    : '—';

  const infoBoxes = [
    { label: 'Coupon annuel', value: couponTxt, cls: 'green' },
    { label: 'Protection', value: protectionTxt },
    { label: 'Barrière coupon', value: detailBarriereTxt(ref.strikeNum, ref.bCoupon, ref.bCouponNum, false) },
    { label: 'Barrière rappel', value: detailBarriereTxt(ref.strikeNum, ref.bAuto, ref.bAutoNum, false) },
  ];

  return `
  <div class="sheet-backdrop" onclick="if(event.target===this) App.fermerDetail()">
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="page-title">${escHtml(groupNom)}</div>
        <div class="page-sub">${escHtml(ref.sj)} · Constat. ${escHtml(ref.constat)} · Échéance ${escHtml(ref.ech)}</div>
      </div>

    <div class="detail-content">
      ${detailInfoGrid(infoBoxes)}

      <div id="detail-chart-inline" class="detail-chart-inline"></div>

      <div style="margin-top:16px;">
        <div class="card p-18">
          <div class="card-title mb-12">Description</div>
          <div class="detail-rows">
            <div class="detail-row"><span class="detail-key">Sous-jacent</span><span class="detail-val">${escHtml(ref.sj)}</span></div>
            <div class="detail-row"><span class="detail-key">Strike initial</span><span class="detail-val tnum">${escHtml(String(ref.strike))}</span></div>
            <div class="detail-row"><span class="detail-key">Niveau actuel</span><span class="detail-val tnum">${escHtml(String(ref.niveau))}</span></div>
            <div class="detail-row">
              <span class="detail-key">% du strike</span>
              <span class="detail-val tnum" style="font-weight:600;color:${pctColor};">${niveauPct}</span>
            </div>
            <div class="detail-row"><span class="detail-key">Barrière coupon</span><span class="detail-val tnum">${escHtml(String(ref.bCoupon))}</span></div>
            <div class="detail-row"><span class="detail-key">Barrière rappel</span><span class="detail-val tnum">${escHtml(String(ref.bAuto))}</span></div>
            <div class="detail-row">
              <span class="detail-key">Coupon en mémoire</span>
              <span class="detail-val tnum"${nbCouponsGroupe > 0 ? ' style="font-weight:600;color:#b06a1a;"' : ''}>${couponMemoireTxt}</span>
            </div>
            <div class="detail-row"><span class="detail-key">Prochaine constatation</span><span class="detail-val tnum">${escHtml(ref.constat)}</span></div>
            <div class="detail-row"><span class="detail-key">Échéance finale</span><span class="detail-val tnum">${escHtml(ref.ech)}</span></div>
          </div>
        </div>
      </div>

      <div class="detail-note">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
    </div>
    </div>
  </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  const feOuvert = !!(state && state.feOuvert);

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
      <!-- ── Fonds en euros (dépliable, peu consulté au quotidien) ── -->
      <div class="fe-toggle mb-12" onclick="App.toggleFondsEuros()" role="button" tabindex="0" aria-expanded="${feOuvert}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.toggleFondsEuros();}">
        <div class="fe-toggle-main">
          <span class="fe-toggle-icon${feOuvert ? ' open' : ''}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
          </span>
          <span class="section-label">Fonds en euros · Taux ${perf.annee}</span>
        </div>
        <span class="fe-toggle-hint">${feOuvert ? 'Masquer' : 'Afficher le détail'}</span>
      </div>
      <div class="fe-collapse${feOuvert ? ' open' : ''}">
        <div class="fe-collapse-inner">
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
        </div>
        </div>
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
        ${hasPerfs ? '↓ Trié par performance depuis le 01/01' : '⟳ Chargement des performances…'}
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
              <div class="uc-item-nom">${u.nom}</div>
              <div class="uc-item-isin tnum">${u.isin}<span class="uc-filtre-badge">${filterLabel}</span></div>
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
