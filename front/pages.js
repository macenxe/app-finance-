// ── Fonctions de rendu des 4 pages ──
// Chaque fonction accepte les données en paramètre (API ou statiques).

// Performances d'une UC : chargerPerfsUC (app.js) range { ytd, an } par ISIN — un seul
// historique téléchargé sert les deux colonnes de la liste (2026 · 1 an) et l'en-tête de fiche.
function ucPerfVal(ucPerfs, isin, cle) {
  const p = ucPerfs ? ucPerfs[isin] : null;
  const v = p ? p[cle] : null;
  return (v == null || isNaN(v)) ? null : v;
}
function ucPerfTxt(v) {
  // Espace insécable avant le %, comme partout ailleurs dans l'app.
  return v == null ? '—'
    : (v >= 0 ? '+' : '') + v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}
// Note Morningstar : 1 à 5 étoiles, les non attribuées en teinte éteinte pour que la note se
// lise d'un coup d'œil sur toute la colonne (une ligne à 2 étoiles doit paraître plus courte).
function ucEtoiles(n) {
  if (n == null) return '<span class="uc-note">—</span>';
  const pleines = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="uc-note" title="Note Morningstar : ${pleines} étoile${pleines > 1 ? 's' : ''} sur 5">`
    + '★'.repeat(pleines) + `<span class="uc-note-vide">${'★'.repeat(5 - pleines)}</span></span>`;
}

// Volatilité : sans signe (c'est une amplitude, pas une variation) et sans couleur — une
// volatilité forte n'est ni bonne ni mauvaise en soi, elle se lit à côté du SRI.
function ucVolTxt(v) {
  return v == null ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}
function perfCell(v, classe) {
  const ton = v == null ? '' : v >= 0 ? ' up' : ' dn';
  return `<span class="${classe || 'uc-item-perf'}${ton} tnum">${ucPerfTxt(v)}</span>`;
}
function perfBadge(isin, ucPerfs, cle, classe) {
  return perfCell(ucPerfVal(ucPerfs, isin, cle || 'ytd'), classe);
}

// Performance d'une année civile, lue dans la fiche signalétique (front/data/fonds-meta.json) :
// c'est la performance officielle publiée, dividendes réinvestis, exacte au 31 décembre — nos
// séries de cours ne donneraient qu'une approximation (Yahoo ne sert que de l'hebdomadaire
// au-delà d'un an, donc une année « civile » qui commencerait le 5 janvier).
function metaPerfAnnee(meta, annee) {
  const v = meta && meta.annuels ? meta.annuels[String(annee)] : null;
  return (v == null || isNaN(v)) ? null : v;
}

// Société de gestion : le nom vient de la source (Yahoo/Morningstar) et y est en forme longue
// et juridique — « Pictet Asset Management (Europe) SA », « Fidelity (FIL Inv Mgmt (Lux) S.A.) ».
// On le raccourcit pour une colonne de tableau, sans réécrire la marque : suppression des
// mentions entre parenthèses et des formes sociales, « Asset Management » abrégé en « AM ».
// Le nom complet reste en info-bulle.
function societeCourte(nom) {
  if (!nom) return '—';
  return String(nom)
    // Tout ce qui suit la 1re parenthèse : elles peuvent être imbriquées
    // (« Fidelity (FIL Inv Mgmt (Lux) S.A.) »), un simple \([^)]*\) laisserait « S.A.) ».
    .replace(/\s*\(.*$/, '')
    .replace(/\bAsset Management\b/gi, 'AM')
    .replace(/\s+(S\.?A\.?S?|SARL|Ltd|LLC|Inc)\.?$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Agenda macro (BCE/Fed, publications d'inflation). Deux points de montage selon la taille
// d'écran, d'où le paramètre de classe : colonne latérale du tableau de bord en bureau
// (`bureau-seul`), page Actualités en mobile (`mobile-seul`) — le tableau de bord mobile est
// réservé aux marchés et au comparateur.
function renderEvenementsMacro(n, classesExtra) {
  return `
      <div class="card p-18 mb-24${classesExtra ? ' ' + classesExtra : ''}">
        <div class="card-title mb-12">Prochains événements macro</div>
        <div class="events-grid">
          ${prochainsEvenementsMacro(n).map(e => { const dl = e.d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); return `
          <div class="event-item">
            <div class="event-date tnum${e.important ? ' important' : ''}">${dl}</div>
            <div class="event-label">${e.label}</div>
            ${e.zone ? `<span class="zone-flag"><span class="fi fi-${({FR:'fr',UE:'eu',US:'us',DE:'de',UK:'gb',JP:'jp',CN:'cn'}[e.zone]||'un')} fis"></span></span>` : ''}
          </div>`; }).join('')}
        </div>
      </div>`;
}

function renderDashboard(indices, produits, taux, cmpSeries) {
  taux = taux || TAUX;
  cmpSeries = cmpSeries || [];
  const estCmp = (gid) => !!gid && cmpSeries.includes(gid);

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
        <div class="card index-card${gid ? ' index-clic' : ''}${estCmp(gid) ? ' index-card--actif' : ''}"${gid ? ` onclick="App.clicActif('${escHtml(gid)}','${escHtml(i.nom)}')" data-cmp-ticker="${escHtml(gid)}"` : ''}>
          <div class="index-name">${i.nom}</div>
          <div class="index-val tnum">${i.valeur}</div>
          ${i.var != null
            ? `<div class="index-var tnum ${i.hausse ? 'up' : 'down'}">${i.hausse ? '▲' : '▼'} ${i.var}</div>`
            : `<div class="index-var tnum" style="color:#9a8f7a;">—</div>`
          }
        </div>`; }).join('')}
      </div>

      <!-- Actions (sous-jacents des produits Autocall, hors ceux déjà listés dans les indices
           clés au-dessus — ex. ES Banks / Euro Stoxx Banks, même ticker BNKE.PA) & Actifs :
           même format de carte pour les deux, toujours sur UNE seule ligne (mobile ET
           bureau, pas de ligne de cartes en plus -> pas de scroll ajouté). Mobile : titre
           unique combiné, ordre actions puis actifs (inchangé). Bureau (.bureau-seul) :
           ordre actifs puis actions, avec 2 libellés "Actifs"/"Actions" positionnés via
           grid-column pour s'aligner avec le début de chaque groupe — la ligne de libellés
           réutilise exactement la même grille (classe .grid-mkt, même largeur de conteneur)
           que la ligne de cartes, donc auto-fit y calcule le même nombre de colonnes. -->
      ${(() => {
        const tickersIndices = new Set(indices.map(i => graphIdPour(i.nom) || i.ticker).filter(Boolean));
        const actions = sousJacentsUniques(produits).filter(a => !tickersIndices.has(a.ticker));
        const actionsHtml = actions.map(a => `
        <div class="card index-card index-clic${estCmp(a.ticker) ? ' index-card--actif' : ''}" onclick="App.clicActif('${escHtml(a.ticker)}','${escHtml(a.label)}')" data-macro="${escHtml(a.ticker)}" data-macro-unit="€" data-cmp-ticker="${escHtml(a.ticker)}">
          <div class="index-name">${escHtml(a.label)}</div>
          <div class="index-val tnum" data-macro-val>${escHtml(a.niveau || '—')}</div>
          <div class="index-var tnum flat" data-macro-var>—</div>
        </div>`).join('');
        const macroHtml = MACRO.map(m => { const gid = graphIdPour(m.nom);
          // Or & Bitcoin : hausse = vert. Brent : inversé (hausse = rouge). Couleur = favorabilité.
          const favorable = m.hausse === null ? null : (/Brent/i.test(m.nom) ? !m.hausse : m.hausse);
          return `
        <div class="card index-card${gid ? ' index-clic' : ''}${estCmp(gid) ? ' index-card--actif' : ''}"${gid ? ` onclick="App.clicActif('${escHtml(gid)}','${escHtml(m.nom)}')" data-macro="${gid}" data-cmp-ticker="${escHtml(gid)}"` : ''}>
          <div class="index-name">${m.nom}</div>
          <div class="index-val tnum" data-macro-val>${m.valeur || '—'}</div>
          <div class="index-var tnum ${favorable === null ? 'flat' : favorable ? 'up' : 'down'}" data-macro-var>${m.var || ''}</div>
        </div>`; }).join('');
        return `
      <div class="mkt-combo-mobile">
        <div class="flex-sb mb-12">
          <span class="section-label">Actions &amp; Actifs</span>
        </div>
        <div class="grid-3 grid-mkt mb-24">
          ${actionsHtml}${macroHtml}
        </div>
      </div>

      <div class="bureau-seul">
        <div class="grid-3 grid-mkt mkt-split-labels">
          <span class="section-label" style="grid-column: span ${MACRO.length}">Actifs</span>
          <span class="section-label" style="grid-column: span ${actions.length}">Actions</span>
        </div>
        <div class="grid-3 grid-mkt mb-24">
          ${macroHtml}${actionsHtml}
        </div>
      </div>`;
      })()}

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
        <div class="card index-card${gid ? ' index-clic' : ''}${estCmp(gid) ? ' index-card--actif' : ''}"${gid ? ` onclick="App.clicActif('${escHtml(gid)}','${escHtml(t.nom)}')" data-cmp-ticker="${escHtml(gid)}"` : ''}>
          <div class="index-name index-name-taux">
            ${t.nom}
          </div>
          <div class="index-val tnum">${valeur || '—'}</div>
          <div class="taux-var tnum ${hausse === null ? 'flat' : hausse ? 'up' : 'down'}">${vr || ''}</div>
          ${dateLbl ? `<div class="taux-maj">${escHtml(dateLbl)}</div>` : ''}
        </div>`; }).join('')}
      </div>

      <!-- Comparateur : présent en bureau ET en mobile (même mécanique — on tape/clique une
           carte marché ci-dessus pour ajouter ou retirer sa série, cf. App.clicActif). -->
      <div class="card p-18 mb-24 cmp-card">
        <div class="card-title">Comparateur</div>
        <div class="section-hint mb-12">Sélectionnez une valeur ci-dessus pour l'ajouter ou la retirer</div>
        <div id="cmp-indices"></div>
      </div>
      </div><!-- /dash-col-principale -->

      <div class="dash-col-laterale">
      <!-- L'agenda macro a quitté le tableau de bord : il vit désormais sur la page Actualités
           (mobile ET bureau). Sa place est prise par les actualités des sous-jacents, qui
           concernent directement les produits en portefeuille. -->
      ${renderActusSousJacents()}

      ${renderAlertesPortefeuille(produits)}
      </div><!-- /dash-col-laterale -->
     </div><!-- /dash-split -->
    </div>
  </div>`;
}

// Page Outils : fiches de référence fiscale (barèmes et abattements publics, issus des textes
// légaux en vigueur — impôt sur le revenu, plus-values, transmission). Contenu statique intégré
// (pas de PDF externe), donc disponible partout, y compris sur le site déployé.
// Icônes Feather/trait, même style que NAV_ICONS.
const OUTILS_ICONES = {
  pourcentage: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  don:         '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C9 2 12 7 12 7z"/>',
};

// `points` = sommaire de la fiche (un item par tableau de barème, dans l'ordre du contenu) : c'est
// lui qui dit ce qu'on trouvera avant d'ouvrir, sans bouton pour l'annoncer. `cta` ne sert plus
// qu'à l'`aria-label` de la carte (le lecteur d'écran annonce l'action, l'œil voit le chevron).
const OUTILS_FICHES = {
  revenus: {
    titre: 'Revenus et fiscalité des particuliers',
    titreCourt: 'Revenus et fiscalité',
    desc: 'Ce qui est dû chaque année sur les revenus et les gains : impôt sur le revenu, plus-values, enveloppes d’épargne.',
    icone: 'pourcentage', teinte: 'or', cta: 'Ouvrir les barèmes de revenus',
    points: [
      'Barème de l’impôt sur le revenu (revenus 2025)',
      'Plus-values immobilières et abattements par durée',
      'Rachats d’assurance-vie et de capitalisation',
      'Gains de PEA selon l’ancienneté du plan',
      'Revenus de capitaux mobiliers (dividendes, intérêts)',
    ],
  },
  transmission: {
    titre: 'Transmission et fiscalité des particuliers',
    titreCourt: 'Transmission et fiscalité',
    desc: 'Ce qui est dû lors d’une donation ou d’une succession : droits, abattements, démembrement, assurance-vie au décès.',
    icone: 'don', teinte: 'marine', cta: 'Ouvrir les barèmes de transmission',
    points: [
      'Droits de donation et de succession en ligne directe',
      'Abattements donations / successions (rappel 15 ans)',
      'Dons de sommes d’argent et donation entre époux',
      'Frères et sœurs, autres liens de parenté',
      'Barème de l’usufruit viager et de la nue-propriété',
      'Assurance-vie au décès (art. 990 I et 757 B)',
    ],
  },
};

// Table générique en grille CSS : cols = [{label, align:'right'?, width:'1fr'}], rows = [[cellules...]].
function fiscTable(cols, rows) {
  const tmpl = cols.map(c => c.width || '1fr').join(' ');
  const cell = (v, c) => `<div class="fisc-cell${c.align === 'right' ? ' right tnum' : ''}">${v}</div>`;
  return `
  <div class="fisc-table" style="grid-template-columns:${tmpl}">
    <div class="fisc-row fisc-head">${cols.map(c => cell(escHtml(c.label), c)).join('')}</div>
    ${rows.map((r, i) => `<div class="fisc-row${i % 2 === 1 ? ' alt' : ''}">${r.map((v, j) => cell(v, cols[j])).join('')}</div>`).join('')}
  </div>`;
}

function fiscTitre(txt) { return `<div class="fisc-titre">${escHtml(txt)}</div>`; }
function fiscNote(txt) { return `<div class="fisc-note">${txt}</div>`; }

function renderFicheRevenus() {
  return `
  ${fiscTitre('Barème de l’impôt sur le revenu (revenus 2025)')}
  ${fiscTable(
    [{ label: 'Tranche de revenu (par part)', width: '1.6fr' }, { label: 'Taux', align: 'right', width: '.7fr' }],
    [
      ['Jusqu’à 11 600 €', '0 %'],
      ['De 11 601 € à 29 579 €', '11 %'],
      ['De 29 580 € à 84 577 €', '30 %'],
      ['De 84 578 € à 181 917 €', '41 %'],
      ['Au-dessus de 181 917 €', '45 %'],
    ]
  )}
  ${fiscNote('Hors contribution exceptionnelle et différentielle sur les hauts revenus.')}

  ${fiscTitre('Plus-values immobilières — détention directe ou via SCI à l’IR')}
  ${fiscTable(
    [{ label: 'Durée de détention', width: '1.2fr' }, { label: 'Abatt. IR', align: 'right' }, { label: 'Abatt. PS', align: 'right' }, { label: 'Taux effectif', align: 'right' }],
    [
      ['≤ 5 ans', '0 %', '0,00 %', '36,20 %'],
      ['6 ans', '6 %', '1,65 %', '34,78 %'],
      ['8 ans', '18 %', '4,95 %', '31,93 %'],
      ['10 ans', '30 %', '8,25 %', '29,08 %'],
      ['12 ans', '42 %', '11,55 %', '26,23 %'],
      ['15 ans', '60 %', '16,50 %', '21,96 %'],
      ['18 ans', '78 %', '21,45 %', '17,69 %'],
      ['20 ans', '90 %', '24,75 %', '14,84 %'],
      ['22 ans', '100 %', '28,00 %', '12,38 %'],
      ['25 ans', '100 %', '55,00 %', '7,74 %'],
      ['30 ans', '100 %', '100,00 %', '0,00 %'],
    ]
  )}
  ${fiscNote('Hors taxe complémentaire sur les plus-values supérieures à 50 000 €.')}

  ${fiscTitre('Rachats des contrats d’assurance-vie et de capitalisation')}
  ${fiscTable(
    [{ label: 'Durée du contrat', width: '1.1fr' }, { label: 'Primes avant le 27/09/17', align: 'right', width: '1.2fr' }, { label: 'Primes depuis le 27/09/17', align: 'right', width: '1.3fr' }, { label: 'Prélèv. sociaux', align: 'right' }],
    [
      ['Moins de 4 ans', '35 %', '12,8 %', '17,2 %'],
      ['4 à 8 ans', '15 %', '12,8 %', '17,2 %'],
      ['8 ans et plus', '7,5 %', '7,5 % (<150 k€) / 12,8 % (>150 k€)', '17,2 %'],
    ]
  )}
  ${fiscNote('Après abattement annuel de 4 600 € (célibataire) ou 9 200 € (couple) au-delà de 8 ans. Seuil de 150 k€ apprécié tous contrats confondus, toutes compagnies.')}

  ${fiscTitre('Gains réalisés à la clôture ou au retrait d’un PEA')}
  ${fiscTable(
    [{ label: 'Ancienneté du plan', width: '1.4fr' }, { label: 'Taux + prélèv. sociaux', align: 'right' }],
    [
      ['Moins de 5 ans', '12,8 % + 18,6 %'],
      ['5 ans et plus', '0 % + 18,6 %'],
    ]
  )}

  ${fiscTitre('Revenus de capitaux mobiliers')}
  ${fiscTable(
    [{ label: 'Origine du revenu', width: '1.4fr' }, { label: 'Taux + prélèv. sociaux', align: 'right' }],
    [
      ['Dividendes / intérêts à revenu fixe', '12,8 % + 18,6 %'],
    ]
  )}
  ${fiscNote('Option possible pour le barème progressif de l’IR (abattement de 40 % sur les dividendes) — option globale, applicable à tous les revenus du foyer.')}
  `;
}

function renderFicheTransmission() {
  return `
  ${fiscTitre('Droits de donation / succession en ligne directe')}
  ${fiscTable(
    [{ label: 'Part nette taxable', width: '1.4fr' }, { label: 'Taux', align: 'right' }],
    [
      ['Jusqu’à 8 072 €', '5 %'],
      ['De 8 073 € à 12 109 €', '10 %'],
      ['De 12 110 € à 15 932 €', '15 %'],
      ['De 15 933 € à 552 324 €', '20 %'],
      ['De 552 325 € à 902 838 €', '30 %'],
      ['De 902 839 € à 1 805 677 €', '40 %'],
      ['Au-delà de 1 805 677 €', '45 %'],
    ]
  )}

  ${fiscTitre('Abattements pour les donations (rappel fiscal de 15 ans)')}
  ${fiscTable(
    [{ label: 'Lien de parenté', width: '1.6fr' }, { label: 'Montant', align: 'right' }],
    [
      ['Enfant ou parent', '100 000 €'],
      ['Petits-enfants et grands-parents', '31 865 €'],
      ['Arrière-petits-enfants', '5 310 €'],
      ['Entre époux ou partenaires de Pacs', '80 724 €'],
      ['Entre frères et sœurs', '15 932 €'],
      ['Neveux et nièces', '7 967 €'],
      ['Dons familiaux de sommes d’argent', '31 865 €'],
      ['Abatt. suppl. en faveur des handicapés', '159 325 €'],
    ]
  )}

  ${fiscTitre('Abattements pour les successions (rappel fiscal de 15 ans)')}
  ${fiscTable(
    [{ label: 'Lien de parenté', width: '1.6fr' }, { label: 'Montant', align: 'right' }],
    [
      ['Enfant ou parent', '100 000 €'],
      ['Petits-enfants et arrière-petits-enfants', '1 594 €'],
      ['Entre frères et sœurs', '15 932 €'],
      ['Neveux et nièces', '7 967 €'],
      ['Abatt. suppl. en faveur des handicapés', '159 325 €'],
      ['À défaut d’autre abattement', '1 594 €'],
    ]
  )}

  ${fiscTitre('Dons de sommes d’argent avec réinvestissement')}
  <div class="fisc-para">
    Exonérés de droits de mutation à titre gratuit, en pleine propriété à un enfant, petit-enfant,
    arrière-petit-enfant ou (à défaut) un neveu/nièce, dans la limite de <strong>100 000 €</strong>
    par donateur à un même donataire et <strong>300 000 €</strong> par donataire, si les sommes sont
    affectées avant la fin du 6<sup>e</sup> mois suivant le versement à :
    <ul>
      <li>l’acquisition d’un immeuble neuf ou en VEFA ;</li>
      <li>des travaux de rénovation énergétique de la résidence principale du donataire.</li>
    </ul>
    Applicable aux donations du 16 février 2025 au 31 décembre 2026.
  </div>

  ${fiscTitre('Donation entre époux ou partenaires de Pacs')}
  ${fiscTable(
    [{ label: 'Part nette taxable', width: '1.4fr' }, { label: 'Taux', align: 'right' }],
    [
      ['Jusqu’à 8 072 €', '5 %'],
      ['De 8 073 € à 15 932 €', '10 %'],
      ['De 15 933 € à 31 865 €', '15 %'],
      ['De 31 866 € à 552 324 €', '20 %'],
      ['De 552 325 € à 902 838 €', '30 %'],
      ['De 902 839 € à 1 805 677 €', '40 %'],
      ['Au-delà de 1 805 677 €', '45 %'],
    ]
  )}
  ${fiscNote('Successions entre époux/Pacs : exonérées de droits de transmission.')}

  ${fiscTitre('Donation / succession entre frères et sœurs')}
  ${fiscTable(
    [{ label: 'Part nette taxable', width: '1.4fr' }, { label: 'Taux', align: 'right' }],
    [
      ['Jusqu’à 24 430 €', '35 %'],
      ['Au-delà de 24 430 €', '45 %'],
    ]
  )}

  ${fiscTitre('Autres liens de parenté')}
  ${fiscTable(
    [{ label: 'Lien de parenté', width: '1.6fr' }, { label: 'Taux', align: 'right' }],
    [
      ['Jusqu’au 4ᵉ degré inclus', '55 %'],
      ['Au-delà du 4ᵉ degré et non-parents (ex. concubin)', '60 %'],
    ]
  )}

  ${fiscTitre('Évaluation de l’usufruit viager et de la nue-propriété')}
  ${fiscTable(
    [{ label: 'Âge de l’usufruitier', width: '1.4fr' }, { label: 'Usufruit', align: 'right' }, { label: 'Nue-propriété', align: 'right' }],
    [
      ['Moins de 21 ans révolus', '90 %', '10 %'],
      ['De 21 à 30 ans révolus', '80 %', '20 %'],
      ['De 31 à 40 ans révolus', '70 %', '30 %'],
      ['De 41 à 50 ans révolus', '60 %', '40 %'],
      ['De 51 à 60 ans révolus', '50 %', '50 %'],
      ['De 61 à 70 ans révolus', '40 %', '60 %'],
      ['De 71 à 80 ans révolus', '30 %', '70 %'],
      ['De 81 à 90 ans révolus', '20 %', '80 %'],
      ['91 ans et plus', '10 %', '90 %'],
    ]
  )}

  ${fiscTitre('Fiscalité en cas de décès — contrats d’assurance-vie')}
  ${fiscTable(
    [{ label: 'Primes versées', width: '1.3fr' }, { label: 'Souscription avant 20/11/91', align: 'right', width: '1.3fr' }, { label: 'Souscription depuis 20/11/91', align: 'right', width: '1.3fr' }],
    [
      ['Avant le 13/10/98', 'Exonération', 'Exonération avant 70 ans · art. 757 B après 70 ans'],
      ['Depuis le 13/10/98', 'Art. 990 I', 'Art. 990 I avant 70 ans · art. 757 B après 70 ans'],
    ]
  )}
  ${fiscNote('Époux et partenaires de Pacs exonérés de droits de transmission. Art. 990 I : abattement de 152 500 € par bénéficiaire puis 20 % jusqu’à 700 000 €, 31,25 % au-delà. Art. 757 B : abattement global de 30 500 € puis droits de succession de droit commun.')}
  `;
}

// Pastille d'icône d'une fiche (même gabarit dans la carte mobile et dans l'en-tête du panneau
// bureau) : la taille est pilotée en CSS, pas ici.
function outilsIconeHtml(d) {
  return `<span class="outils-doc-icone outils-doc-icone--${d.teinte}">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${OUTILS_ICONES[d.icone]}</svg>
  </span>`;
}

// Corps de chaque fiche, indexé par clé — sert au panneau bureau (rendu directement dans la page)
// comme à la fenêtre mobile (App.ouvrirFiche).
const OUTILS_CORPS = { revenus: renderFicheRevenus, transmission: renderFicheTransmission };

function renderOutils() {
  const docs = Object.entries(OUTILS_FICHES).map(([cle, d]) => ({ cle, ...d }));
  return `
  <div class="page-outils">
    <header class="page-header">
      <div>
        <div class="page-title">Outils</div>
        <div class="page-sub">Aide-mémoire fiscal</div>
      </div>
    </header>

    <div class="page-body">
      <div class="flex-sb mb-12 outils-entete">
        <span class="section-label">Barèmes 2025-2026</span>
      </div>
      <!-- Bureau : les deux fiches sont consultables directement, côte à côte, chacune avec son
           propre défilement (même principe que le split de la page Autocall) — plus besoin
           d'ouvrir une fenêtre. Le mobile garde les cartes cliquables juste en dessous : pas de
           bouton d'action, la carte entière ouvre la fiche et le chevron suffit à le dire. -->
      <div class="outils-split bureau-seul">
        ${docs.map(d => `
        <section class="card outils-panneau" aria-label="${escHtml(d.titre)}">
          <div class="outils-panneau-tete">
            ${outilsIconeHtml(d)}
            <span class="outils-doc-info">
              <span class="outils-doc-titre">${escHtml(d.titre)}</span>
              <span class="outils-doc-compte">${d.points.length} tableaux · barèmes 2025-2026</span>
            </span>
          </div>
          <div class="outils-panneau-corps">${OUTILS_CORPS[d.cle]()}</div>
        </section>`).join('')}
      </div>
      <div class="outils-liste mobile-seul">
        ${docs.map(d => `
        <div class="card outils-doc" role="button" tabindex="0" aria-label="${escHtml(d.cta)}" onclick="App.ouvrirFiche('${d.cle}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.ouvrirFiche('${d.cle}');}">
          <div class="outils-doc-tete">
            ${outilsIconeHtml(d)}
            <span class="outils-doc-info">
              <span class="outils-doc-titre">
                <span class="outils-doc-titre-long">${escHtml(d.titre)}</span><span class="outils-doc-titre-court">${escHtml(d.titreCourt)}</span>
              </span>
              <span class="outils-doc-compte">${d.points.length} tableaux · barèmes 2025-2026</span>
            </span>
            <span class="outils-doc-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>
            </span>
          </div>
          <div class="outils-doc-desc">${escHtml(d.desc)}</div>
          <ul class="outils-doc-points">
            ${d.points.map(p => `<li>${escHtml(p)}</li>`).join('')}
          </ul>
        </div>`).join('')}
      </div>
      <!-- Mention indicative : version courte sur mobile, où la page doit tenir sans défiler
           (même procédé que .ac-legend-full / .ac-legend-court sur la page Autocall). -->
      <div class="table-note mt-16">
        <span class="outils-note-long">Barèmes et abattements légaux publics (impôt sur le revenu, plus-values, donations et successions) — à titre indicatif, à vérifier auprès des textes officiels en vigueur (impots.gouv.fr, service-public.fr).</span>
        <span class="outils-note-court">À titre indicatif — à vérifier sur impots.gouv.fr.</span>
      </div>
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

// ── Alertes : niveau actuel par rapport à sa cible ──
// « Cible » = le point de référence du produit : le strike (100 %) pour un sous-jacent action,
// la barrière de rappel pour un CMS (qui n'a pas de strike, seulement un taux à franchir).
// Renvoie l'écart signé en points (positif = au-dessus de la cible), ou null si incalculable.
function ecartCible(p) {
  if (p.type === 'cms') {
    const niv = parseFloat(String(p.niveau ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'));
    return (isNaN(niv) || p.bAutoNum == null) ? null : niv - p.bAutoNum;
  }
  if (!p.strikeNum || p.niveauNum == null) return null;
  return p.niveauNum / p.strikeNum * 100 - 100;
}
const ALERTE_ECART_PROCHE = 5; // en dessous de cet écart, le % du strike se lit mal → phrase explicite
// Valeur affichée dans la colonne de droite des alertes. Loin de la cible, le % du strike se
// suffit à lui-même (« 129,2 % ») ; à moins de 5 points, l'écart signé est bien plus parlant
// (« +0,3 % » · « au-dessus de la cible »). Les CMS, sans strike, sont toujours en écart.
function alerteNiveauAffiche(p) {
  const e = ecartCible(p);
  const unite = p.type === 'cms' ? ' pt' : ' %';
  const fmt1 = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (e == null) return { valeur: String(p.niveau ?? '—'), legende: '' };
  if (p.type !== 'cms' && Math.abs(e) >= ALERTE_ECART_PROCHE) {
    return { valeur: fmt1(p.niveauNum / p.strikeNum * 100) + ' %', legende: 'du strike' };
  }
  return {
    valeur: (e >= 0 ? '+' : '−') + fmt1(Math.abs(e)) + unite,
    legende: (e >= 0 ? 'au-dessus' : 'en dessous') + ' de la cible',
  };
}

// Encart « Alertes portefeuille » (bureau) : état des prochaines dates de constatation
// du portefeuille (tous produits confondus), pas seulement ceux en zone à risque. Masqué en mobile.
const ALERTES_NB_DATES = 7;
function renderAlertesPortefeuille(produits) {
  // Mêmes regroupements que la liste Autocall : les paliers d'un même CAP ne forment
  // qu'une seule ligne (« CAP 08/2030 ») au lieu d'une ligne par palier.
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
  const avecDate = grouperCapMemeDate((produits || []).filter(p => !p.rappele))
    .map(p => ({ p, d: parseDateFlexible(p.constat) }))
    .filter(x => x.d && x.d >= aujourdhui);

  // Les prochaines dates de constatation distinctes (plusieurs produits peuvent partager la
  // même date sans être un groupe CAP, ex. deux familles différentes) : de quoi remplir la
  // carte sans pour autant dupliquer toute la liste Autocall.
  const datesDistinctes = [...new Set(avecDate.map(x => x.d.getTime()))].sort((a, b) => a - b);
  const prochainesDates = new Set(datesDistinctes.slice(0, ALERTES_NB_DATES));

  const lignes = avecDate
    .filter(x => prochainesDates.has(x.d.getTime()))
    .sort((a, b) => a.d - b.d)
    .map(({ p }) => ({ p, zone: zoneNiveau(p) }));

  // Trois colonnes, une lecture chacune : le produit (nom + statut), sa date de constatation,
  // son niveau par rapport à la cible.
  const corps = lignes.length
    ? lignes.map(({ p, zone }) => {
        const clic = p.isGroupeCap
          ? `App.voirDetailGroupe('${escHtml((p.paliers || []).map(x => x.isin).filter(Boolean).join(','))}')`
          : `App.voirDetail('${escHtml(p.isin)}')`;
        const niv = alerteNiveauAffiche(p);
        return `
        <div class="alerte-item" onclick="${clic}">
          <div class="alerte-id">
            <div class="alerte-nom">${escHtml(alerteNom(p))}</div>
            <div class="alerte-statut alerte-statut--${zone.cle}">${escHtml(zone.label)}</div>
          </div>
          <div class="alerte-date tnum">${escHtml(fmtDatePanneau(p.constat))}</div>
          <div class="alerte-droite">
            <div class="alerte-niveau tnum alerte-niveau--${zone.cle}">${escHtml(niv.valeur)}</div>
            ${niv.legende ? `<div class="alerte-cible">${escHtml(niv.legende)}</div>` : ''}
          </div>
        </div>`; }).join('')
    : `<div class="alerte-vide">Aucune constatation à venir.</div>`;

  const nbDates = prochainesDates.size;
  return `
      <div class="card p-18 mb-24 bureau-seul">
        <div class="card-title">Alertes portefeuille</div>
        <div class="section-hint mb-12">État des ${nbDates} prochaine${nbDates > 1 ? 's' : ''} date${nbDates > 1 ? 's' : ''} de constatation</div>
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
  // N'accepte que les URL http(s) : un lien javascript:/data: du flux RSS n'est pas rendu cliquable.
  const href = /^https?:\/\//i.test(lien || '') ? lien : null;
  return href
    ? `<a class="news-card" href="${escHtml(href)}" target="_blank" rel="noopener">${inner}</a>`
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
        <!-- Agenda macro (mobile) : en bureau il est monté dans la colonne de droite, sous les
             filtres — il ne vit plus sur le tableau de bord dans aucune des deux tailles. -->
        ${renderEvenementsMacro(5, 'mobile-seul')}
        ${renderCuratedNews()}
        <div class="news-group">
          <div class="news-group-title">Fil en direct</div>
          <div id="news-section" class="news-loading">
            <div class="news-spinner">Chargement des actualités…</div>
          </div>
        </div>
      </div>
      <div class="news-col-filtres bureau-seul">
        <div class="card p-18 mb-24">
          <div class="card-title mb-12">Filtrer par thème</div>
          ${bouton(null, 'Tous')}
          ${NEWS_THEMES.map(t => bouton(t, t.charAt(0) + t.slice(1).toLowerCase())).join('')}
        </div>
        <!-- Agenda macro en bureau : la colonne est étroite, .events-grid y est déjà en une
             seule colonne (même contexte que l'ancienne colonne latérale du tableau de bord).
             Pas de classe .bureau-seul ici, le conteneur la porte déjà. -->
        ${renderEvenementsMacro(5)}
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

// ── Actualités des sous-jacents (colonne latérale du tableau de bord, bureau seulement) ──
// Carte montée par renderDashboard ; son contenu arrive du fil RSS, injecté dans #news-sj par
// chargerActusSousJacents (app.js) — d'où l'état « chargement » initial, comme #news-section.
function renderActusSousJacents() {
  return `
      <div class="card p-18 mb-24 bureau-seul">
        <div class="card-title">Actualités des sous-jacents</div>
        <div class="section-hint mb-12">Dernières informations sur nos sous-jacents</div>
        <div id="news-sj" class="news-loading">
          <div class="news-spinner">Chargement des actualités…</div>
        </div>
      </div>`;
}

// 4 items : au-delà, la colonne latérale devient plus haute que la colonne principale et le
// tableau de bord se met à défiler sur un écran 1280×800 (mesuré).
const NEWS_SJ_MAX = 4;
// Ne retient QUE le fil par sous-jacent (news.produits — un flux RSS par sous-jacent, cf.
// FLUX_PRODUITS côté back/Worker), jamais le fil macro global, et seulement les tags qui
// correspondent à un sous-jacent d'un produit ENCORE EN VIE (`donnees.produits`, rappelés
// exclus) : le flux « CAC 40 » subsiste côté serveur alors qu'aucun produit ne l'a plus en
// sous-jacent, et un produit rappelé ne fait plus partie du portefeuille à suivre.
function renderNewsSousJacents(news, produits) {
  const sjs = new Set((produits || []).map(p => String(p.sj || '').toLowerCase()).filter(Boolean));
  const items = ((news && news.produits) || [])
    .filter(a => sjs.has(String(a.tag || '').toLowerCase()))
    .sort((a, b) => {
      const ts = (d) => { const t = d ? new Date(d).getTime() : 0; return isNaN(t) ? 0 : t; };
      return ts(b.date) - ts(a.date);
    })
    .slice(0, NEWS_SJ_MAX);
  if (!items.length) return `<div class="alerte-vide">Aucune actualité récente sur nos sous-jacents.</div>`;
  return `<div class="news-sj-liste">${items.map(a => {
    const couleur = newsCatColor(RSS_TAG_CAT[a.tag] || 'MARCHÉS');
    const d = a.date ? new Date(a.date) : null;
    const dl = (d && !isNaN(d.getTime())) ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
    const inner = `
        <div class="news-sj-head">
          <span class="news-sj-tag" style="color:${couleur}"><span class="news-sj-dot" style="background:${couleur}"></span>${escHtml(a.tag || '')}</span>
          <span class="news-sj-date tnum">${escHtml(dl)}</span>
        </div>
        <div class="news-sj-titre" title="${escHtml(a.titre || '')}">${escHtml(a.titre || '')}</div>`;
    // Même garde que newsCardHtml : seules les URL http(s) du flux deviennent cliquables.
    const href = /^https?:\/\//i.test(a.lien || '') ? a.lien : null;
    return href
      ? `<a class="news-sj-item" href="${escHtml(href)}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="news-sj-item">${inner}</div>`;
  }).join('')}</div>`;
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

  // Total réellement perçu = coupons déjà versés les années précédentes + versement au rappel.
  const totalPercu = (r.couponsVerses || 0) + (r.aVerserAuRappel || 0);
  const infoBlock = r.rappele ? `
      <div class="ac-info-row ac-info-row--coupon"><span class="ac-info-label">Total perçu</span><span class="ac-info-val ac-info-val--coupon">${Number.isFinite(totalPercu) ? '+' + totalPercu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %' : '—'}</span></div>
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
        </div>

        <div class="ac-col-detail">${panneau}</div>
      </div>
    </div>
  </div>`;
}

// Description rapide du sous-jacent (entreprise ou indice), affichée en tête de fiche.
function detailSousJacentHtml(sj) {
  const desc = (typeof sousJacentDescription === 'function') ? sousJacentDescription(sj) : null;
  if (!desc) return '';
  return `
    <div class="detail-sj-desc">
      <div class="detail-sj-desc-title">${escHtml(sj)}</div>
      <div class="detail-sj-desc-text">${escHtml(desc)}</div>
    </div>`;
}

// Barrière au format « % · Montant » (equity) ou juste « % » (CMS, déjà exprimé en taux).
function detailBarriereTxt(strikeNum, pct, num, isCms) {
  if (pct == null || pct === 'NA') return '—';
  if (isCms || strikeNum == null || num == null) return escHtml(String(pct));
  const montant = strikeNum * num / 100;
  return `${escHtml(String(pct))} · ${montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}

// Une ligne clé/valeur du tableau de description (ou du récapitulatif bureau).
function detailLigneHtml(l) {
  const cls = 'detail-val' + (l.tnum === false ? '' : ' tnum');
  return `<div class="detail-row"><span class="detail-key">${l.k}</span><span class="${cls}"${l.style ? ` style="${l.style}"` : ''}>${l.v}</span></div>`;
}

// Corps d'une fiche détail (définition du sous-jacent + graphique + récapitulatif), partagé par
// la feuille mobile (renderDetail) et le panneau permanent du bureau (renderDetailPanneau).
// Une seule présentation depuis le 29 juillet 2026 : plus de cases de synthèse dorées, tout est
// reversé dans le tableau « Récapitulatif » du bas. Seule la mise en page diffère (CSS) — 3
// colonnes en bureau, 1 en mobile.
function detailCorpsHtml(produit, chartId = 'detail-chart-inline') {
  const isCms = produit.type === 'cms';

  // Coupon en mémoire : périodes où la barrière coupon n'a pas été franchie, dont le gain
  // reste en réserve jusqu'à la prochaine constatation qui la franchit (ou le rappel/échéance).
  const couponRate = parseFloat(String(produit.coupon).replace(',', '.'));
  const reserveNum = produit.couponsReserve ?? 0;
  const nbCoupons = couponRate > 0 ? Math.round(reserveNum / couponRate) : 0;
  const couponMemoireVal = nbCoupons > 0
    ? `${nbCoupons} coupon${nbCoupons > 1 ? 's' : ''} · +${reserveNum.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
    : '—';

  const pctColor = produit.k === 'red' ? '#9a3535' : produit.k === 'orange' ? '#b06a1a' : '#1d6f4c';
  const lignes = [
    { k: 'Sous-jacent', v: escHtml(produit.sj), tnum: false },
    ...(produit.type === 'equity' ? [
      { k: 'Strike initial', v: escHtml(produit.strike) },
      { k: 'Niveau actuel',  v: escHtml(produit.niveau) },
      { k: '% du strike',    v: escHtml(produit.pct), style: `font-weight:600;color:${pctColor};` },
    ] : [
      { k: 'Taux CMS 10 ans', v: escHtml(produit.niveau) },
    ]),
    // Repris des anciennes cases de synthèse.
    { k: 'Coupon annuel', v: escHtml(produit.coupon) + ' / an', style: 'font-weight:600;color:#1d6f4c;' },
    { k: 'Protection',    v: escHtml(String(produit.protection ?? '—')) },
    { k: 'Barrière coupon', v: detailBarriereTxt(produit.strikeNum, produit.bCoupon, produit.bCouponNum, isCms) },
    { k: 'Barrière rappel', v: detailBarriereTxt(produit.strikeNum, produit.bAuto, produit.bAutoNum, isCms) },
    { k: 'Coupon en mémoire', v: couponMemoireVal, style: nbCoupons > 0 ? 'font-weight:600;color:#b06a1a;' : '' },
    { k: 'Prochaine constatation', v: escHtml(produit.constat) },
    { k: 'Échéance finale', v: escHtml(produit.ech) },
  ];

  return `
    <div class="detail-content">
      <div class="detail-chart-row">
        <div class="detail-chart-desc-row">
          <div id="${chartId}" class="detail-chart-inline"></div>
          ${detailSousJacentHtml(produit.sjLabel || produit.sj)}
        </div>
      </div>

      <div class="card p-18 detail-recap">
        <div class="card-title mb-12">Récapitulatif</div>
        <div class="detail-rows">${lignes.map(detailLigneHtml).join('')}</div>
        ${produit.evaluationIncomplete ? `<div class="detail-note" style="margin-top:10px;color:#9a3535;">Historique de cours incomplet : réserve indicative.</div>` : ''}
      </div>

      <div class="detail-note detail-note--indic">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
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
      ${detailCorpsHtml(produit, 'detail-chart-inline-sheet')}
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
    ${detailCorpsHtml(produit, 'detail-chart-inline')}
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
    ${detailCorpsGroupeHtml(membres, 'detail-chart-inline')}
  </div>`;
}

function detailCorpsGroupeHtml(membres, chartId = 'detail-chart-inline') {
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

  const lignes = [
    { k: 'Sous-jacent', v: escHtml(ref.sj), tnum: false },
    { k: 'Strike initial', v: escHtml(String(ref.strike)) },
    { k: 'Niveau actuel',  v: escHtml(String(ref.niveau)) },
    { k: '% du strike',    v: niveauPct, style: `font-weight:600;color:${pctColor};` },
    { k: 'Coupon annuel', v: couponTxt, style: 'font-weight:600;color:#1d6f4c;' },
    { k: 'Protection',    v: protectionTxt },
    { k: 'Barrière coupon', v: detailBarriereTxt(ref.strikeNum, ref.bCoupon, ref.bCouponNum, false) },
    { k: 'Barrière rappel', v: detailBarriereTxt(ref.strikeNum, ref.bAuto, ref.bAutoNum, false) },
    { k: 'Coupon en mémoire', v: couponMemoireTxt, style: nbCouponsGroupe > 0 ? 'font-weight:600;color:#b06a1a;' : '' },
    { k: 'Prochaine constatation', v: escHtml(ref.constat) },
    { k: 'Échéance finale', v: escHtml(ref.ech) },
  ];

  return `
    <div class="detail-content">
      <div class="detail-chart-row">
        <div class="detail-chart-desc-row">
          <div id="${chartId}" class="detail-chart-inline"></div>
          ${detailSousJacentHtml(ref.sjLabel || ref.sj)}
        </div>
      </div>

      <div class="card p-18 detail-recap">
        <div class="card-title mb-12">Récapitulatif</div>
        <div class="detail-rows">${lignes.map(detailLigneHtml).join('')}</div>
      </div>

      <div class="detail-note detail-note--indic">Données indicatives · Validation humaine obligatoire avant toute décision.</div>
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
      ${detailCorpsGroupeHtml(membres, 'detail-chart-inline-sheet')}
    </div>
  </div>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Page F€ & UC ──
// Libellés du tri, repris dans le bandeau au-dessus du tableau (« ↓ Trié par … »).
const TRI_LIBELLES = {
  nom: 'nom de fonds', societe: 'société de gestion', categorie: 'catégorie', secteur: 'secteur',
  sri: 'niveau de risque (SRI)', note: 'note Morningstar', ytd: 'performance depuis le 01/01',
  n1: 'performance de l\'année précédente', an: 'performance 1 an', a3: 'performance 3 ans', a5: 'performance 5 ans',
  maj: 'date d\'actualisation',
};

// Barre « Comparer », à droite de la ligne de filtres (bureau seul — sur mobile la comparaison
// reste pilotée depuis la fiche d'un fonds). Deux temps, sur le MÊME bouton :
//   1er clic  → mode sélection : cliquer une ligne la coche au lieu d'ouvrir sa fiche ;
//   2e clic   → ouvre la fiche comparée des fonds cochés (le 1er coché porte le graphique).
// Rendue à part pour qu'App.majBarreCompare() puisse la remplacer seule à chaque coche : un
// renderPage complet reconstruirait la liste et remonterait son défilement.
// Indices proposés à la comparaison : exactement les « Indices clés » du tableau de bord.
// graphIdPour() les remappe sur le symbole réellement servi par Yahoo (BNKE.PA pour l'Euro
// Stoxx Banks, par exemple) — même précaution que catalogueComparaison() dans app.js.
function ucIndicesComparables() {
  const src = typeof INDICES_MARCHE !== 'undefined' ? INDICES_MARCHE : [];
  return src.map(i => ({
    ticker: (typeof graphIdPour === 'function' ? graphIdPour(i.nom) : null) || i.ticker,
    label: i.nom,
  })).filter(i => i.ticker);
}
function ucCmpBarreHtml(state) {
  const sel = (state && state.ucSelection) || [];
  const idx = (state && state.ucCmpIndices) || [];
  const indices = ucIndicesComparables();
  // Le sélecteur d'indices n'apparaît qu'une fois « Comparer » cliqué : au repos, la barre ne
  // montre qu'une seule action, et les indices sont une option DE la comparaison en cours.
  const picker = !(state && state.ucIdxPickerOuvert) ? '' : `
    <div class="cmp-picker uc-idx-picker" onclick="event.stopPropagation()">
      ${indices.map(i => `
        <div class="cmp-picker-item${idx.includes(i.ticker) ? ' cmp-picker-item--actif' : ''}"
             onclick="event.stopPropagation();App.toggleIndiceCmp('${escHtml(i.ticker)}')">
          <span class="cmp-picker-coche">${idx.includes(i.ticker) ? '✓' : ''}</span>${escHtml(i.label)}
        </div>`).join('')}
      ${idx.length ? `<div class="cmp-picker-vide"><button class="uc-cmp-annuler" type="button" onclick="event.stopPropagation();App.viderIndicesCmp()">Tout retirer</button></div>` : ''}
    </div>`;
  const boutonIdx = `<div class="uc-idx-wrap" id="uc-idx-wrap">
      <button class="uc-cmp-btn uc-cmp-btn--idx${idx.length ? ' uc-cmp-btn--idx-actif' : ''}" type="button"
        onclick="event.stopPropagation();App.toggleIndicePicker()" aria-expanded="${!!(state && state.ucIdxPickerOuvert)}"
        title="Ajouter un indice du tableau de bord aux courbes comparées">Indices${idx.length ? ` · ${idx.length}` : ''} <span class="uc-cmp-chevron">▾</span></button>
      ${picker}
    </div>`;
  if (!(state && state.ucModeCompare)) {
    return `<div class="uc-cmp-barre" id="uc-cmp-barre">
      <button class="uc-cmp-btn" type="button" onclick="App.toggleModeCompare()"
        title="Sélectionner plusieurs fonds pour les afficher sur un même graphique, en base 100">Comparer</button>
    </div>`;
  }
  // Un indice compte comme une courbe : 1 fonds + 1 indice suffisent, mais il faut toujours au
  // moins un fonds — c'est sa fiche qui porte la comparaison.
  const total = sel.length + idx.length;
  const aide = sel.length === 0 ? 'Cliquez les fonds à comparer'
    : total < 2 ? '1 fonds sélectionné — ajoutez-en un autre ou un indice'
    : `${sel.length} fonds${idx.length ? ` + ${idx.length} indice${idx.length > 1 ? 's' : ''}` : ' sélectionnés'}`;
  return `<div class="uc-cmp-barre uc-cmp-barre--choix" id="uc-cmp-barre">
    <span class="uc-cmp-aide">${aide}</span>
    ${boutonIdx}
    <button class="uc-cmp-btn uc-cmp-btn--go" type="button"${sel.length >= 1 && total >= 2 ? '' : ' disabled'} onclick="App.lancerComparaison()">Lancer la comparaison</button>
    <button class="uc-cmp-annuler" type="button" onclick="App.toggleModeCompare()">Annuler</button>
  </div>`;
}
function renderContrats(state, ucPerfs, ucSecteurs, ucMeta, ucMetaGenere) {
  ucPerfs = ucPerfs || {};
  ucSecteurs = ucSecteurs || {};
  ucMeta = ucMeta || {};
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
  const anneeN = new Date().getFullYear();
  const anneeN1 = anneeN - 1;
  const hasPerfs = Object.keys(ucPerfs).length > 0;

  // Tri par colonne (App.trierUC). Chaque clé sait extraire sa valeur ; les valeurs manquantes
  // (note absente, historique indisponible) sont toujours renvoyées EN FIN de liste, quel que
  // soit le sens — sinon inverser le tri ferait remonter en tête des lignes vides.
  const VALEUR_TRI = {
    nom:       u => u.nom,
    societe:   u => societeCourte((ucMeta[u.isin] || {}).societe) || '',
    // Trié sur le libellé AFFICHÉ dans la colonne (nom complet), sinon l'ordre alphabétique
    // ne correspond pas à ce qu'on lit.
    categorie: u => CAT_MAP[u.categorie] || u.categorie || '',
    secteur:   u => (ucSecteurs[u.isin] || {}).nom || '',
    sri:       u => u.srri,
    note:      u => (ucMeta[u.isin] || {}).note,
    ytd:       u => ucPerfVal(ucPerfs, u.isin, 'ytd'),
    n1:        u => metaPerfAnnee(ucMeta[u.isin], anneeN1),
    an:        u => ucPerfVal(ucPerfs, u.isin, 'an'),
    a3:        u => ucPerfVal(ucPerfs, u.isin, 'a3'),
    a5:        u => ucPerfVal(ucPerfs, u.isin, 'a5'),
    maj:       u => (ucPerfs[u.isin] || {}).t,
  };
  const tri = (state && state.ucTri && VALEUR_TRI[state.ucTri.cle]) ? state.ucTri : { cle: 'ytd', sens: -1 };

  // Colonne « VL du » : date de la dernière VALEUR LIQUIDATIVE du fonds — la valorisation
  // publiée par la société de gestion, pas la date de rafraîchissement du site. Le montant part
  // en info-bulle : c'est lui qui montre que la donnée est bien propre à chaque fonds.
  // ⚠ Les VL sont diffusées avec un jour ouvré de décalage et la plupart des fonds valorisent le
  // même jour : voir tous les fonds à la même date est normal, pas un signe de donnée figée.
  const jjmm = ts => { const d = new Date(ts * 1000); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const dateMajUC = isin => { const t = (ucPerfs[isin] || {}).t; return t ? jjmm(t) : '—'; };
  const DEVISES = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };
  const vlInfobulle = isin => {
    const p = ucPerfs[isin] || {};
    if (!p.t) return 'Valeur liquidative en cours de chargement.';
    const montant = p.vl == null ? '' : ` : ${p.vl.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEVISES[p.devise] || p.devise || ''}`.trimEnd();
    return `Valeur liquidative du ${jjmm(p.t)}${montant} — dernière valorisation publiée par la société de gestion.`
      + ' Les VL sont diffusées avec un jour ouvré de décalage, et la plupart des fonds valorisent le même jour.';
  };
  const dateNotes = ucMetaGenere ? jjmm(Date.parse(ucMetaGenere) / 1000) : null;
  const ucFiltrees = (() => {
    const base = ucCat === 'Conservateur'
      ? uc.filter(u => u.nom.includes('Conservateur'))
      : ucCat ? uc.filter(u => CAT_MAP[u.categorie] === ucCat) : uc;
    if (!hasPerfs && tri.cle === 'ytd') return base;
    const lire = VALEUR_TRI[tri.cle];
    return [...base].sort((a, b) => {
      const va = lire(a), vb = lire(b);
      const va_ = (va == null || va === '') ? null : va;
      const vb_ = (vb == null || vb === '') ? null : vb;
      if (va_ == null && vb_ == null) return 0;
      if (va_ == null) return 1;
      if (vb_ == null) return -1;
      const cmp = typeof va_ === 'string' ? va_.localeCompare(vb_, 'fr') : va_ - vb_;
      return cmp * tri.sens;
    });
  })();

  // Le tableau occupe toute la page : la fiche d'un fonds (stratégie, graphique, composition)
  // s'ouvre au clic, en fenêtre centrée en bureau et en feuille sur mobile — il n'y a donc plus
  // de panneau permanent à droite, ni de « sélection par défaut » à calculer. La surbrillance
  // marque simplement le dernier fonds ouvert.
  const ucSel = (state && state.ucSel) || null;
  // Mode « Comparer » (bureau) : les lignes se cochent au clic au lieu d'ouvrir leur fiche.
  const modeCompare = !!(state && state.ucModeCompare);
  const choisis = (state && state.ucSelection) || [];

  return `
  <div class="page-fonds">
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

      <!-- ── Unités de compte ──
           Le décompte « N UC » ne sert plus qu'au mobile (masqué en bureau) : en bureau, la date
           des cours est portée par la colonne « Maj » du tableau et le tri se lit sur la colonne
           active, fléchée. -->
      <div class="flex-sb mb-12">
        <span class="section-label">Unités de compte</span>
        <span class="section-hint uc-etat">${hasPerfs ? uc.length + ' UC' : '…'}</span>
      </div>

      <!-- Filtres de famille en sélecteur segmenté (même traitement que les filtres de l'Autocall) :
           un socle blanc unique plutôt que des puces isolées, qui se confondaient avec les lignes
           du tableau. Chaque segment porte son libellé complet pour le bureau et une forme courte
           pour le mobile (6 segments en toutes lettres y passeraient sur 3 lignes) — même procédé
           que .ac-legend-court. Le segment « Tous » n'existe qu'en bureau : sur mobile, re-toucher
           le filtre actif le désactive, et un 6e segment ferait déborder la ligne. -->
      <div class="uc-filtres-ligne">
      <div class="uc-chips" role="group" aria-label="Filtrer par famille de fonds">
        ${[
          { cle: null,               long: 'Tous',         court: 'Tous', classe: ' uc-chip-tous' },
          { cle: 'Conservateur',     long: 'Conservateur', court: 'C', classe: ' uc-chip-csr' },
          { cle: 'Actions thématique', long: 'Thématique', court: 'Thém.' },
          { cle: 'Actions',          long: 'Actions',      court: 'Actions' },
          { cle: 'Mixte / Flexible', long: 'Mixte / Flexible', court: 'Mixte' },
          { cle: 'Obligataire',      long: 'Obligataire',  court: 'Oblig.' },
        ].map(f => {
          const n = f.cle === null ? uc.length
            : f.cle === 'Conservateur' ? uc.filter(u => u.nom.includes('Conservateur')).length
            : uc.filter(u => CAT_MAP[u.categorie] === f.cle).length;
          const actif = ucCat === f.cle;
          const arg = f.cle === null ? 'null' : `'${f.cle}'`;
          return `<button class="uc-chip${f.classe || ''}${actif ? ' active' : ''}" onclick="App.setUcCat(${arg})" aria-pressed="${actif}">`
            + `<span class="uc-chip-long">${f.long}</span><span class="uc-chip-court">${f.court}</span>`
            + `<span class="uc-chip-nb">${n}</span></button>`;
        }).join('')}
      </div>
      ${ucCmpBarreHtml(state)}
      </div><!-- /uc-filtres-ligne -->

      <!-- Bandeau de tri conservé POUR LE MOBILE seulement : sans en-tête de colonnes, c'est le
           seul endroit qui dise selon quoi la liste est triée, et il porte l'indicateur de
           chargement des performances. En bureau, son aplat coupait la page juste au-dessus du
           tableau — remplacé par la ligne d'état à droite du titre de section. -->
      <div class="uc-sort-banner uc-sort-banner--mobile${hasPerfs ? '' : ' loading'}">
        ${hasPerfs ? `${tri.sens < 0 ? '↓' : '↑'} Trié par ${TRI_LIBELLES[tri.cle] || 'performance'}` : '⟳ Chargement des performances…'}
      </div>

      <!-- En-tête de colonnes, bureau seul (le mobile garde la carte empilée). Chaque titre trie
           la colonne (App.trierUC) ; l'alignement sur les lignes est réglé en CSS, cf. .uc-list-head. -->
      <div class="uc-list-head bureau-seul">
        ${[
          { cle: 'nom',       lib: 'Fonds' },
          { cle: 'societe',   lib: 'Société de gestion' },
          { cle: 'categorie', lib: 'Catégorie' },
          { cle: 'secteur',   lib: 'Secteur principal', info: 'Secteur le plus représenté dans la poche actions du fonds.' },
          { cle: 'sri',       lib: 'SRI', info: 'Indicateur de risque du prospectus (SRI), de 1 (le plus prudent) à 7.' },
          { cle: 'note',      lib: 'Morningstar', info: 'Note Morningstar globale, de 1 à 5 étoiles : performance passée corrigée du risque, face aux fonds de la même catégorie.' },
          { cle: 'ytd',       lib: 'Depuis 01/01', info: `Performance ${anneeN} depuis le 1er janvier, à la dernière clôture.` },
          { cle: 'n1',        lib: String(anneeN1), info: `Performance de l'année civile ${anneeN1}, du 1er janvier au 31 décembre (source Morningstar, dividendes réinvestis).` },
          { cle: 'an',        lib: '1 an', info: 'Performance sur 12 mois glissants.' },
          { cle: 'a3',        lib: '3 ans', info: 'Performance cumulée sur 3 ans glissants.' },
          { cle: 'a5',        lib: '5 ans', info: 'Performance cumulée sur 5 ans glissants.' },
          { cle: 'maj',       lib: 'VL du', info: `Date de la dernière valeur liquidative publiée par la société de gestion (montant en info-bulle de chaque ligne). Elle sert de base à toutes les performances affichées ; les VL sont diffusées avec un jour ouvré de décalage.${dateNotes ? ` Notes Morningstar relevées le ${dateNotes}.` : ''}` },
        ].map(c => {
          const actif = tri.cle === c.cle;
          const fleche = actif ? `<span class="uc-tri-fleche">${tri.sens < 0 ? '▼' : '▲'}</span>` : '';
          const infobulle = `${c.info ? c.info + ' ' : ''}Cliquez pour trier.`;
          return `<span class="uc-th${actif ? ' uc-th--actif' : ''}" role="button" tabindex="0" aria-sort="${actif ? (tri.sens < 0 ? 'descending' : 'ascending') : 'none'}"`
            + ` title="${escHtml(infobulle)}" onclick="App.trierUC('${c.cle}')"`
            + ` onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.trierUC('${c.cle}');}">${c.lib}${fleche}</span>`;
        }).join('')}
      </div>

      <div class="uc-liste${modeCompare ? ' uc-liste--choix' : ''}">
        ${ucFiltrees.map(u => {
          const sect = ucSecteurs[u.isin];
          const meta = ucMeta[u.isin] || {};
          // Colonne « Catégorie » : la vraie famille du fonds. La pastille du mobile, elle,
          // reprend le libellé du FILTRE actif au-dessus, où les fonds maison passent avant
          // leur catégorie (« C ») — utile pour retrouver le filtre, hors sujet dans une
          // colonne qui annonce une catégorie.
          // Nom de catégorie en toutes lettres (« Obligataire », pas « Oblig. ») : c'est une
          // colonne de lecture, pas une pastille de filtre, et la largeur le permet.
          const catLabel = CAT_MAP[u.categorie] || u.categorie;
          const filterLabel = u.nom.includes('Conservateur') ? 'C'
            : CAT_MAP[u.categorie] === 'Actions thématique' ? 'Thématique'
            : CAT_MAP[u.categorie] === 'Actions'            ? 'Actions'
            : CAT_MAP[u.categorie] === 'Mixte / Flexible'   ? 'Mixte'
            : CAT_MAP[u.categorie] === 'Obligataire'        ? 'Oblig.'
            : u.categorie;
          return `
        <div class="uc-item${u.graphId ? ' clic' : ''}${u.isin === ucSel && !modeCompare ? ' uc-item--actif' : ''}${choisis.includes(u.isin) ? ' uc-item--choisi' : ''}" data-isin="${escHtml(u.isin)}" title="${escHtml(u.nom)} · ${escHtml(u.isin)}"${u.graphId ? ` onclick="App.clicUC('${u.isin}')"` : ''}>
          <div class="uc-item-haut">
            <div class="uc-item-id">
              <div class="uc-item-nom">${u.nom}</div>
              <div class="uc-item-isin tnum">${u.isin}<span class="uc-filtre-badge">${filterLabel}</span></div>
            </div>
            <span class="uc-societe" title="${escHtml(meta.societe || '')}">${escHtml(societeCourte(meta.societe))}</span>
            <span class="uc-cat"><span class="uc-cat-badge">${catLabel}</span></span>
            <span class="uc-secteur"${sect ? ` title="Secteur le plus représenté : ${Math.round(sect.pct)} % de la poche actions du fonds"` : ''}>${sect ? escHtml(sect.nom) : ''}</span>
            <div class="uc-item-right">
              ${perfBadge(u.isin, ucPerfs, 'ytd')}
            </div>
          </div>
          <div class="uc-item-bas">
            <span class="uc-expo"><span class="uc-expo-long">Actions </span>${u.equity} %<span class="uc-expo-bar"><i style="width:${Math.max(0, Math.min(100, u.equity || 0))}%"></i></span></span>
            <span class="uc-srri-inline"><span class="uc-srri-label">SRI</span>${srriDots(u.srri)}<span class="uc-sri-txt tnum">${u.srri == null ? '—' : u.srri + '/7'}</span></span>
            <span class="uc-note-cell">${ucEtoiles(meta.note)}</span>
            <span class="uc-perf-n1">${perfCell(metaPerfAnnee(meta, anneeN1), 'uc-perf-txt')}</span>
            ${perfBadge(u.isin, ucPerfs, 'an', 'uc-perf-an')}
            <span class="uc-perf-3a">${perfCell(ucPerfVal(ucPerfs, u.isin, 'a3'), 'uc-perf-txt')}</span>
            <span class="uc-perf-5a">${perfCell(ucPerfVal(ucPerfs, u.isin, 'a5'), 'uc-perf-txt')}</span>
            <span class="uc-maj tnum" title="${escHtml(vlInfobulle(u.isin))}">${dateMajUC(u.isin)}</span>
          </div>
        </div>`;
        }).join('')}
      </div>
      </div><!-- /ac-col-liste -->
     </div><!-- /ac-split -->
    </div>
  </div>`;
}

// Panneau de droite de la page Fonds : identité de l'UC + graphique et composition.
// Résumé affiché en tête de fiche UC : priorité au champ `strategie` de UC_CATALOGUE (data.js),
// sourcé sur la documentation officielle de chaque société de gestion. À défaut (fonds sans
// source vérifiée), repli sur un résumé générique de faits déjà connus (catégorie/exposition/SRI)
// plutôt que d'inventer une stratégie non sourcée. Le champ `gerant` n'est volontairement pas
// repris ici : ce sont des codes internes abrégés (« Pct », « LFDE », « C »…) impropres à
// l'affichage tels quels.
function ucStrategieTxt(u) {
  if (u.strategie) return u.strategie;
  const bits = [];
  if (u.categorie) bits.push(`Fonds ${u.categorie.toLowerCase()}`);
  if (u.equity != null) bits.push(`${u.equity} % investis en actions`);
  if (u.srri != null) bits.push(`profil de risque SRI ${u.srri}/7`);
  return bits.join(' · ') + '.';
}

// Chips « Comparer » du panneau UC — MOBILE UNIQUEMENT depuis le 1er août 2026 : en bureau, la
// comparaison se compose dans le tableau (bouton « Comparer » de la ligne de filtres, puis clic
// sur les fonds), et la fiche ne fait plus que l'afficher — d'où opts.sansChips, posé par
// renderUCModal. Ajoute d'autres UC sur le graphique déjà affiché (base 100 dès qu'il y en a
// plus d'une), sans carte séparée. La 1re puce (fonds ouvert depuis la liste) n'est pas
// retirable ; les suivantes le sont via App.retirerUcCompare.
function renderUcCompareChips(u, extras, state) {
  if (!u.graphId) return '';
  const uc = typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : [];
  const compares = [u, ...extras];
  const dispo = uc.filter(x => x.graphId && !compares.some(c => c.isin === x.isin));
  const chips = compares.map((c, i) => i === 0
    ? `<span class="cmp-chip cmp-chip--principal">${escHtml(c.nom)}</span>`
    : `<span class="cmp-chip">${escHtml(c.nom)}<button class="cmp-chip-retirer" type="button" aria-label="Retirer ${escHtml(c.nom)}" onclick="event.stopPropagation();App.retirerUcCompare('${escHtml(c.isin)}')">✕</button></span>`
  ).join('');
  const bouton = `<button class="cmp-chip-ajouter" type="button" onclick="event.stopPropagation();App.toggleUcComparePicker()">+ Comparer</button>`;
  let picker = '';
  if (state && state.ucComparePickerOuvert) {
    const corps = dispo.length
      ? dispo.map(it => `
          <div class="cmp-picker-item" onclick="event.stopPropagation();App.ajouterUcCompare('${escHtml(it.isin)}')">
            <span class="cmp-picker-swatch"></span>${escHtml(it.nom)}
          </div>`).join('')
      : `<div class="cmp-picker-vide">Toutes les UC disponibles sont déjà comparées.</div>`;
    picker = `<div class="cmp-picker" onclick="event.stopPropagation()">${corps}</div>`;
  }
  return `<div class="cmp-chips uc-compare-chips" id="uc-compare-chips">${chips}${bouton}${picker}</div>`;
}

// opts.chartId / opts.compoId : identifiants des conteneurs de graphique et de composition
// comparée. La feuille mobile en utilise d'autres que le panneau de page — celui-ci reste dans
// le DOM même masqué (.ac-col-detail{display:none}), et getElementById aurait servi le sien,
// laissant la feuille vide. Même parade que la fiche Autocall (detail-chart-inline-sheet).
function renderUCPanneau(u, ucPerfs, state, opts = {}) {
  if (!u) return '<div class="ac-detail-vide">Sélectionnez une unité de compte pour afficher sa fiche.</div>';
  const chartId = opts.chartId || 'uc-chart-inline';
  const compoId = opts.compoId || 'uc-compo-cmp';
  const uc = typeof UC_CATALOGUE !== 'undefined' ? UC_CATALOGUE : [];
  const extras = ((state && state.ucCompare) || [])
    .filter(isin => isin !== u.isin)
    .map(isin => uc.find(x => x.isin === isin))
    .filter(Boolean);
  const compares = [u, ...extras];
  // Indices ajoutés à la comparaison depuis la barre du tableau (bureau) : ils ne sont que des
  // courbes de plus, ils n'entrent ni dans les blocs « stratégie » ni dans la composition.
  const idxCmp = (state && state.ucCompareIdx) || [];
  const p = ucPerfVal(ucPerfs, u.isin, 'ytd');
  const perfTxt = ucPerfTxt(p);
  const perfCls = p == null ? '' : (p >= 0 ? 'green' : 'red');
  const strategieBlocs = compares.map(c => `
    <div class="uc-strategie">
      ${compares.length > 1 ? `<div class="uc-strategie-nom">${escHtml(c.nom)}</div>` : ''}
      <div class="uc-strategie-titre">Stratégie du fonds</div>
      ${escHtml(ucStrategieTxt(c))}
    </div>`).join('');
  // En comparaison (plusieurs UC), la stratégie devient un bandeau dépliable replié par défaut :
  // plusieurs blocs de texte avant le graphique repousseraient sinon la courbe hors écran.
  // Une seule UC : bloc simple, toujours visible (comme avant, juste déplacé avant le graphique).
  const strategieOuvert = !!(state && state.ucStrategieOuvert);
  const strategieSection = compares.length > 1 ? `
      <div class="fe-toggle mb-12" onclick="App.toggleUcStrategie()" role="button" tabindex="0" aria-expanded="${strategieOuvert}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.toggleUcStrategie();}">
        <div class="fe-toggle-main">
          <span class="fe-toggle-icon${strategieOuvert ? ' open' : ''}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
          </span>
          <span class="section-label">Stratégie des fonds comparés</span>
        </div>
        <span class="fe-toggle-hint">${strategieOuvert ? 'Masquer' : 'Afficher le détail'}</span>
      </div>
      <div class="fe-collapse${strategieOuvert ? ' open' : ''}">
        <div class="fe-collapse-inner">${strategieBlocs}</div>
      </div>` : strategieBlocs;
  return `
  <div class="ac-detail-panneau" data-uc="${escHtml(u.isin)}" data-graph="${escHtml(u.graphId || '')}" data-compare="${extras.map(e => escHtml(e.isin)).join(',')}" data-cmp-idx="${idxCmp.map(escHtml).join(',')}" data-chart-id="${chartId}" data-compo-id="${compoId}">
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
    ${opts.sansChips ? '' : renderUcCompareChips(u, extras, state)}
    ${strategieSection}
    <div id="${chartId}" class="detail-chart-inline"></div>
    ${extras.length ? `<div id="${compoId}" class="uc-compo-cmp"></div>` : ''}
  </div>`;
}

// Mobile : la fiche UC s'ouvre en feuille modale, avec exactement le contenu du panneau bureau
// (puces « Comparer », stratégie, graphique, composition comparée) — même fonction de rendu, donc
// aucune divergence possible entre les deux. majUCSheet (app.js) re-rend #uc-sheet-corps en place
// à chaque ajout/retrait d'UC comparée, avec ces mêmes identifiants de conteneurs.
// (identifiant nu côté app.js : un const de haut niveau n'est pas exposé sur `window`)
const UC_SHEET_IDS = { chartId: 'uc-chart-inline-sheet', compoId: 'uc-compo-cmp-sheet' };

// Bureau : la fiche d'un fonds s'ouvre en fenêtre centrée (le tableau occupe toute la page, il
// n'y a plus de panneau permanent à droite). Même corps que la feuille mobile, donc mêmes
// identifiants de conteneurs — sans panneau de page, il n'existe qu'UNE fiche à la fois dans le
// DOM et le piège des ids dupliqués ne se pose plus. `uc-panneau-entree` porte l'entrée animée.
// `sansChips` : la composition de la comparaison se fait dans le TABLEAU (bouton « Comparer »),
// la fiche ne fait que l'afficher — les fonds comparés se lisent dans la légende du graphique.
function renderUCModal(u, ucPerfs, state) {
  return `
  <div class="modal-overlay uc-overlay" onclick="if(event.target===this)App.fermerUC()">
    <div class="modal-panel uc-modal uc-panneau-entree">
      <button class="modal-close uc-modal-close" onclick="App.fermerUC()" aria-label="Fermer la fiche">✕</button>
      <div class="modal-body uc-sheet-corps" id="uc-sheet-corps">${renderUCPanneau(u, ucPerfs, state, { ...UC_SHEET_IDS, sansChips: true })}</div>
    </div>
  </div>`;
}
function renderUCSheet(u, ucPerfs, state) {
  return `
  <div class="sheet-backdrop" onclick="if(event.target===this) App.fermerUC()">
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="uc-sheet-corps" id="uc-sheet-corps">${renderUCPanneau(u, ucPerfs, state, UC_SHEET_IDS)}</div>
    </div>
  </div>`;
}

// ── Feuilles modales (bottom sheet) : refermable au doigt depuis n'importe où ──
// Partagé entre les fiches détail Autocall (app.js) et le graphique UC (chart.js), qui utilisent
// tous les deux le même gabarit .sheet-backdrop/.sheet-panel/.sheet-handle.
// Depuis la poignée : tirer vers le bas referme la feuille (ou la ramène en position repliée si
// elle est dépliée) ; tirer vers le haut la déplie en plein écran.
// Depuis le reste de la feuille (corps du contenu) : un balayage vers le bas la referme aussi,
// mais seulement s'il démarre en haut du contenu défilable (scrollTop 0), pour ne pas gêner le
// défilement normal. Un simple tap ou un balayage vers le haut ne déclenchent rien ici.
function initSheetDrag(panel, onClose) {
  const handle = panel && panel.querySelector('.sheet-handle');
  if (!handle) return;
  const content = panel.querySelector('.detail-content, .uc-sheet-corps, .modal-body');
  const SEUIL_FERMETURE = 90;
  const SEUIL_DEPLI = 40;
  const SEUIL_DECISION = 8;
  let startY = 0, startX = 0, dragging = false, expanded = false, fromHandle = false, decided = false;

  function position(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
  function positionX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

  function onMove(e) {
    if (!dragging) return;
    let delta = position(e) - startY;

    if (!decided) {
      // Corps de la feuille : on attend de savoir si le geste est un balayage vertical vers le
      // bas avant d'interférer avec le défilement ou une interaction horizontale (graphique...).
      const dx = positionX(e) - startX;
      if (Math.abs(delta) < SEUIL_DECISION && Math.abs(dx) < SEUIL_DECISION) return;
      if (delta <= 0 || Math.abs(dx) > Math.abs(delta)) { dragging = false; return; }
      decided = true;
      panel.classList.add('sheet-dragging');
    }

    if (expanded) delta = Math.max(delta, 0); // depuis l'état déplié, on ne tire que vers le bas
    else delta = Math.max(delta, -80);
    if (e.cancelable) e.preventDefault();
    panel.style.transform = `translateY(${delta}px)`;
  }

  function cleanup() {
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onEnd);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
  }

  function onEnd(e) {
    const wasDragging = dragging && decided;
    dragging = false;
    panel.classList.remove('sheet-dragging');
    cleanup();
    if (!wasDragging) return;
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

  function onStart(e, isHandle) {
    if (!isHandle && content && content.scrollTop > 0) return; // laisse le défilement interne agir
    fromHandle = isHandle;
    decided = isHandle; // depuis la poignée : geste reconnu d'emblée, dans les deux sens
    dragging = true;
    startY = position(e);
    startX = positionX(e);
    if (isHandle) panel.classList.add('sheet-dragging');
    if (!e.touches) e.preventDefault(); // souris : évite la sélection de texte pendant le tirage
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }

  handle.addEventListener('touchstart', e => onStart(e, true), { passive: true });
  handle.addEventListener('mousedown', e => onStart(e, true));
  panel.addEventListener('touchstart', e => {
    if (e.target.closest('.sheet-handle')) return;
    onStart(e, false);
  }, { passive: true });
}
