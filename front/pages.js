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
  <div class="page-dash">
    <header class="page-header">
      <div>
        <div class="page-title">Tableau de bord</div>
        <div class="page-sub">Synthèse des marchés · ${heureRef}</div>
      </div>
    </header>

    <div class="page-body">
     <div class="dash-split">
      <div class="dash-col-principale">
      <!-- Indices clés -->
      <div class="flex-sb mb-12">
        <span class="section-label">Indices clés</span>
      </div>
      <div class="grid-3 grid-mkt mb-24">
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
      <div class="grid-3 grid-mkt mb-24">
        ${MACRO.map(m => { const gid = graphIdPour(m.nom);
          // Or & Bitcoin : hausse = vert. Brent : inversé (hausse = rouge). Couleur = favorabilité.
          const favorable = m.hausse === null ? null : (/Brent/i.test(m.nom) ? !m.hausse : m.hausse);
          return `
        <div class="card index-card${gid ? ' index-clic' : ''}"${gid ? ` onclick="App.ouvrirGraphique('${gid}','${m.nom}')"` : ''}${gid ? ` data-macro="${gid}"` : ''}>
          <div class="index-card-info">
            <div class="index-name">${m.nom}</div>
            <div class="index-val tnum" data-macro-val>${m.valeur || '—'}</div>
            <div class="index-var tnum ${favorable === null ? 'flat' : favorable ? 'up' : 'down'}" data-macro-var>${m.var || ''}</div>
          </div>
          ${gid ? `<div class="index-spark bureau-seul"><svg viewBox="0 0 100 32" preserveAspectRatio="none"></svg><span class="index-spark-lbl">5 ans</span></div>` : ''}
        </div>`; }).join('')}
      </div>

      <!-- Taux et indicateurs macro -->
      <div class="flex-sb mb-12">
        <span class="section-label">Taux &amp; indicateurs macro</span>
      </div>
      <div class="grid-3 grid-mkt mb-24">
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

      <div class="card p-18 mb-24 bureau-seul cmp-card">
        <div class="card-title">Performance comparée</div>
        <div class="section-hint mb-12">Base 100 au début de la période · indices &amp; sous-jacents</div>
        <div class="cmp-chips" id="cmp-chips"></div>
        <div id="cmp-indices"></div>
      </div>
      </div><!-- /dash-col-principale -->

      <div class="dash-col-laterale">
      <!-- Événements macro -->
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

      ${renderAlertesPortefeuille(produits)}
      </div><!-- /dash-col-laterale -->
     </div><!-- /dash-split -->
    </div>
  </div>`;
}

// Libellé d'une alerte : un CAP regroupé se lit « CAP 08/2030 » (sans le palier).
function alerteNom(p) {
  if (p.isGroupeCap) {
    const d = parseDateFlexible(p.ech);
    if (d) return `CAP ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return 'CAP';
  }
  return condenserTitreProduit(p.nom, p.ech);
}

// Niveau exprimé en % du strike (colonne droite des alertes). Les CMS n'ont pas de strike :
// on y affiche le taux courant.
function pctDuStrike(p) {
  if (p.type === 'cms' || !p.strikeNum || p.niveauNum == null) return String(p.niveau ?? '—');
  return (p.niveauNum / p.strikeNum * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}

// Encart « Alertes portefeuille » (bureau) : produits en zone de rappel, en risque de perte
// en capital, ou dont le niveau est proche d'une barrière. Masqué en mobile.
function renderAlertesPortefeuille(produits) {
  // Mêmes regroupements que la liste Autocall : les paliers d'un même CAP ne forment
  // qu'une seule alerte (« CAP 08/2030 ») au lieu d'une ligne par palier.
  const lignes = grouperCapMemeDate((produits || []).filter(p => !p.rappele))
    .map(p => {
      const zone = zoneNiveau(p);
      // « Proche » : le niveau est à moins de 5 points de pourcentage d'une barrière.
      const niveauPct = (p.strikeNum && p.niveauNum) ? (p.niveauNum / p.strikeNum * 100) : null;
      let proche = null;
      if (p.type !== 'cms' && niveauPct != null) {
        if (p.bAutoNum != null && Math.abs(niveauPct - p.bAutoNum) < 5) proche = 'Proche barrière rappel';
        else if (p.bCouponNum != null && Math.abs(niveauPct - p.bCouponNum) < 5) proche = 'Proche barrière coupon';
      }
      return { p, zone, proche };
    })
    .filter(x => x.zone.cle === 'rappel' || x.zone.cle === 'risque' || x.proche)
    .sort((a, b) => {
      const rang = { risque: 0, rappel: 1, neutre: 2, coupon: 2 };
      return (rang[a.zone.cle] ?? 3) - (rang[b.zone.cle] ?? 3);
    })
    .slice(0, 6);

  const corps = lignes.length
    ? lignes.map(({ p, zone, proche }) => {
        const clic = p.isGroupeCap
          ? `App.voirDetailGroupe('${escHtml((p.paliers || []).map(x => x.isin).filter(Boolean).join(','))}')`
          : `App.voirDetail('${escHtml(p.isin)}')`;
        return `
        <div class="alerte-item" onclick="${clic}">
          <div class="alerte-id">
            <div class="alerte-nom">${escHtml(alerteNom(p))}</div>
            <div class="alerte-statut alerte-statut--${zone.cle}">${escHtml(proche || zone.label)}</div>
          </div>
          <div class="alerte-droite">
            <div class="alerte-niveau tnum">${escHtml(pctDuStrike(p))}</div>
            <div class="alerte-constat tnum">Constat. ${escHtml(fmtDatePanneau(p.constat))}</div>
          </div>
        </div>`; }).join('')
    : `<div class="alerte-vide">Aucun produit en alerte.</div>`;

  return `
      <div class="card p-18 mb-24 bureau-seul">
        <div class="card-title">Alertes portefeuille</div>
        <div class="section-hint mb-12">Produits en zone de rappel ou proches d'une barrière</div>
        <div class="alertes-liste">${corps}</div>
      </div>`;
}

// ── Actualités : catégories éditoriales (couleur d'avatar) ──
// Une catégorie → une couleur ; la lettre de l'avatar est la 1re lettre du libellé affiché.
const NEWS_CATS = {
  'TAUX':          '#b0862f', // or / ocre
  'INFLATION':     '#a15a3a', // terracotta
  'MARCHÉS':       '#16304f', // bleu nuit
  'INTERNATIONAL': '#4d7a4f', // vert
  'RÉGULATION':    '#3f6cc4', // bleu
};
const NEWS_CAT_DEFAUT = '#7a6840';

// Mappe un tag de flux RSS (renvoyé par le back/Worker) vers une catégorie connue,
// pour partager la palette avec la veille curée.
const RSS_TAG_CAT = {
  'BCE / Taux':'TAUX', 'Fed / Taux':'TAUX', 'Obligataire':'TAUX', 'Inflation':'INFLATION',
  'Marchés':'MARCHÉS', 'CAC 40':'MARCHÉS', 'Régulation':'RÉGULATION', 'International':'INTERNATIONAL',
  'BNP Paribas':'MARCHÉS', 'Stellantis':'MARCHÉS', 'Capgemini':'MARCHÉS',
  'Rheinmetall':'MARCHÉS', 'ES Banks':'MARCHÉS',
};

function newsCatColor(cat) {
  return NEWS_CATS[String(cat || '').toUpperCase()] || NEWS_CAT_DEFAUT;
}

// Parse une date FR ("11 juin 2026", "1er juillet 2026") → timestamp, pour le tri. 0 si illisible.
const NEWS_MOIS_FR = {
  janvier:0, 'février':1, fevrier:1, mars:2, avril:3, mai:4, juin:5, juillet:6,
  'août':7, aout:7, septembre:8, octobre:9, novembre:10, 'décembre':11, decembre:11,
};
function newsDateTs(s) {
  if (!s) return 0;
  const m = String(s).toLowerCase().match(/(\d{1,2})(?:er)?\s+([a-zàâäéèêëîïôöûü]+)\s+(\d{4})/);
  if (!m) { const d = new Date(s); return isNaN(d) ? 0 : d.getTime(); }
  const mois = NEWS_MOIS_FR[m[2]];
  if (mois == null) return 0;
  return new Date(+m[3], mois, +m[1]).getTime();
}

// Carte d'actualité unifiée — utilisée par la veille curée ET le fil RSS.
// opts : { label, color, titre, resume?, date?, meta?, lien? }
//   date → affichée en haut à droite ; meta → ligne discrète en bas (ex. source RSS).
function newsCardHtml({ label, color, titre, resume, date, meta, lien }) {
  const lettre = String(label || '?').trim().charAt(0).toUpperCase();
  const inner = `
    <div class="news-avatar" style="background:${color}">${escHtml(lettre)}</div>
    <div class="news-card-body">
      <div class="news-card-head">
        ${label ? `<div class="news-cat" style="color:${color}">${escHtml(label)}<span class="news-cat-dot" style="background:${color}"></span></div>` : '<span></span>'}
        ${date ? `<div class="news-card-date">${escHtml(date)}</div>` : ''}
      </div>
      <div class="news-card-titre">${escHtml(titre || '')}</div>
      ${resume ? `<div class="news-card-resume">${escHtml(resume)}</div>` : ''}
      ${meta ? `<div class="news-card-meta">${escHtml(meta)}</div>` : ''}
    </div>`;
  return lien
    ? `<a class="news-card" href="${escHtml(lien)}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="news-card">${inner}</div>`;
}

// Section « À la une » — veille curée (data.js VEILLE). Vide si le tableau est absent/vide.
function renderCuratedNews() {
  if (typeof VEILLE === 'undefined' || !Array.isArray(VEILLE) || !VEILLE.length) return '';
  const source = NEWS_THEME_COURANT
    ? VEILLE.filter(v => String(v.categorie || '').toUpperCase() === NEWS_THEME_COURANT)
    : VEILLE;
  if (!source.length) return '';
  const cards = [...source]
    .sort((a, b) => newsDateTs(b.date) - newsDateTs(a.date))
    .map(v => newsCardHtml({
      label: v.categorie,
      color: newsCatColor(v.categorie),
      titre: v.titre,
      resume: v.resume,
      date: v.date,
    })).join('');
  return `
    <div class="news-group">
      <div class="news-group-title">À la une</div>
      <div class="news-cards">${cards}</div>
    </div>`;
}

// Thème actif de la page Actualités. Mémorisé au niveau du module car renderNewsSection est
// appelé plus tard par chargerActus (chargement asynchrone du fil), hors du rendu de la page.
let NEWS_THEME_COURANT = null;
const NEWS_THEMES = ['TAUX', 'INFLATION', 'MARCHÉS', 'INTERNATIONAL', 'RÉGULATION'];

function renderActus(state) {
  NEWS_THEME_COURANT = (state && state.newsTheme) || null;
  const actif = NEWS_THEME_COURANT;
  const bouton = (val, label) => `
        <div class="news-filtre${(actif === val || (!actif && !val)) ? ' active' : ''}" onclick="App.setNewsTheme(${val ? `'${val}'` : 'null'})">${escHtml(label)}</div>`;
  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Actualités</div>
        <div class="page-sub">Sélection du cabinet · fil marché en direct</div>
      </div>
    </header>
    <div class="page-body">
     <div class="news-split">
      <div class="news-col-fil">
        ${renderCuratedNews()}
        <div class="news-group">
          <div class="news-group-title">Fil en direct</div>
          <div id="news-section" class="news-loading">
            <div class="news-spinner">Chargement des actualités…</div>
          </div>
        </div>
      </div>
      <div class="news-col-filtres bureau-seul">
        <div class="card p-18">
          <div class="card-title mb-12">Filtrer par thème</div>
          ${bouton(null, 'Tous')}
          ${NEWS_THEMES.map(t => bouton(t, t.charAt(0) + t.slice(1).toLowerCase())).join('')}
        </div>
      </div>
     </div>
    </div>
  </div>`;
}

// Rendu du fil RSS live (injecté dans #news-section par chargerActus).
function renderNewsSection(news) {
  const fmtDate = (rssDate) => {
    if (!rssDate) return '';
    try {
      return new Date(rssDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  };

  let tous = [...(news.globales || []), ...(news.produits || [])]
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

  if (NEWS_THEME_COURANT) tous = tous.filter(a => (RSS_TAG_CAT[a.tag] || 'MARCHÉS') === NEWS_THEME_COURANT);

  if (!tous.length) {
    return NEWS_THEME_COURANT
      ? '<p class="news-empty">Aucune actualité sur ce thème.</p>'
      : '<p class="news-empty">Aucune actualité disponible.</p>';
  }

  const cards = tous.map(a => {
    const cat = RSS_TAG_CAT[a.tag] || 'MARCHÉS';
    return newsCardHtml({
      label: a.tag || cat,
      color: newsCatColor(cat),
      titre: a.titre,
      date: fmtDate(a.date),
      meta: a.source,
      lien: a.lien,
    });
  }).join('');
  return `<div class="news-cards">${cards}</div>`;
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
// Couleur de la pastille de statut à partir de la zone du niveau (bureau : colonne « Statut »).
function statutPillClasse(cle) {
  if (cle === 'risque') return 'red';
  if (cle === 'rappel' || cle === 'coupon') return 'green';
  return 'grey';
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
          ${geo.niveauPos != null ? `<div class="ac-bar-niveau ac-bar-niveau--${zone.cle}" style="left:${geo.niveauPos}%"><span class="ac-bar-niveau-val">${fmtBarreBarriereCourt(geo.niveauVal, isCms)}</span><span class="ac-bar-niveau-dot"></span></div>` : ''}
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
      <div class="ac-info-row ac-info-row--coupon"><span class="ac-info-label">Coupon :</span><span class="ac-info-val ac-info-val--coupon">${escHtml(fmtCouponAnnuel(r.coupon))}</span></div>
      <div class="ac-info-sub">${escHtml(reserveLabelAutocall(r))}</div>
      <div class="ac-info-row ac-info-row--constat">
        <span class="ac-info-label">Proch. constat :</span>
        <span class="ac-info-val">${escHtml(formatDateCourte(r.constat) || formatDateLongue(r.constat))}</span>
      </div>
      <div class="ac-info-statut"><span class="ac-statut-pill ${statutPillClasse(zone.cle)}">${escHtml(zone.label)}</span></div>`;

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
          ${geo.niveauPos != null ? `<div class="ac-bar-niveau ac-bar-niveau--${zone.cle}" style="left:${geo.niveauPos}%"><span class="ac-bar-niveau-val">${fmtBarreBarriereCourt(geo.niveauVal, false)}</span><span class="ac-bar-niveau-dot"></span></div>` : ''}
        </div>
      </div>`
    : '';

  // Coupon du groupe : un seul taux si tous les paliers partagent le même, sinon une fourchette.
  const couponsGroupe = [...new Set(r.paliers.map(p => parseFloat(String(p.coupon).replace(',', '.'))).filter(n => !isNaN(n)))].sort((a, b) => a - b);
  const fmtTaux = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const couponTxtGroupe = couponsGroupe.length === 0 ? '—'
    : couponsGroupe.length === 1 ? '+' + fmtTaux(couponsGroupe[0]) + ' %/an'
    : '+' + fmtTaux(couponsGroupe[0]) + ' à ' + fmtTaux(couponsGroupe[couponsGroupe.length - 1]) + ' %/an';

  const infoBlock = `
      <div class="ac-info-row ac-info-row--coupon"><span class="ac-info-label">Coupon :</span><span class="ac-info-val ac-info-val--coupon">${escHtml(couponTxtGroupe)}</span></div>
      <div class="ac-info-sub">${escHtml(reserveLabelAutocall(r))}</div>
      <div class="ac-info-row ac-info-row--constat">
        <span class="ac-info-label">Proch. constat :</span>
        <span class="ac-info-val">${escHtml(formatDateCourte(r.constat) || formatDateLongue(r.constat))}</span>
      </div>
      <div class="ac-info-statut"><span class="ac-statut-pill ${statutPillClasse(zone.cle)}">${escHtml(zone.label)}</span></div>`;

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

  // Bureau : liste compacte à gauche, fiche du produit sélectionné à droite (split
  // master-détail). Mobile : le panneau est masqué en CSS et la fiche s'ouvre en feuille.
  const detailIsin  = state.detailIsin || null;
  const detailIsins = state.detailIsins || null;

  const estSelectionne = (r) => {
    if (r.isGroupeCap) {
      if (!detailIsins) return false;
      const isinsRow = (r.paliers || []).map(p => p.isin).filter(Boolean);
      return isinsRow.length > 0 && isinsRow.length === detailIsins.length && isinsRow.every(i => detailIsins.includes(i));
    }
    return !!detailIsin && r.isin === detailIsin;
  };

  // Le panneau de droite ne reste jamais vide : sans sélection explicite, il présente le
  // premier produit actif de la liste.
  const selectionExplicite = rows.find(estSelectionne) || null;
  const selection = selectionExplicite || rows.find(r => !r.rappele) || null;

  const carteHtml = (r) => {
    const actif = selectionExplicite ? estSelectionne(r) : r === selection;
    const c = cardAutocallHtml(r);
    return actif ? c.replace('class="ac-card', 'class="ac-card ac-card--actif') : c;
  };

  const membresDe = (g) => (g.paliers || []).map(p => p.isin).map(i => produits.find(x => x.isin === i)).filter(Boolean);
  let panneau = '<div class="ac-detail-vide">Sélectionnez un produit pour afficher sa fiche.</div>';
  if (selection && selection.isGroupeCap) {
    const membres = membresDe(selection);
    if (membres.length) panneau = renderDetailPanneauGroupe(membres);
  } else if (selection) {
    panneau = renderDetailPanneau(selection);
  }

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Autocall</div>
        <div class="page-sub">Produits à mécanisme de rappel automatique</div>
      </div>
    </header>

    <div class="page-body">
      <div class="ac-split">
        <div class="ac-col-liste">
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
            ${rows.length ? rows.map(carteHtml).join('') : `<div class="ac-empty">Aucun produit ne correspond à cette recherche.</div>`}
          </div>

          <div class="table-note">Données indicatives · validation humaine obligatoire.</div>
        </div>

        <div class="ac-col-detail">${panneau}</div>
      </div>
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

// Corps d'une fiche détail (synthèse + graphique + description), partagé par la feuille
// mobile (renderDetail) et le dépliage en ligne du bureau (renderDetailInline).
function detailCorpsHtml(produit) {
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
    <div class="detail-content">
      ${detailInfoGrid(infoBoxes)}

      ${produit.type === 'equity' ? `
      <div class="detail-cmp bureau-seul">
        <label class="detail-cmp-label">
          <input type="checkbox" id="cmp-ref" onchange="App.toggleComparaisonRef(this.checked)">
          Comparer à un indice de référence
        </label>
      </div>` : ''}

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
    </div>`;
}

function detailTypeLabel(produit) {
  return produit.type === 'equity' ? 'Actions' : 'Taux (CMS)';
}

function renderDetail(produit) {
  return `
  <div class="sheet-backdrop" onclick="if(event.target===this) App.fermerDetail()">
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="page-title">${escHtml(produit.nom)}</div>
        <div class="page-sub">${escHtml(produit.isin)} · ${detailTypeLabel(produit)}</div>
      </div>
      ${detailCorpsHtml(produit)}
    </div>
  </div>`;
}

// Niveau courant mis en avant en tête du panneau (valeur + écart au strike / zone).
function detailNiveauHtml(produit) {
  const zone = zoneNiveau(produit);
  const isCms = produit.type === 'cms';
  const sousTxt = (!isCms && produit.pct) ? escHtml(String(produit.pct)) + ' du strike' : zone.label;
  const cls = produit.k === 'red' ? 'red' : produit.k === 'orange' ? 'orange' : 'green';
  return `
      <div class="ac-detail-niveau">
        <div class="ac-detail-niveau-val tnum">${escHtml(String(produit.niveau ?? '—'))}</div>
        <div class="ac-detail-niveau-delta ${cls}">${sousTxt}</div>
      </div>`;
}

// Bureau : fiche affichée en permanence dans la colonne de droite (split master-détail).
function renderDetailPanneau(produit) {
  const sous = `${escHtml(produit.sjLabel || produit.sj || '')} · Constat. ${escHtml(fmtDatePanneau(produit.constat))} · Échéance ${escHtml(fmtDatePanneau(produit.ech))}`;
  return `
  <div class="ac-detail-panneau" data-isin="${escHtml(produit.isin)}">
    <div class="ac-detail-entete">
      <div class="ac-detail-id">
        <div class="ac-detail-titre">${escHtml(produit.nom)}</div>
        <div class="ac-detail-sous">${sous}</div>
      </div>
      ${detailNiveauHtml(produit)}
    </div>
    ${detailCorpsHtml(produit)}
  </div>`;
}

function renderDetailPanneauGroupe(membres) {
  const ref = membres[0];
  return `
  <div class="ac-detail-panneau" data-isins="${escHtml(membres.map(m => m.isin).join(','))}">
    <div class="ac-detail-entete">
      <div class="ac-detail-id">
        <div class="ac-detail-titre">${escHtml(detailGroupeNom(ref))}</div>
        <div class="ac-detail-sous">${detailGroupeSous(ref)}</div>
      </div>
      ${detailNiveauHtml(ref)}
    </div>
    ${detailCorpsGroupeHtml(membres)}
  </div>`;
}

function detailCorpsGroupeHtml(membres) {
  const ref = membres[0];
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
    <div class="detail-content">
      ${detailInfoGrid(infoBoxes)}

      <div class="detail-cmp bureau-seul">
        <label class="detail-cmp-label">
          <input type="checkbox" id="cmp-ref" onchange="App.toggleComparaisonRef(this.checked)">
          Comparer à un indice de référence
        </label>
      </div>

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
    </div>`;
}

function detailGroupeNom(ref) { return ref.nom.replace(/\bCAP\s+\d+\s+/, 'CAP '); }
function detailGroupeSous(ref) { return `${escHtml(ref.sjLabel || ref.sj)} · Constat. ${escHtml(fmtDatePanneau(ref.constat))} · Échéance ${escHtml(fmtDatePanneau(ref.ech))}`; }
// Dates du panneau : format court cohérent avec les cartes, repli sur la valeur brute.
function fmtDatePanneau(v) {
  if (!v) return '—';
  return formatDateCourte(v) || formatDateLongue(v) || String(v);
}

function renderDetailGroupe(membres) {
  const ref = membres[0];
  return `
  <div class="sheet-backdrop" onclick="if(event.target===this) App.fermerDetail()">
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="page-title">${escHtml(detailGroupeNom(ref))}</div>
        <div class="page-sub">${detailGroupeSous(ref)}</div>
      </div>
      ${detailCorpsGroupeHtml(membres)}
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

  // Bureau : l'UC sélectionnée s'affiche dans le panneau de droite (jamais vide → 1re UC).
  const ucSelExplicite = ucFiltrees.find(u => u.isin === (state && state.ucSel)) || null;
  const ucCourante = ucSelExplicite || ucFiltrees.find(u => u.graphId) || ucFiltrees[0] || null;
  const ucSel = ucCourante ? ucCourante.isin : null;
  const ucPanneau = renderUCPanneau(ucCourante, ucPerfs);

  return `
  <div>
    <header class="page-header">
      <div>
        <div class="page-title">Fonds € &amp; UC</div>
        <div class="page-sub">Fonds en euros · Unités de compte · Le Conservateur</div>
      </div>
    </header>

    <div class="page-body">
     <div class="ac-split">
      <div class="ac-col-liste">

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
        <div class="uc-item${u.graphId ? ' clic' : ''}${u.isin === ucSel ? ' uc-item--actif' : ''}"${u.graphId ? ` onclick="App.ouvrirUC('${u.isin}')"` : ''}>
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
      </div><!-- /ac-col-liste -->

      <div class="ac-col-detail">${ucPanneau}</div>
     </div><!-- /ac-split -->
    </div>
  </div>`;
}

// Panneau de droite de la page Fonds : identité de l'UC + graphique et composition.
function renderUCPanneau(u, ucPerfs) {
  if (!u) return '<div class="ac-detail-vide">Sélectionnez une unité de compte pour afficher sa fiche.</div>';
  const p = ucPerfs ? ucPerfs[u.isin] : null;
  const perfTxt = (p == null || isNaN(p)) ? '—'
    : (p >= 0 ? '+' : '') + p.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  const perfCls = (p == null || isNaN(p)) ? '' : (p >= 0 ? 'green' : 'red');
  return `
  <div class="ac-detail-panneau" data-uc="${escHtml(u.isin)}" data-graph="${escHtml(u.graphId || '')}">
    <div class="ac-detail-entete">
      <div class="ac-detail-id">
        <div class="ac-detail-titre">${escHtml(u.nom)}</div>
        <div class="ac-detail-sous">${escHtml(u.categorie || '')} · ${escHtml(u.isin)} · Actions ${escHtml(String(u.equity ?? '—'))} %</div>
      </div>
      <div class="ac-detail-niveau">
        <div class="ac-detail-niveau-val tnum">${perfTxt}</div>
        <div class="ac-detail-niveau-delta ${perfCls}">depuis le 01/01</div>
      </div>
    </div>
    <div id="uc-chart-inline" class="detail-chart-inline"></div>
  </div>`;
}

// ── Feuilles modales (bottom sheet) : poignée déplaçable au doigt ──
// Partagé entre les fiches détail Autocall (app.js) et le graphique UC (chart.js), qui utilisent
// tous les deux le même gabarit .sheet-backdrop/.sheet-panel/.sheet-handle.
// Tirer vers le bas referme la feuille (ou la ramène en position repliée si elle est dépliée) ;
// tirer vers le haut la déplie en plein écran. Un simple tap sans déplacement ne fait rien.
function initSheetDrag(panel, onClose) {
  const handle = panel && panel.querySelector('.sheet-handle');
  if (!handle) return;
  const SEUIL_FERMETURE = 90;
  const SEUIL_DEPLI = 40;
  let startY = 0, dragging = false, expanded = false;

  function position(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  function onMove(e) {
    if (!dragging) return;
    let delta = position(e) - startY;
    if (expanded) delta = Math.max(delta, 0); // depuis l'état déplié, on ne tire que vers le bas
    else delta = Math.max(delta, -80);
    if (e.cancelable) e.preventDefault();
    panel.style.transform = `translateY(${delta}px)`;
  }

  function onEnd(e) {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('sheet-dragging');
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onEnd);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    const delta = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - startY;
    panel.style.transform = '';
    if (delta > SEUIL_FERMETURE) {
      if (expanded) { panel.classList.remove('sheet-expanded'); expanded = false; }
      else if (onClose) onClose();
    } else if (delta < -SEUIL_DEPLI && !expanded) {
      panel.classList.add('sheet-expanded');
      expanded = true;
    }
  }

  function onStart(e) {
    dragging = true;
    startY = position(e);
    panel.classList.add('sheet-dragging');
    if (!e.touches) e.preventDefault(); // souris : évite la sélection de texte pendant le tirage
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }

  handle.addEventListener('touchstart', onStart, { passive: true });
  handle.addEventListener('mousedown', onStart);
}
