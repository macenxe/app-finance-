// Graphique d'évolution d'un sous-jacent (modale).
// Historique servi par le Cloudflare Worker (?history=TICKER&period=KEY).
// Vanilla, sans dépendance. Survol (souris) ou glissement (tactile) = lecture prix + date.

const Chart = (() => {
  const WORKER = (typeof AppAPI !== 'undefined' && AppAPI.worker) || 'https://app-finance-live.maxenceevrd.workers.dev';

  const PERIODES = [
    { key: '1j',  label: 'Jour'    },
    { key: '1s',  label: 'Semaine' },
    { key: '1m',  label: 'Mois'    },
    { key: '6m',  label: '6 mois'  },
    { key: 'ytd', label: 'YTD'     },
    { key: '1a',  label: '1 an'    },
    { key: '3a',  label: '3 ans'   },
    { key: '5a',  label: '5 ans'   },
    { key: '10a', label: '10 ans'  },
  ];
  // Version compacte (Jour / Semaine / 3 ans retirés) : tient sur une seule ligne. Utilisée
  // pour les fiches détail Autocall et Fonds, où la lisibilité prime sur le choix fin de période.
  const PERIODES_COMPACT = PERIODES.filter(p => !['1j', '1s', '3a'].includes(p.key));
  const DEFAUT = '1a';

  // Géométrie du tracé (unités viewBox).
  const VBW = 640, VBH = 300, padL = 14, padR = 14, padT = 16, padB = 26;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB;

  let etat = { ticker: null, label: '', periode: DEFAUT, points: [], geo: null };

  const fmtPrix = (n) => n == null ? '—'
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function fmtDate(ts, periode) {
    const d = new Date(ts * 1000);
    // Séries journalières (taux, CMS) : pas d'intraday → on n'affiche jamais l'heure.
    const intraday = !etat.dateOnly && (periode === '1j' || periode === '1s');
    return d.toLocaleString('fr-FR', intraday
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // opts (optionnel) : { lignes:[{valeur,label,couleur}], retour:fn, sous:'libellé', compoIsin:'ISIN', sheet:bool }
  function ouvrir(ticker, label, opts) {
    opts = opts || {};
    // Séries sans intraday (FRED, inflation, swap CMS, fonds Yahoo 0P…F) : pas d'heure ni
    // « Jour » (un fonds n'a qu'une VL par jour → Yahoo renvoie 404 en 1j).
    const dateOnly = /^(fred:|hicp:|scrape:)/.test(ticker) || /^0P\w+\.F$/i.test(ticker);
    const periodes = opts.sheet ? PERIODES_COMPACT : (dateOnly ? PERIODES.filter(p => p.key !== '1j') : PERIODES);
    etat = {
      ticker, label: label || ticker, periode: DEFAUT, points: [], geo: null,
      lignes: opts.lignes || [], retour: opts.retour || null, sous: opts.sous || '',
      compoIsin: opts.compoIsin || null, sheet: !!opts.sheet, dateOnly, periodes,
    };
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = gabarit();
    if (etat.sheet) {
      const backdrop = root.querySelector('.sheet-backdrop');
      void backdrop.offsetWidth; // force le reflow pour déclencher la transition d'ouverture
      backdrop.classList.add('sheet-open');
      const panel = backdrop.querySelector('.sheet-panel');
      if (panel && typeof initSheetDrag === 'function') initSheetDrag(panel, fermer);
    }
    charger(DEFAUT);
    if (etat.compoIsin) chargerCompo(etat.compoIsin);
  }

  function fermer() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    if (etat.sheet) {
      const backdrop = root.querySelector('.sheet-backdrop');
      if (!backdrop) { root.innerHTML = ''; return; }
      backdrop.classList.remove('sheet-open');
      setTimeout(() => { root.innerHTML = ''; }, 300);
    } else {
      root.innerHTML = '';
    }
  }

  function gabarit() {
    const esc = (s) => (window.escHtml ? escHtml(s) : s);
    const titre = esc(etat.label);
    const corps = `
        <div class="chart-titre-zone">
          ${etat.retour ? `<button class="chart-retour" onclick="Chart.retour()" aria-label="Retour">←</button>` : ''}
          <span style="min-width:0;">
            <span class="modal-title">${titre}</span>
            <div class="chart-sous" id="chart-sous"${etat.sous ? '' : ' style="display:none"'}>${etat.sous ? 'Sous-jacent : ' + esc(etat.sous) : ''}</div>
          </span>
        </div>
        ${etat.sheet ? '' : `<button class="modal-close" onclick="Chart.fermer()">✕</button>`}
      </div>
      <div class="modal-body chart-body">
        <div class="chart-readout">
          <div class="chart-prix tnum" id="chart-prix">—</div>
          <div class="chart-meta">
            <span class="chart-var tnum" id="chart-var"></span>
            <span class="chart-date" id="chart-date"></span>
          </div>
        </div>
        <div class="chart-zone" id="chart-zone">
          <div class="chart-loading">Chargement…</div>
        </div>
        <div class="chart-periodes">
          ${etat.periodes.map(p => `<button class="chart-per${p.key === etat.periode ? ' active' : ''}" data-per="${p.key}" onclick="Chart.changer('${p.key}')">${p.label}</button>`).join('')}
        </div>
        <div class="chart-compo" id="chart-compo"></div>
      </div>`;
    return etat.sheet ? `
    <div class="sheet-backdrop" onclick="if(event.target===this)Chart.fermer()">
      <div class="sheet-panel chart-panel">
        <div class="sheet-handle"></div>
        <div class="modal-header">${corps}
      </div>
    </div>` : `
    <div class="modal-overlay" onclick="if(event.target===this)Chart.fermer()">
      <div class="modal-panel chart-panel">
        <div class="modal-header">${corps}
      </div>
    </div>`;
  }

  function changer(periode) { if (periode !== etat.periode) charger(periode); }

  async function charger(periode) {
    etat.periode = periode;
    majBoutons();
    const zone = document.getElementById('chart-zone');
    if (zone) zone.innerHTML = '<div class="chart-loading">Chargement…</div>';
    try {
      const url = (typeof AppAPI !== 'undefined' && AppAPI.historyUrl)
        ? AppAPI.historyUrl(etat.ticker, periode)
        : `${WORKER}?history=${encodeURIComponent(etat.ticker)}&period=${periode}`;
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      etat.points = data.points || [];
      // Séries statiques (FRED) : le JSON contient tout l'historique → on filtre par période.
      if (etat.ticker.indexOf('fred:') === 0 || etat.ticker.indexOf('hicp:') === 0) {
        etat.points = filtrerPeriode(etat.points, periode);
      }
      // Mention « proxy » éventuelle (ex. CMS 10 ans = rendement 10 ans zone euro).
      const sousEl = document.getElementById('chart-sous');
      if (sousEl) {
        const txt = data.proxy || (etat.sous ? 'Sous-jacent : ' + etat.sous : '');
        sousEl.textContent = txt;
        sousEl.style.display = txt ? '' : 'none';
      }
      if (etat.points.length < 2) {
        if (zone) zone.innerHTML = '<div class="chart-loading">Données indisponibles pour cette période.</div>';
        majReadout(null);
        return;
      }
      dessiner();
    } catch (e) {
      if (zone) zone.innerHTML = '<div class="chart-loading">Données indisponibles (' + (e.message || 'erreur') + ').</div>';
      majReadout(null);
    }
  }

  function majBoutons() {
    document.querySelectorAll('.chart-per').forEach(b =>
      b.classList.toggle('active', b.dataset.per === etat.periode));
  }

  function dessiner() {
    const pts = etat.points, n = pts.length;
    const vals = pts.map(p => p.c);
    const minA = Math.min(...vals), maxA = Math.max(...vals); // haut / bas des prix

    // Repères aux strikes : on les inclut dans l'échelle pour qu'ils restent visibles.
    const lignes = (etat.lignes || []).filter(l => l.valeur != null && isFinite(l.valeur));
    const bornes = vals.concat(lignes.map(l => l.valeur));
    let min = Math.min(...bornes), max = Math.max(...bornes);
    if (min === max) { min -= 1; max += 1; }
    const marge = (max - min) * 0.08; min -= marge; max += marge;

    const X = i => padL + (i / (n - 1)) * plotW;
    const Y = c => padT + (1 - (c - min) / (max - min)) * plotH;

    // Taux & indicateurs (fred/hicp/CMS) : une baisse est favorable → couleur inversée.
    const monte = pts[n - 1].c >= pts[0].c;
    const favorable = /^(fred:|hicp:|scrape:)/.test(etat.ticker) ? !monte : monte;
    const couleur = favorable ? '#1d6f4c' : '#9a3535';

    let d = '';
    for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(pts[i].c).toFixed(1) + ' ';
    const aire = d + `L ${X(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${X(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

    // 3 lignes de repère horizontales (haut / milieu / bas du tracé).
    const niveaux = [maxA, (minA + maxA) / 2, minA];
    const grille = niveaux.map(v => `<line x1="${padL}" y1="${Y(v).toFixed(1)}" x2="${VBW - padR}" y2="${Y(v).toFixed(1)}" class="chart-grid"/>`).join('');

    // Repères fins aux strikes / barrières.
    const strikesSvg = lignes.map(l => `<line x1="${padL}" y1="${Y(l.valeur).toFixed(1)}" x2="${VBW - padR}" y2="${Y(l.valeur).toFixed(1)}" stroke="${l.couleur}" stroke-width="1" stroke-dasharray="4 3" opacity="0.85"/>`).join('');
    const strikesLab = lignes.map(l => `<span class="chart-ligne-lab" style="top:${(Y(l.valeur) / VBH * 100).toFixed(2)}%;color:${l.couleur}">${l.label} ${fmtPrix(l.valeur)}</span>`).join('');

    const zone = document.getElementById('chart-zone');
    zone.innerHTML = `
      <svg id="chart-svg" viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="${couleur}" stop-opacity="0.16"/>
          <stop offset="1" stop-color="${couleur}" stop-opacity="0"/>
        </linearGradient></defs>
        ${grille}
        <path d="${aire}" fill="url(#chart-grad)" stroke="none"/>
        <path d="${d}" fill="none" stroke="${couleur}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>
        ${strikesSvg}
        <line id="chart-cross" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}" class="chart-cross" style="display:none"/>
        <circle id="chart-dot" r="3.6" fill="${couleur}" stroke="#fff" stroke-width="1.4" style="display:none"/>
        <rect x="0" y="0" width="${VBW}" height="${VBH}" fill="transparent" pointer-events="all"/>
      </svg>
      <span class="chart-hl" style="top:${(Y(maxA) / VBH * 100).toFixed(2)}%">${fmtPrix(maxA)}</span>
      <span class="chart-hl" style="top:${(Y(minA) / VBH * 100).toFixed(2)}%">${fmtPrix(minA)}</span>
      ${strikesLab}
      <span class="chart-xlab" style="left:${(padL / VBW * 100).toFixed(2)}%">${fmtDate(pts[0].t, etat.periode)}</span>
      <span class="chart-xlab" style="right:${(padR / VBW * 100).toFixed(2)}%">${fmtDate(pts[n - 1].t, etat.periode)}</span>`;

    etat.geo = { X, Y, n };
    majReadout(n - 1);
    attacherSurvol();
  }

  function majReadout(i) {
    const prixEl = document.getElementById('chart-prix');
    const varEl = document.getElementById('chart-var');
    const dateEl = document.getElementById('chart-date');
    if (!prixEl) return;
    if (i == null || !etat.points.length) { prixEl.textContent = '—'; varEl.textContent = ''; dateEl.textContent = ''; return; }
    const p = etat.points[i];
    prixEl.textContent = fmtPrix(p.c);
    dateEl.textContent = fmtDate(p.t, etat.periode);
    const base = etat.points[0].c;
    if (/^(fred:|hicp:|scrape:)/.test(etat.ticker)) {
      // Taux & indicateurs : variation en points de base + baisse favorable → couleur inversée.
      const pb = Math.round((p.c - base) * 100);
      varEl.textContent = (pb > 0 ? '+' : '') + pb + ' pb sur la période';
      varEl.className = 'chart-var tnum ' + (pb === 0 ? 'flat' : pb < 0 ? 'up' : 'down');
    } else {
      const pct = base ? (p.c - base) / base * 100 : 0;
      const up = pct >= 0;
      varEl.textContent = (up ? '+' : '') + pct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' % sur la période';
      varEl.className = 'chart-var tnum ' + (up ? 'up' : 'down');
    }
  }

  function attacherSurvol() {
    const svg = document.getElementById('chart-svg');
    if (!svg) return;
    const { X, Y, n } = etat.geo;
    const cross = document.getElementById('chart-cross');
    const dot = document.getElementById('chart-dot');

    const indexDepuis = (e) => {
      const r = svg.getBoundingClientRect();
      const vbX = (e.clientX - r.left) / r.width * VBW;
      return Math.max(0, Math.min(n - 1, Math.round((vbX - padL) / plotW * (n - 1))));
    };
    const montrer = (i) => {
      const x = X(i), y = Y(etat.points[i].c);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.style.display = '';
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.style.display = '';
      majReadout(i);
    };

    svg.addEventListener('pointerdown', e => { try { svg.setPointerCapture(e.pointerId); } catch (_) {} montrer(indexDepuis(e)); });
    svg.addEventListener('pointermove', e => montrer(indexDepuis(e)));
    svg.addEventListener('pointerleave', () => {
      cross.style.display = 'none'; dot.style.display = 'none'; majReadout(n - 1);
    });
  }

  function retour() { if (etat.retour) etat.retour(); }

  // ── Séries statiques : filtrage par période côté client ──
  const JOURS_P = { '1j': 3, '1s': 10, '1m': 35, '6m': 190, ytd: null, '1a': 380, '3a': 1100, '5a': 1850, '10a': 3700 };
  function filtrerPeriode(points, periode) {
    let cutoff;
    if (periode === 'ytd') cutoff = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    else cutoff = Math.floor((Date.now() - (JOURS_P[periode] || 190) * 86400000) / 1000);
    const f = points.filter(p => p.t >= cutoff);
    return f.length >= 2 ? f : points.slice(-6);
  }

  // ── Composition d'une UC (sous le graphique) ──
  async function chargerCompo(isin) {
    const el = document.getElementById('chart-compo');
    if (!el) return;
    el.innerHTML = '<div class="chart-loading" style="padding:8px 0">Composition…</div>';
    try {
      const r = await fetch(`./data/uc-compo/${isin}.json`, { cache: 'force-cache' });
      if (!r.ok) throw 0;
      renderCompo(await r.json());
    } catch (_) {
      el.innerHTML = '<div class="chart-compo-note">Composition indisponible pour cette UC.</div>';
    }
  }

  function renderCompo(d) {
    const el = document.getElementById('chart-compo');
    if (!el) return;
    const esc = (s) => (window.escHtml ? escHtml(String(s)) : String(s));
    const a = d.alloc || {};
    const v = { action: Math.max(0, a.action || 0), obligation: Math.max(0, a.obligation || 0), liquidite: Math.max(0, a.liquidite || 0), autre: Math.max(0, a.autre || 0) };
    const tot = v.action + v.obligation + v.liquidite + v.autre || 1;
    const COLS = { action: '#16304f', obligation: '#5b6b80', liquidite: '#c9a96a', autre: '#b5ab95' };
    const LAB = { action: 'Actions', obligation: 'Obligations', liquidite: 'Liquidités', autre: 'Autres' };
    const seg = Object.keys(v).filter(k => v[k] > 0.4)
      .map(k => `<div class="compo-seg" style="width:${(v[k] / tot * 100).toFixed(1)}%;background:${COLS[k]}"></div>`).join('');
    const leg = Object.keys(v).filter(k => v[k] > 0.4)
      .map(k => `<span class="compo-leg"><span class="compo-pastille" style="background:${COLS[k]}"></span>${LAB[k]} ${Math.round(v[k])} %</span>`).join('');
    const secteurs = (d.secteurs || []).slice(0, 6).map(s => `
      <div class="compo-sect">
        <span class="compo-sect-nom">${esc(s.nom)}</span>
        <span class="compo-sect-bar"><span style="width:${Math.min(100, s.pct * 3).toFixed(0)}%"></span></span>
        <span class="compo-sect-val tnum">${s.pct} %</span>
      </div>`).join('');
    const holdings = (d.holdings || []).length
      ? d.holdings.map(h => `<div class="compo-hold"><span class="compo-hold-nom">${esc(h.nom)}</span><span class="tnum">${h.pct} %</span></div>`).join('')
      : '<div class="chart-compo-note">Principales lignes non communiquées par la source.</div>';
    el.innerHTML = `
      <div class="compo-titre">Répartition par classe d'actifs</div>
      <div class="compo-barre">${seg}</div>
      <div class="compo-legende">${leg}</div>
      ${secteurs ? `<div class="compo-titre">Secteurs</div><div class="compo-secteurs">${secteurs}</div>` : ''}
      <div class="compo-titre">Principales lignes</div>
      <div class="compo-holdings">${holdings}</div>
      <div class="chart-compo-note">Répartition géographique non disponible en source gratuite. Source : Yahoo Finance / Morningstar, dernier reporting connu.</div>`;
  }

  function ouvrirInline(containerId, ticker, label, opts) {
    opts = opts || {};
    // Séries sans intraday (FRED, inflation, swap CMS, fonds Yahoo 0P…F) : pas d'heure ni
    // « Jour » (un fonds n'a qu'une VL par jour → Yahoo renvoie 404 en 1j).
    const dateOnly = /^(fred:|hicp:|scrape:)/.test(ticker) || /^0P\w+\.F$/i.test(ticker);
    // Toujours utilisé en fiche détail Autocall : périodes compactes, une seule ligne.
    const periodes = PERIODES_COMPACT;
    etat = {
      ticker, label: label || ticker, periode: DEFAUT, points: [], geo: null,
      lignes: opts.lignes || [], retour: null, sous: opts.sous || '',
      compoIsin: opts.compoIsin || null, inlineId: containerId, dateOnly, periodes,
    };
    const el = document.getElementById(containerId);
    if (!el) return;
    const esc = (s) => (window.escHtml ? escHtml(s) : s);
    el.innerHTML = `
      <div class="chart-readout">
        <div class="chart-prix tnum" id="chart-prix">—</div>
        <div class="chart-meta">
          <span class="chart-var tnum" id="chart-var"></span>
          <span class="chart-date" id="chart-date"></span>
        </div>
      </div>
      <div class="chart-zone" id="chart-zone"><div class="chart-loading">Chargement…</div></div>
      <div class="chart-periodes">
        ${periodes.map(p => `<button class="chart-per${p.key === etat.periode ? ' active' : ''}" data-per="${p.key}" onclick="Chart.changer('${p.key}')">${p.label}</button>`).join('')}
      </div>
      <div class="chart-compo" id="chart-compo"></div>`;
    charger(DEFAUT);
    if (etat.compoIsin) chargerCompo(etat.compoIsin);
  }

  // ── Graphique comparé (plusieurs séries) ──────────────────────────────────────────────
  // Les séries n'ont pas la même échelle (un indice à 8 000 pts et une action à 8 €) : on
  // les ramène toutes en base 100 au début de la période. L'axe exprime donc une
  // performance relative, pas un prix — les repères de barrières n'y ont pas de sens.
  const CMP_COULEURS = ['#16304f', '#1d6f4c', '#b06a1a', '#9a3535', '#2c5f8a', '#6b4c9a', '#1a7a7a', '#7a5a3a'];
  // Gabarit plus bas que le graphique détail (300) : la comparaison n'a pas besoin d'autant
  // de hauteur (pas de repères de barrières), et le tableau de bord doit tenir sans défiler.
  const CMP_VBH = 115;
  const cmpPlotH = CMP_VBH - padT - padB;
  let etatCmp = null;

  // Courbe lissée (Catmull-Rom → Bézier cubique) plutôt que des segments droits : utilisée
  // par le graphique comparé ET les sparklines (exposée via Chart.smooth pour app.js).
  // pts : [[x,y], ...]
  function smoothPathD(pts) {
    if (!pts.length) return '';
    if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  // series : [{ ticker, label, couleur? }]
  function comparer(containerId, series, opts) {
    opts = opts || {};
    const el = document.getElementById(containerId);
    if (!el) return;
    etatCmp = {
      containerId,
      series: (series || []).filter(s => s && s.ticker),
      periode: opts.periode || DEFAUT,
      periodes: PERIODES_COMPACT,
      sets: [],
    };
    el.innerHTML = `
      <div class="chart-cmp-head">
        <div class="chart-cmp-legende" id="chart-cmp-legende"></div>
        <div class="chart-periodes chart-periodes-cmp">
          ${etatCmp.periodes.map(p => `<button class="chart-per chart-per-cmp${p.key === etatCmp.periode ? ' active' : ''}" data-per="${p.key}" onclick="Chart.changerComparaison('${p.key}')">${p.label}</button>`).join('')}
        </div>
      </div>
      <div class="chart-zone" id="chart-cmp-zone"><div class="chart-loading">Chargement…</div></div>
      <div class="chart-cmp-dates" id="chart-cmp-dates"></div>`;
    chargerComparaison();
  }

  function changerComparaison(periode) {
    if (!etatCmp || periode === etatCmp.periode) return;
    etatCmp.periode = periode;
    document.querySelectorAll('.chart-per-cmp').forEach(b => b.classList.toggle('active', b.dataset.per === periode));
    chargerComparaison();
  }

  async function chargerComparaison() {
    if (!etatCmp) return;
    const zone = document.getElementById('chart-cmp-zone');
    if (zone) zone.innerHTML = '<div class="chart-loading">Chargement…</div>';
    const periode = etatCmp.periode;
    const res = await Promise.all(etatCmp.series.map(async (s) => {
      try {
        const url = (typeof AppAPI !== 'undefined' && AppAPI.historyUrl)
          ? AppAPI.historyUrl(s.ticker, periode)
          : `${WORKER}?history=${encodeURIComponent(s.ticker)}&period=${periode}`;
        const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
        if (!r.ok) return null;
        const d = await r.json();
        let pts = d.points || [];
        if (/^(fred:|hicp:)/.test(s.ticker)) pts = filtrerPeriode(pts, periode);
        return pts.length >= 2 ? { ...s, points: pts } : null;
      } catch { return null; }
    }));
    // La période a pu changer pendant les requêtes : on ignore une réponse périmée.
    if (!etatCmp || etatCmp.periode !== periode) return;
    etatCmp.sets = res.filter(Boolean);
    dessinerComparaison();
  }

  function dessinerComparaison() {
    const zone = document.getElementById('chart-cmp-zone');
    const leg  = document.getElementById('chart-cmp-legende');
    const dts  = document.getElementById('chart-cmp-dates');
    if (!zone || !etatCmp) return;
    const esc = (s) => (window.escHtml ? escHtml(String(s)) : String(s));

    if (!etatCmp.sets.length) {
      zone.innerHTML = '<div class="chart-loading">Données indisponibles pour cette période.</div>';
      if (leg) leg.innerHTML = '';
      if (dts) dts.innerHTML = '';
      return;
    }

    const normes = etatCmp.sets.map((s, idx) => {
      const base = s.points[0].c;
      return {
        ...s,
        vals: s.points.map(p => (base ? (p.c / base) * 100 : 100)),
        couleur: s.couleur || CMP_COULEURS[idx % CMP_COULEURS.length],
      };
    });

    const toutes = normes.reduce((acc, s) => acc.concat(s.vals), []);
    let min = Math.min(...toutes), max = Math.max(...toutes);
    if (min === max) { min -= 1; max += 1; }
    const marge = (max - min) * 0.08; min -= marge; max += marge;
    const Y = v => padT + (1 - (v - min) / (max - min)) * cmpPlotH;
    const Xn = n => (i) => padL + (i / (n - 1)) * plotW;

    // Grille horizontale discrète (haut / base 100 / bas) — repère visuel sans surcharger.
    const niveaux = [...new Set([max - marge, 100, min + marge])].filter(v => v >= min && v <= max);
    const grille = niveaux.map(v => `<line x1="${padL}" y1="${Y(v).toFixed(1)}" x2="${VBW - padR}" y2="${Y(v).toFixed(1)}" class="chart-cmp-grid${Math.round(v) === 100 ? ' chart-cmp-grid--base' : ''}"/>`).join('');

    const paths = normes.map((s, idx) => {
      const X = Xn(s.vals.length);
      const pts = s.vals.map((v, i) => [X(i), Y(v)]);
      return `<path class="chart-cmp-line" data-serie="${idx}" d="${smoothPathD(pts)}" fill="none" stroke="${s.couleur}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    const points = normes.map((s, idx) => `<circle class="chart-cmp-pt" data-serie="${idx}" r="3" fill="${s.couleur}" stroke="#fff" stroke-width="1.3" style="display:none"/>`).join('');

    zone.innerHTML = `
      <svg id="chart-cmp-svg" viewBox="0 0 ${VBW} ${CMP_VBH}" xmlns="http://www.w3.org/2000/svg">
        ${grille}${paths}${points}
        <line id="chart-cmp-cross" x1="0" y1="${padT}" x2="0" y2="${padT + cmpPlotH}" class="chart-cross" style="display:none"/>
        <rect x="0" y="0" width="${VBW}" height="${CMP_VBH}" fill="transparent" pointer-events="all"/>
      </svg>`;

    // Conservés pour le survol (attacherSurvolComparaison lit etatCmp.normes/geoCmp).
    etatCmp.normes = normes;
    etatCmp.geoCmp = { Y, Xn, min, max };

    const rendreLegende = (idx) => {
      if (!leg) return;
      leg.innerHTML = normes.map((s, i) => {
        const val = (idx == null) ? s.vals[s.vals.length - 1] : s.vals[Math.min(idx, s.vals.length - 1)];
        const perf = val - 100;
        const txt = (perf >= 0 ? '+' : '') + perf.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
        return `<span class="chart-cmp-item" data-serie="${i}">
          <span class="chart-cmp-trait" style="background:${s.couleur}"></span>${esc(s.label)}
          <span class="chart-cmp-perf ${perf >= 0 ? 'up' : 'down'}">${txt}</span></span>`;
      }).join('');
    };
    etatCmp.rendreLegende = rendreLegende;
    rendreLegende(null);

    if (dts) {
      const p0 = normes[0].points;
      dts.innerHTML = `<span>${fmtDate(p0[0].t, etatCmp.periode)}</span><span id="chart-cmp-date-survol"></span><span>${fmtDate(p0[p0.length - 1].t, etatCmp.periode)}</span>`;
    }
    attacherSurvolComparaison();
  }

  // Survol du graphique comparé : ligne verticale + un point par série, légende mise à jour
  // sur la performance AU JOUR SURVOLÉ (au lieu de la performance totale sur la période).
  function attacherSurvolComparaison() {
    const svg = document.getElementById('chart-cmp-svg');
    if (!svg || !etatCmp || !etatCmp.geoCmp) return;
    const { Y, Xn } = etatCmp.geoCmp;
    const cross = document.getElementById('chart-cmp-cross');
    const dateEl = document.getElementById('chart-cmp-date-survol');
    const refN = etatCmp.normes[0].vals.length;

    const indexDepuis = (e) => {
      const r = svg.getBoundingClientRect();
      const vbX = (e.clientX - r.left) / r.width * VBW;
      return Math.max(0, Math.min(refN - 1, Math.round((vbX - padL) / plotW * (refN - 1))));
    };
    const montrer = (i) => {
      const x = Xn(refN)(i);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.style.display = '';
      etatCmp.normes.forEach((s, idx) => {
        const j = Math.min(i, s.vals.length - 1);
        const pt = svg.querySelector(`.chart-cmp-pt[data-serie="${idx}"]`);
        if (pt) { pt.setAttribute('cx', Xn(s.vals.length)(j)); pt.setAttribute('cy', Y(s.vals[j])); pt.style.display = ''; }
      });
      if (dateEl) dateEl.textContent = fmtDate(etatCmp.normes[0].points[Math.min(i, etatCmp.normes[0].points.length - 1)].t, etatCmp.periode);
      etatCmp.rendreLegende(i);
    };
    const cacher = () => {
      cross.style.display = 'none';
      svg.querySelectorAll('.chart-cmp-pt').forEach(p => p.style.display = 'none');
      if (dateEl) dateEl.textContent = '';
      etatCmp.rendreLegende(null);
    };

    svg.addEventListener('pointermove', e => montrer(indexDepuis(e)));
    svg.addEventListener('pointerleave', cacher);
  }

  return { ouvrir, ouvrirInline, fermer, changer, retour, comparer, changerComparaison, smooth: smoothPathD };
})();

window.Chart = Chart;
