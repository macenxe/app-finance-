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
  const DEFAUT = '6m';

  // Géométrie du tracé (unités viewBox).
  const VBW = 640, VBH = 300, padL = 14, padR = 14, padT = 16, padB = 26;
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB;

  let etat = { ticker: null, label: '', periode: DEFAUT, points: [], geo: null };

  const fmtPrix = (n) => n == null ? '—'
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function fmtDate(ts, periode) {
    const d = new Date(ts * 1000);
    const intraday = periode === '1j' || periode === '1s';
    return d.toLocaleString('fr-FR', intraday
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // opts (optionnel) : { lignes:[{valeur,label,couleur}], retour:fn, sous:'libellé sous-jacent' }
  function ouvrir(ticker, label, opts) {
    opts = opts || {};
    etat = {
      ticker, label: label || ticker, periode: DEFAUT, points: [], geo: null,
      lignes: opts.lignes || [], retour: opts.retour || null, sous: opts.sous || '',
    };
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = gabarit();
    charger(DEFAUT);
  }

  function fermer() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  function gabarit() {
    const esc = (s) => (window.escHtml ? escHtml(s) : s);
    const titre = esc(etat.label);
    return `
    <div class="modal-overlay" onclick="if(event.target===this)Chart.fermer()">
      <div class="modal-panel chart-panel">
        <div class="modal-header">
          <span class="chart-titre-zone">
            ${etat.retour ? `<button class="chart-retour" onclick="Chart.retour()" aria-label="Retour">←</button>` : ''}
            <span style="min-width:0;">
              <span class="modal-title">${titre}</span>
              ${etat.sous ? `<div class="chart-sous">Sous-jacent : ${esc(etat.sous)}</div>` : ''}
            </span>
          </span>
          <button class="modal-close" onclick="Chart.fermer()">✕</button>
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
            ${PERIODES.map(p => `<button class="chart-per${p.key === etat.periode ? ' active' : ''}" data-per="${p.key}" onclick="Chart.changer('${p.key}')">${p.label}</button>`).join('')}
          </div>
        </div>
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
      const url = `${WORKER}?history=${encodeURIComponent(etat.ticker)}&period=${periode}`;
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      etat.points = data.points || [];
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

    const hausse = pts[n - 1].c >= pts[0].c;
    const couleur = hausse ? '#1d6f4c' : '#9a3535';

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
    const pct = base ? (p.c - base) / base * 100 : 0;
    const up = pct >= 0;
    varEl.textContent = (up ? '+' : '') + pct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' % sur la période';
    varEl.className = 'chart-var tnum ' + (up ? 'up' : 'down');
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

  return { ouvrir, fermer, changer, retour };
})();

window.Chart = Chart;
