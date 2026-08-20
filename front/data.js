// Repli statique hors-ligne des produits structurés (mise en forme d'affichage).
// ⚠️ LISTE DUPLIQUÉE : la source de vérité est back/src/produits.ts. Tout ajout / retrait /
// modification doit être répercuté dans LES DEUX fichiers (voir README, section « Produits »).
const PRODUITS = [
  { isin:'FRF0000001M7', nom:'CAP 40 Août 2030',                             sj:'ES Banks',   coupon:'7 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   emission:'2025-07-29', ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FRF0000001K1', nom:'CAP 50 Août 2030',                             sj:'ES Banks',   coupon:'6 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   emission:'2025-07-29', ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FRF0000001L9', nom:'CAP 60 Août 2030',                             sj:'ES Banks',   coupon:'5 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   emission:'2025-07-29', ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR0014011HA6', nom:'CAP 40 Décembre 2030',                         sj:'ES Banks',   coupon:'7 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   emission:'2025-11-30', ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FR0014011HB4', nom:'CAP 50 Décembre 2030',                         sj:'ES Banks',   coupon:'6 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   emission:'2025-11-30', ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FR0014011HC2', nom:'CAP 60 Décembre 2030',                         sj:'ES Banks',   coupon:'5 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   emission:'2025-11-30', ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR0014013KJ7', nom:'CAP 40 Février 2031',                          sj:'ES Banks',   coupon:'7 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   emission:'2026-02-26', ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FR0014013KI9', nom:'CAP 50 Février 2031',                          sj:'ES Banks',   coupon:'6 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   emission:'2026-02-26', ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FR0014013KK5', nom:'CAP 60 Février 2031',                          sj:'ES Banks',   coupon:'5 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   emission:'2026-02-26', ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FRF0000002N3', nom:'CAP 40 Avril 2031',                            sj:'ES Banks',   coupon:'7 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   emission:'2026-04-27', ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FRF0000002M5', nom:'CAP 50 Avril 2031',                            sj:'ES Banks',   coupon:'6 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   emission:'2026-04-27', ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FRF0000002O1', nom:'CAP 60 Avril 2031',                            sj:'ES Banks',   coupon:'5 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   emission:'2026-04-27', ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR1459AB7782', nom:'Conservateur Autocall CMS Juillet 2030',       sj:'CMS 10 ans', coupon:'4,25 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'13/07/2026', emission:'2025-07-13', ech:'25/07/2030', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR00140108S4', nom:'Conservateur Autocall CMS Octobre 2030',       sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,25 %', bCoupon:'2,75 %', constat:'16/10/2026', emission:'2025-10-16', ech:'30/10/2030', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR0014012R49', nom:'Conservateur Autocall CMS Janvier 2031',       sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,20 %', bCoupon:'2,85 %', constat:'18/01/2027', emission:'2026-01-18', ech:'03/02/2031', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR0014014XL4', nom:'Conservateur Autocall CMS Avril 2031',         sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'12/04/2027', emission:'2026-04-12', ech:'02/05/2031', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FRF0000001C8', nom:'LC Athena BNP Juillet 2030',                   sj:'BNP Paribas', coupon:'10 %',  strike:'77,84',  niveau:'96,69',  bAuto:'100 %',  bCoupon:'NA',   constat:'20/07/2026',   emission:'2025-07-20', ech:'31/07/2030', type:'equity', strikeNum:77.84,  niveauNum:96.69,  zoneAutocall:'OUI', protection:'-70 %' },
  { isin:'FRBCP1260215', nom:'LC Athena Stellantis Novembre 2030',           sj:'Stellantis',  coupon:'11 %',  strike:'8,45',   niveau:'5,90',   bAuto:'100 %',  bCoupon:'NA',   constat:'16/11/2026',   emission:'2025-11-16', ech:'28/11/2030', type:'equity', strikeNum:8.45,   niveauNum:5.90,   zoneAutocall:'NON', protection:'-70 %' },
  { isin:'FR0014015OJ4', nom:'LC Athena Capgemini Mai 2031',                 sj:'Capgemini',   coupon:'10 %',  strike:'106,10', niveau:'96,72',  bAuto:'100 %',  bCoupon:'NA',   constat:'04/05/2027',   emission:'2026-05-04', ech:'12/05/2031', type:'equity', strikeNum:106.10, niveauNum:96.72,  zoneAutocall:'NON', protection:'-50 %' },
  { isin:'FRBCP1260678', nom:'LC Athena Rheinmetall Juin 2031',             sj:'Rheinmetall', coupon:'10 %',  strike:'1 150,20', niveau:'946,60',   bAuto:'100 %', bCoupon:'NA',  constat:'15/06/2027',   emission:'2026-06-15', ech:'23/06/2031', type:'equity', strikeNum:1150.20, niveauNum:946.60,  zoneAutocall:'NON', protection:'-60 %' },
];

const INDICES_MARCHE = [
  { nom:'CAC 40',           ticker:'^FCHI',     valeur:'8 351,20', var:'−0,23 %', hausse:false },
  { nom:'Euro Stoxx 50',    ticker:'^STOXX50E', valeur:'5 124,30', var:'+0,42 %', hausse:true  },
  { nom:'Euro Stoxx Banks', ticker:'BNKE.PA',   valeur:'277,95',   var:'+0,87 %', hausse:true  },
  { nom:'S&P 500',          ticker:'^GSPC',     valeur:'5 487,12', var:'+0,18 %', hausse:true  },
  { nom:'Nasdaq',           ticker:'^IXIC',     valeur:'26 166,6', var:'+0,55 %', hausse:true  },
  { nom:'MSCI World',       ticker:'IWDA.AS',   valeur:'4 102,50', var:'+0,31 %', hausse:true  },
];

const TAUX = [
  { nom:'€STR (taux moné.)', valeur:'2,14 %', var:'', hausse:null  },
  { nom:'OAT 10 ans',        valeur:'4,07 %', var:'+3 pb',  hausse:true  }, // dernier recours — live via majOAT
  { nom:'Bund 10 ans',       valeur:'2,48 %', var:'+3 pb',  hausse:true  },
  { nom:'US 10 ans',         valeur:'4,28 %', var:'−2 pb',  hausse:false },
  { nom:'CMS 10 ans',        valeur:null,     var:null,     hausse:null  }, // live via majCMS
];

// Valeurs récupérées en direct (Yahoo via Worker, majCartesMarche) : pas de valeur fixe,
// on affiche « — » tant que le live n'est pas chargé (évite le saut valeur figée → live).
const MACRO = [
  { nom:'Pétrole Brent', valeur:null, var:null, hausse:null },
  { nom:'Or',            valeur:null, var:null, hausse:null },
  { nom:'Bitcoin',       valeur:null, var:null, hausse:null },
];

// Dernière valeur connue des séries FRED (générée depuis front/data/history/),
// affichée sur le tableau de bord pour coller au dernier point du graphique.
const HISTO_DERNIER = {
  'fred:DGS10':                 { valeur:'4,68 %', var:'+1 pb',   hausse:true,  date:'au 30/07' },
  // OAT 10 ans : plus d'entrée ici — la carte est servie en live par majOAT (app.js), qui lit
  // le dernier point de front/data/history/oat.json (append quotidien par Actions).
  'fred:IRLTLT01DEM156N':       { valeur:'2,97 %', var:'-8 pb',   hausse:false, date:'juin 2026' },
  'fred:ECBESTRVOLWGTTRMDMNRT': { valeur:'2,19 %', var:'',        hausse:null,  date:'au 30/07' },
  'hicp:CP0000EZ19M086NEST':    { valeur:'2,7 %',  var:'-0,4 pt', hausse:false, date:'juin 2026' },
};

// Calendrier officiel des décisions de taux BCE et Fed (jour de l'annonce), 2026-2027.
// Dates publiées à l'avance par les banques centrales. À revalider une fois par an.
const CALENDRIER_MACRO = [
  { date:'2026-02-05', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-03-19', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-04-30', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-06-11', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-07-23', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-09-10', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-10-29', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-12-17', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2027-02-04', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2027-03-18', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2027-04-29', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2027-06-10', label:'Réunion BCE — décision de taux', zone:'UE', important:true },
  { date:'2026-01-28', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-03-18', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-04-29', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-06-17', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-07-29', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-09-16', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-10-28', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2026-12-09', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2027-01-27', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2027-03-17', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2027-04-28', label:'Réunion Fed / FOMC', zone:'US', important:true },
  { date:'2027-06-09', label:'Réunion Fed / FOMC', zone:'US', important:true },
];

// Prochains événements macro, toujours d'actualité : décisions BCE/Fed (dates fixes) +
// publications d'inflation récurrentes générées par règle de calendrier. Filtre sur le futur.
function prochainsEvenementsMacro(n) {
  n = n || 6;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const evts = CALENDRIER_MACRO.map(e => ({ ...e, d: new Date(e.date + 'T00:00:00') }));
  for (let k = 0; k < 4; k++) {
    const b = new Date(today.getFullYear(), today.getMonth() + k, 1);
    evts.push({ d: new Date(b.getFullYear(), b.getMonth(), 1),  label: 'Inflation flash zone euro', zone: 'UE', important: false });
    evts.push({ d: new Date(b.getFullYear(), b.getMonth(), 13), label: 'Inflation US (CPI)',         zone: 'US', important: false });
  }
  return evts.filter(e => e.d >= today).sort((a, b) => a.d - b.d).slice(0, n);
}

// Ticker Yahoo des sous-jacents (pour le graphique en mode statique hors-ligne).
const TICKERS_SJ = {
  'CAC 40':'^FCHI', 'ES Banks':'BNKE.PA', 'CMS 10 ans':'CMS10',
  'BNP Paribas':'BNP.PA', 'Stellantis':'STLAM.MI', 'Capgemini':'CAP.PA', 'Rheinmetall':'RHM.DE',
};

// Description rapide du sous-jacent (entreprise ou indice) affichée sur la fiche détail
// Autocall, à titre pédagogique pour situer le sous-jacent — pas une analyse financière.
const SJ_DESCRIPTIONS = {
  'ES Banks': "Euro Stoxx Banks : indice sectoriel qui regroupe les principales banques cotées de la zone euro (BNP Paribas, Santander, Société Générale, Intesa Sanpaolo, Deutsche Bank...). Reflète la santé du secteur bancaire européen, sensible aux taux d'intérêt et à la conjoncture économique.",
  'CMS 10 ans': "CMS 10 ans : taux de swap « constant maturity » à 10 ans en euros, référence du marché des taux à long terme en zone euro. Il évolue avec les anticipations de politique monétaire de la BCE et l'inflation attendue.",
  'BNP Paribas': "BNP Paribas : premier groupe bancaire de la zone euro, actif dans la banque de détail, la banque d'investissement et la gestion d'actifs, avec une forte présence en France, en Belgique et en Italie.",
  'Stellantis': "Stellantis : groupe automobile né en 2021 de la fusion entre PSA (Peugeot, Citroën, Opel) et Fiat Chrysler. 4e constructeur mondial, avec des marques comme Jeep, Fiat, Alfa Romeo et Maserati.",
  'Capgemini': "Capgemini : groupe français de conseil, technologie et services numériques, l'un des leaders mondiaux du conseil en transformation digitale et en systèmes d'information.",
  'Rheinmetall': "Rheinmetall : groupe industriel allemand spécialisé dans la défense (munitions, blindés, systèmes d'armement) et l'automobile, l'un des principaux bénéficiaires du réarmement européen.",
};
function sousJacentDescription(sj) { return SJ_DESCRIPTIONS[sj] || null; }

// Identifiant de graphique par nom d'élément (indices « statiques », taux, macro).
// Préfixes : fred: (série FRED), hicp: (inflation glissement annuel), scrape:cms (proxy),
// sinon symbole Yahoo. Le routage est fait côté Worker / serveur de dev.
const GRAPH_IDS_EXACT = { 'Or': 'GC=F' };
const GRAPH_IDS_SUB = [
  ['Euro Stoxx Banks', 'BNKE.PA'],          // ETF proxy de l'indice (Yahoo ne sert pas SX7E)
  ['MSCI World',       'IWDA.AS'],
  ['STR',              'fred:ECBESTRVOLWGTTRMDMNRT'],
  ['OAT',              'scrape:oat'],          // rendement quotidien (fichier statique, append Actions)
  ['Bund',             'fred:IRLTLT01DEM156N'],
  ['US 10',            'fred:DGS10'],
  ['CMS',              'scrape:cms'],         // vrai swap EUR 10y via FT (Worker)
  ['Inflation',        'hicp:CP0000EZ19M086NEST'],
  ['Brent',            'BZ=F'],
  ['Bitcoin',          'BTC-USD'],
];
function graphIdPour(nom) {
  if (!nom) return null;
  if (GRAPH_IDS_EXACT[nom]) return GRAPH_IDS_EXACT[nom];
  for (const [k, v] of GRAPH_IDS_SUB) if (nom.indexOf(k) !== -1) return v;
  return null;
}

// Ticker de graphique d'un produit (sous-jacent). Global (utilisé par app.js ET pages.js) :
// le ticker brut « SX7E.PA » d'ES Banks n'est pas servi par Yahoo, on le remappe vers l'ETF
// proxy BNKE.PA (mêmes règles que pour la fiche produit et le comparateur du tableau de bord).
function chartTickerPour(p) {
  const t = p.ticker || p.sj || '';
  if (t === 'SX7E.PA' || t === 'ES Banks') return 'BNKE.PA';
  if (t === 'CMS10' || p.type === 'cms')   return 'scrape:cms'; // swap EUR 10y via FT
  return t;
}

// Sous-jacents (actions) uniques des produits Autocall à sous-jacent action, dédoublonnés par
// ticker de graphique — plusieurs CAP Août 2030 partagent tous SX7E.PA/ES Banks : une seule
// entrée. Sert à la fois la carte « Actions » du tableau de bord et le comparateur.
function sousJacentsUniques(produits) {
  const out = new Map();
  (produits || []).forEach(p => {
    if (p.type !== 'equity') return;
    const t = chartTickerPour(p);
    if (!t || out.has(t)) return;
    out.set(t, { ticker: t, label: p.sjLabel || p.sj, niveau: p.niveau, niveauNum: p.niveauNum });
  });
  return [...out.values()];
}

// Dernières valeurs live des cartes « Actions » du tableau de bord (rempli par majCartesMarche,
// persisté dans app-cache comme MACRO) : { ticker: { valeur, var, hausse } }. Sans cette
// persistance, ces cartes rendaient « — » à chaque lancement jusqu'au retour du réseau.
const ACTIONS_LIVE = {};

// Calcule le statut (green/orange/red) et le % strike de chaque produit
function enrichirProduits(produits) {
  const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits:1, maximumFractionDigits:1 });
  const parseNum = s => parseFloat((s || '').replace(/[^0-9,.]/g, '').replace(',', '.'));
  return produits.map(p => {
    const bAutoRaw = parseNum(p.bAuto);
    // Autocall à la baisse : CMS (rappelé si taux < barrière) ou equity avec barrière < 100 % du strike
    const estBaisse = p.type === 'cms' || (p.type === 'equity' && !isNaN(bAutoRaw) && bAutoRaw < 100);
    // Zone d'autocall calculée dynamiquement
    let zoneAutocall;
    if (p.type === 'equity' && p.strikeNum && p.niveauNum) {
      if (!isNaN(bAutoRaw)) {
        const seuil = p.strikeNum * bAutoRaw / 100;
        zoneAutocall = estBaisse ? (p.niveauNum <= seuil ? 'OUI' : 'NON') : (p.niveauNum >= seuil ? 'OUI' : 'NON');
      } else {
        zoneAutocall = p.zoneAutocall;
      }
    } else if (p.type === 'cms') {
      const niv = parseNum(p.niveau);
      zoneAutocall = (!isNaN(niv) && !isNaN(bAutoRaw)) ? (niv <= bAutoRaw ? 'OUI' : 'NON') : p.zoneAutocall;
    } else {
      zoneAutocall = p.zoneAutocall;
    }
    const bCouponNum = parseNum(p.bCoupon);
    let couponAtteint = false;
    if (!isNaN(bCouponNum)) {
      if (p.type === 'equity' && p.strikeNum && p.niveauNum) {
        const nPct = p.niveauNum / p.strikeNum * 100;
        couponAtteint = estBaisse ? nPct <= bCouponNum : nPct >= bCouponNum;
      } else if (p.type === 'cms') {
        const niv = parseNum(p.niveau);
        couponAtteint = !isNaN(niv) && niv <= bCouponNum;
      }
    }
    const protMatch = String(p.protection || '').match(/-(\d+)/);
    const belowProtection = !!(protMatch && p.type === 'equity' && p.strikeNum && p.niveauNum
      && p.niveauNum < p.strikeNum * (1 - parseInt(protMatch[1]) / 100));
    let k;
    if (zoneAutocall === 'OUI') k = 'green';
    else if (belowProtection) k = 'red';
    else k = 'orange';
    const pct = p.type === 'equity' ? fmt(p.niveauNum / p.strikeNum * 100) + ' %' : '-';
    return {
      ...p, zoneAutocall, k, estBaisse, couponAtteint, belowProtection, pct,
      ticker: TICKERS_SJ[p.sj] || null, sjLabel: p.sj,
      bAutoNum:   isNaN(bAutoRaw)   ? null : bAutoRaw,
      bCouponNum: isNaN(bCouponNum) ? null : bCouponNum,
      dateValorisation: p.dateValorisation ?? null,
    };
  });
}

// ── Performance fonds en euros (communiqué annuel) ──
const FONDS_EUROS_PERF = {
  annee: 2025,
  contrats: ['Conservateur Hélios Patrimoine', 'Conservateur Hélios Capitalisation', 'Conservateur Épargne Retraite'],
  tranches: [
    { label: '70 % et plus',              inf150: '4,00 %', sup150: '4,25 %' },
    { label: 'De 60 % à moins de 70 %',   inf150: '3,75 %', sup150: '4,00 %' },
    { label: 'De 50 % à moins de 60 %',   inf150: '3,25 %', sup150: '3,50 %' },
    { label: 'De 40 % à moins de 50 %',   inf150: '2,00 %', sup150: '2,25 %' },
    { label: 'Moins de 40 %',             inf150: '1,10 %', sup150: '1,10 %' },
  ],
  notes: [
    'La provision pour participation aux bénéfices est supérieure à 3 % des provisions mathématiques épargne euros de l\'actif général.',
    'La transformation des anciens contrats d\'assurance-vie en Conservateur Hélios Patrimoine est possible dans les conditions fixées par l\'assureur.',
  ],
};

// ── Catalogue UC suivi (56 supports éligibles, ordre du référentiel « Supports éligibles
// CHP CHC CER CTO - 12-2025 » ; généré par .claude/chantier-uc/scripts/lot2-catalogue.mjs) ──
// mut/fin : éligibilité Mutuelle (CHP/CHC/CER) / Finance (CTO).
// Cliquables : graphId = symbole Yahoo du fonds (historique de VL). equity = exposition actions
// d'amorce, réalignée au chargement sur la répartition du dernier reporting (chargerSecteursUC,
// depuis front/data/uc-compo/ régénéré chaque semaine par fonds-meta.ts).
// `strategie` : objectif de gestion résumé d'après la documentation officielle de chaque société de
// gestion (page produit du gérant ou, pour les fonds « Conservateur », conservateur.fr) — recherché le
// 24 juillet 2026. Si absent, ucStrategieTxt() (pages.js) retombe sur un résumé générique de faits déjà
// connus (catégorie/exposition/SRRI), sans jamais inventer une stratégie non sourcée.
const UC_CATALOGUE = [
  { rang:1, gerant:"Cand", nom:"Candriam Equities L Biotech (C)", isin:"LU1120766388", categorie:"Actions", srri:6, equity:99, graphId:"0P00016ALF.F", mut:true, fin:false,
    strategie:"Fonds actions internationales sectoriel : gestion discrétionnaire visant à bénéficier de la performance du marché actions mondial des sociétés du secteur biotechnologique (développement de médicaments dans diverses aires pathologiques, diagnostic moléculaire, équipement scientifique). Indice de référence : NASDAQ Biotechnology Index (Net Return), utilisé a posteriori. Horizon de placement recommandé de 6 ans." },
  { rang:2, gerant:"DNCA", nom:"Centifolia (C)", isin:"FR0007076930", categorie:"Actions", srri:4, equity:100, graphId:"0P00000NME.F", mut:true, fin:true,
    strategie:"Recherche d'une performance supérieure à l'indice CAC 40 dividendes réinvestis sur la durée de placement recommandée (5 ans), par sélection de valeurs socialement responsables (approche ISR « best in universe ») au sein d'un univers d'environ 500 valeurs françaises (capitalisation > 100 M€, flottant > 10 M€) élargi aux valeurs du SBF 120. Gestion discrétionnaire par stock-picking, sans réplication d'indice ; exposition actions françaises de toute capitalisation d'au moins 60 % de l'actif ; éligible au PEA (75 % minimum en titres éligibles)." },
  { rang:3, gerant:"Cg", nom:"Comgest Renaissance Europe C", isin:"FR0000295230", categorie:"Actions", srri:5, equity:96, graphId:"0P00000PM8.F", mut:true, fin:true,
    strategie:"Fonds actions Europe « Quality Growth » : sélection de valeurs européennes de qualité à la croissance visible et durable, sans référence à un indice, horizon long terme." },
  { rang:4, gerant:"C", nom:"Conservateur Actions Euro (C)", isin:"FR0014008EI2", categorie:"Actions", srri:4, equity:97, graphId:"0P0001P8TA.F", mut:true, fin:true,
    strategie:"Objectif de réaliser, sur une durée de placement recommandée de 5 ans minimum, une performance annualisée nette de frais supérieure à l'indicateur EUROSTOXX 50 dividendes réinvestis, sans que cet indice contraigne la composition du portefeuille. Gestion active et discrétionnaire fondée sur une analyse fondamentale privilégiant les sociétés de qualité, à bonne visibilité et prix raisonnable, sans contrainte sectorielle. Exposition permanente de 60 % à 110 % de l'actif au risque actions des pays de l'Union européenne (grandes et moyennes capitalisations) ; contrainte d'éligibilité PEA (75 % minimum en actions françaises ou européennes)." },
  { rang:5, gerant:"C", nom:"Conservateur Actions Flexibles C", isin:"FR0013256930", categorie:"Actions", srri:3, equity:51, graphId:"0P0001HI3U.F", mut:true, fin:true,
    strategie:"Fonds actions Europe à gestion flexible et discrétionnaire, combinant analyse macroéconomique (top-down) et sélection de valeurs (bottom-up), horizon recommandé de 5 ans." },
  { rang:6, gerant:"C", nom:"Conservateur Actions Monde C", isin:"FR0010564229", categorie:"Actions", srri:6, equity:97, graphId:"0P0000INCI.F", mut:true, fin:true,
    strategie:"Fonds actions internationales géré activement, exposé aux grandes places boursières mondiales (Europe, États-Unis, Asie-Pacifique), horizon recommandé de 5 ans." },
  { rang:7, gerant:"Pal", nom:"Conservateur Emploi Durable (C)", isin:"FR0010038257", categorie:"Actions", srri:4, equity:95, graphId:"0P00001NMQ.F", mut:true, fin:true,
    strategie:"La SICAV vise une performance supérieure à son indicateur de référence, l'indice SBF 120 dividendes nets réinvestis, sur un horizon de 5 ans. Elle intègre les risques de durabilité et les caractéristiques ESG dans son processus de sélection de valeurs, avec un objectif d'investissement social (sélection d'entreprises françaises ayant un impact positif sur l'emploi en France). Labellisée ISR. Investie à 75 % minimum en actions françaises cotées appartenant au SBF 120." },
  { rang:8, gerant:"C", nom:"Conservateur Investissement Proximité (C)", isin:"FR001400U512", categorie:"Actions", srri:4, equity:95, graphId:"0P0001UVBG.F", mut:true, fin:true,
    strategie:"Objectif de réaliser, sur une durée de placement recommandée de 5 ans, une performance nette de frais supérieure à l'indice de comparaison STOXX Europe 600 dividendes réinvestis, en investissant dans des entreprises françaises ou internationales ayant une présence économique significative dans les régions Auvergne-Rhône-Alpes et Bourgogne-Franche-Comté (implantation mesurée par le siège social et l'emploi local généré). Gestion flexible en allocation géographique et sectorielle, fondée sur une analyse qualitative (positionnement concurrentiel, solidité financière, qualité du management)." },
  { rang:9, gerant:"CPR", nom:"CPR Global Silver Age (E)", isin:"FR0012844140", categorie:"Actions", srri:4, equity:99, graphId:"0P00016HZ8.F", mut:true, fin:false,
    strategie:"FCP nourricier investissant quasi intégralement dans le compartiment maître CPR Invest - Global Silver Age (SICAV luxembourgeoise). Objectif de surperformer les marchés boursiers mondiaux sur la période de détention recommandée (5 ans) en tirant profit de la dynamique des titres internationaux associés au vieillissement de la population, tout en intégrant des critères ESG dans la construction de l'univers d'investissement. Indice MSCI World (dividendes nets réinvestis) utilisé a posteriori comme simple référence de performance, sans contrainte de gestion. Exposition actions internationales de toutes capitalisations, jusqu'à 25 % en pays émergents." },
  { rang:10, gerant:"CPR", nom:"CPR Invest - Food For Gene (A)", isin:"LU1653748860", categorie:"Actions", srri:3, equity:97, graphId:"0P0001BOX5.F", mut:true, fin:false,
    strategie:"Objectif de surperformer les marchés d'actions mondiaux sur la période de détention recommandée (au moins 5 ans), avec une intention d'impact climatique indirect sur la transition agroalimentaire, en investissant dans des actions internationales de la chaîne de valeur alimentaire, de l'eau ou de l'agriculture. Intégration de critères ESG (exclusions sur les notes ESG les plus faibles et les controverses graves), fonds labellisé ISR, classé Article 8 SFDR. Exposition actions comprise entre 75 % et 120 % des actifs." },
  { rang:11, gerant:"CPR", nom:"CPR Invest Climate Action (A)", isin:"LU1902443420", categorie:"Actions", srri:4, equity:99, graphId:"0P0001FLNU.F", mut:true, fin:false,
    strategie:"Surperformer les marchés d'actions mondiaux sur la période de détention recommandée (au moins 5 ans) en investissant dans des actions internationales engagées dans la lutte contre le changement climatique, avec intégration de critères ESG. Le portefeuille vise une intensité carbone inférieure à celle de l'indice MSCI All Country World (MSCI ACWI) Net Return et un alignement sur l'objectif 1,5°C de l'Accord de Paris, via des exclusions ESG/controverses/notes CDP et un mécanisme de compensation de l'empreinte carbone résiduelle. Article 8 SFDR, fonds labellisé ISR." },
  { rang:12, gerant:"DNCA", nom:"DNCA Invest SRI Europe Growth (A)", isin:"LU0870553020", categorie:"Actions", srri:4, equity:98, graphId:"0P0000XTFD.F", mut:false, fin:true,
    strategie:"Surperformer les marchés d'actions paneuropéens sur la durée de placement recommandée (indice STOXX Europe 600 Net Return EUR fourni à titre de comparaison a posteriori), par une gestion active discrétionnaire investie dans des valeurs de croissance de qualité sélectionnées sur leur valeur intrinsèque et non sur la composition de l'indice (portefeuille pouvant être concentré, au moins 20 valeurs). Approche ISR intégrée : analyse extra-financière sur au moins 90 % de l'actif, exclusion d'au moins 30 % des émetteurs les moins bien notés. Article 8 SFDR, label ISR français." },
  { rang:13, gerant:"DNCA", nom:"DNCA Invest SRI Norden Europe (A)", isin:"LU1490785091", categorie:"Actions", srri:4, equity:99, graphId:"0P000195NQ.F", mut:true, fin:true,
    strategie:"Surperformer un indice composite (35 % MSCI Nordic + 25 % DAX + 15 % SMI + 15 % AEX + 10 % MSCI UK TR Net Local Currency) par une gestion active discrétionnaire intégrant des critères ESG (approche best-in-universe réduisant l'univers d'au moins 30 %). Investissement permanent d'au moins 90 % de l'actif total en actions de sociétés cotées en Europe du Nord ou y exerçant l'essentiel de leur activité (Royaume-Uni, Irlande, Benelux, Norvège, Suède, Finlande, Danemark, Allemagne, Suisse, Autriche), sans contrainte de capitalisation. Article 8 SFDR, label ISR." },
  { rang:14, gerant:"LFDE", nom:"Echiquier Artificial Intelligence B", isin:"LU1819480192", categorie:"Actions", srri:6, equity:100, graphId:"0P0001DYQM.F", mut:true, fin:false,
    strategie:"Fonds actions thématique concentré (moins de 50 valeurs) sur les entreprises qui développent ou exploitent l’intelligence artificielle, exposition internationale d’au moins 60 %." },
  { rang:15, gerant:"LFDE", nom:"Echiquier Positive Impact Europe (A)", isin:"FR0010863688", categorie:"Actions", srri:4, equity:100, graphId:"0P0000O4H2.F", mut:true, fin:true,
    strategie:"Recherche d'une performance nette de frais de gestion à long terme via l'exposition aux marchés actions européens, investie dans des entreprises dont l'activité apporte des solutions aux enjeux du développement durable et se distinguant par la qualité de leur gouvernance et de leur politique sociale et environnementale (score impact ODD). Gestion active et discrétionnaire par stock-picking, exposition permanente de 60 % à 100 % en actions européennes (au moins 75 % pour l'éligibilité PEA), univers d'investissement Stoxx Europe Total Market (80 %) + MSCI USA Large Cap (20 %), indice MSCI Europe NR fourni à titre indicatif. Classification SFDR : Article 9." },
  { rang:16, gerant:"EdR", nom:"EdR Fund Big Data A EUR", isin:"LU1244893696", categorie:"Actions", srri:4, equity:96, graphId:"0P00016P7T.F", mut:true, fin:false,
    strategie:"Fonds actions internationales du secteur technologique (Big Data), géré activement avec pour objectif de surperformer l’indice MSCI World." },
  { rang:17, gerant:"EdR", nom:"EdR Fund - China (A)", isin:"LU1160365091", categorie:"Actions", srri:5, equity:97, graphId:"0P00016716.F", mut:true, fin:false,
    strategie:"Surperformer l'indice de référence MSCI China 10/40 Net Return en investissant dans des actions de sociétés satisfaisant des critères ESG et dont l'activité est majoritairement liée à la Chine. Approche d'investissement responsable exclusive privilégiant les sociétés ESG bien notées quelle que soit leur capitalisation (filtrage positif et négatif, univers réduit d'au moins 20 %, exclusion armes/charbon/tabac). Exposition actions et titres assimilés (actions A/B chinoises, ADR/GDR) de 75 % à 110 % des actifs nets, capitalisation généralement supérieure à 500 M USD. Article 8 SFDR." },
  { rang:18, gerant:"EdR", nom:"EdR Fund - US Value (R)", isin:"LU1103305709", categorie:"Actions", srri:null, equity:94, graphId:"0P000172SH.F", mut:true, fin:false,
    strategie:"L'objectif d'investissement est de générer des performances en sélectionnant essentiellement des titres nord-américains susceptibles de réduire leur décote par rapport à leur secteur d'activité ou au marché sur lequel ils sont cotés (gestion « value », grandes capitalisations américaines)." },
  { rang:19, gerant:"EdR", nom:"EdR India (A)", isin:"FR0010479931", categorie:"Actions", srri:4, equity:99, graphId:"0P000018ZI.F", mut:true, fin:false,
    strategie:"Sur un horizon de placement recommandé supérieur à 5 ans, l'OPCVM vise une progression de la valeur liquidative par des placements dans des sociétés du sous-continent indien (Inde principalement, ainsi que Pakistan, Sri Lanka et Bangladesh), sélectionnées sur des critères financiers et extra-financiers ESG (approche best-in-universe réduisant l'univers éligible d'au moins 20 %). Exposition actions permanente d'au moins 60 % de l'actif net, dont au moins 80 % en sociétés indiennes. Indice de référence : MSCI India 10/40 NR. Classification SFDR : Article 8." },
  { rang:20, gerant:"Fid", nom:"FF - Global Demographics Fund (A-Acc-EUR H)", isin:"LU0528228074", categorie:"Actions", srri:4, equity:100, graphId:"0P0000VTJH.F", mut:true, fin:false,
    strategie:"Fonds actions internationales géré selon une approche bottom-up de sélection de titres, visant à ce que plus de 70 % des revenus et de la création de valeur du portefeuille proviennent de facteurs démographiques (allongement de l'espérance de vie, essor de la classe moyenne, croissance démographique mondiale). Indice de comparaison : MSCI ACWI (Net) Hedged to EUR ; critères ESG pleinement intégrés au processus d'investissement." },
  { rang:21, gerant:"Fid", nom:"FF - Sustainable W & W Fund (A)", isin:"LU1892829828", categorie:"Actions", srri:4, equity:99, graphId:"0P0001EVSZ.F", mut:true, fin:false,
    strategie:"Fonds actions internationales investi dans des sociétés mondiales liées à la conception, la fabrication ou la vente de produits et services pour la gestion de l'eau et des déchets, avec une construction de portefeuille sans contrainte d'indice et une intégration de critères ESG. Indice principal : MSCI ACWI IMI Water Filtered Index (Net) ; indice de comparaison : MSCI ACWI Index (Net)." },
  { rang:22, gerant:"Fid", nom:"Fidelity World Fund A-ACC-EUR", isin:"LU1261432659", categorie:"Actions", srri:5, equity:96, graphId:"0P00016FY4.F", mut:true, fin:false,
    strategie:"Fonds actions internationales largement diversifié, avec une allocation proche de son indice de référence MSCI World, pour une croissance du capital à long terme." },
  { rang:23, gerant:"LF", nom:"La Francaise IP Carbon Impact Glb (R)", isin:"LU1744646933", categorie:"Actions", srri:6, equity:94, graphId:"0P0001DK5M.F", mut:true, fin:false,
    strategie:"Fonds actions internationales (Article 9 SFDR) visant à contribuer à la transition vers une économie bas-carbone tout en recherchant une croissance du capital à long terme, avec un objectif de surperformance de l'indice MSCI ACWI (Net Total Return) sur un horizon minimum de 5 ans. Au moins 66 % de l'actif est investi en actions de grandes capitalisations mondiales (y compris marchés émergents), sélectionnées via un processus d'exclusions puis de notation ESG, avec un objectif d'émissions de carbone évitées au moins équivalentes aux émissions du portefeuille." },
  { rang:24, gerant:"Cg", nom:"Magellan (C)", isin:"FR0000292278", categorie:"Actions", srri:5, equity:97, graphId:"0P00000PM7.F", mut:true, fin:false,
    strategie:"Fonds actions des marchés émergents géré sans référence à un indice, par sélection de titres (stock-picking) d'entreprises de qualité à la croissance visible. Le portefeuille est investi en permanence à au moins 60 % en actions de sociétés domiciliées ou réalisant l'essentiel de leur activité dans des pays émergents à fort potentiel de croissance, sur un horizon recommandé supérieur à 5 ans." },
  { rang:25, gerant:"Mon", nom:"Moneta Multi Caps (C)", isin:"FR0010298596", categorie:"Actions", srri:4, equity:97, graphId:"0P00005ZUG.F", mut:true, fin:true,
    strategie:"Fonds actions françaises et européennes toutes capitalisations visant à surperformer le marché actions sur le long terme (indice de référence CAC All-Tradable dividendes nets réinvestis, durée de placement recommandée 5 ans), par sélection de titres sans contrainte de secteur ni d'indice. Exposition actions de la Zone euro comprise entre 60 % et 150 %, avec au moins 30 % investis en actions de sociétés ayant leur siège social en France et au moins 75 % en actions françaises ou de l'Union européenne." },
  { rang:26, gerant:"ODDO", nom:"ODDO BHF Avenir (CR-EUR)", isin:"FR0000989899", categorie:"Actions", srri:4, equity:94, graphId:"0P00000QLE.F", mut:true, fin:true,
    strategie:"Fonds actions françaises petites et moyennes capitalisations visant une performance supérieure à son indice de référence (90 % MSCI SMID France NR + 10 % €STR capitalisé + 8,5 points de base) sur un horizon de placement supérieur à 5 ans, en intégrant des critères ESG (exclusions puis notation ESG MSCI). Le portefeuille est investi en permanence à au moins 75 % en actions éligibles au PEA, dont 70 % minimum d'actions françaises." },
  { rang:27, gerant:"ODDO", nom:"ODDO BHF Avenir Europe (CR-EUR)", isin:"FR0000974149", categorie:"Actions", srri:4, equity:95, graphId:"0P00000QLM.F", mut:true, fin:true,
    strategie:"Fonds actions européennes petites et moyennes capitalisations (Article 8 SFDR) visant la valorisation du capital à long terme en surperformant l'indice MSCI Europe Smid Cap Net Return EUR sur un horizon minimum de 5 ans, avec intégration de critères ESG (exclusions puis notation ESG MSCI). Le portefeuille est investi en permanence de 75 % à 100 % en actions d'émetteurs dont le siège social est situé dans l'Espace économique européen ou dans un pays européen membre de l'OCDE." },
  { rang:28, gerant:"ODDO", nom:"ODDO BHF Immobilier (CR-EUR)", isin:"FR0000989915", categorie:"Actions", srri:5, equity:97, graphId:"0P00000QLD.F", mut:true, fin:true,
    strategie:"Fonds actions investi principalement en foncières et valeurs immobilières cotées de la Communauté européenne (centres commerciaux, bureaux, résidentiel), sélectionnées selon une gestion de convictions bottom-up. Objectif : surperformer l'indice MSCI EMU IMI Core RE 10/40 (dividendes nets réinvestis) sur un horizon de placement minimum de 5 ans." },
  { rang:29, gerant:"OFI", nom:"OFI RS Croissance Durable et Solidaire (C)", isin:"FR0000983819", categorie:"Actions", srri:4, equity:99, graphId:"0P00000HN7.F", mut:true, fin:false,
    strategie:"Fonds actions investi principalement dans les grandes capitalisations de la zone euro, sélectionnées sur leurs pratiques en matière de ressources humaines (dialogue social, diversité, formation), avec jusqu'à 10% du portefeuille alloué à des entreprises solidaires via France Active/SIFA. Objectif : surperformer l'indice EURO STOXX (dividendes nets réinvestis) sur un horizon de placement recommandé supérieur à 5 ans ; fonds labellisé ISR, classé Article 8 SFDR." },
  { rang:30, gerant:"Pal", nom:"Palatine France Small Cap (I)", isin:"FR0000978439", categorie:"Actions", srri:4, equity:95, graphId:"0P00000QN4.F", mut:true, fin:false,
    strategie:"Fonds actions investi sur les petites et moyennes valeurs françaises (capitalisations entre 100 millions et 1 milliard d'euros), sélectionnées selon une approche ESG pour leur potentiel de croissance à moyen terme. Éligible PEA et PEA-PME (plus de 75% de l'actif en permanence en titres éligibles à ces régimes), classé Article 8 SFDR." },
  { rang:31, gerant:"Pal", nom:"Palatine Planète (R)", isin:"FR0010649079", categorie:"Actions", srri:4, equity:97, graphId:"0P0000KM3B.F", mut:true, fin:false,
    strategie:"Fonds actions à gestion discrétionnaire investi dans des sociétés européennes dont l'activité est liée à l'environnement, notamment la lutte contre le réchauffement climatique, la pollution et la raréfaction des ressources (5 thèmes : efficacité énergétique, énergies renouvelables, gestion de l'eau et des déchets, mobilité durable, santé et bien-être). Classé Article 8 SFDR avec au moins 75% d'investissements durables à objectif environnemental ; horizon de placement recommandé de 5 ans." },
  { rang:32, gerant:"Pct", nom:"Pictet Clean Energy Transition P EUR", isin:"LU0280435388", categorie:"Actions", srri:5, equity:98, graphId:"0P00008OBQ.F", mut:true, fin:false,
    strategie:"Fonds actions thématique (Article 9 SFDR) investi dans les entreprises qui contribuent à la réduction des émissions de carbone : énergies propres, transport et efficacité énergétique." },
  { rang:33, gerant:"Pct", nom:"Pictet - Nutrition (P)", isin:"LU0366534344", categorie:"Actions", srri:4, equity:100, graphId:"0P0000K8E5.F", mut:true, fin:false,
    strategie:"Fonds actions thématique (classé Article 9 SFDR) investi mondialement, y compris marchés émergents et Chine continentale, dans des entreprises actives dans les secteurs liés à la nutrition, en particulier celles qui améliorent la qualité, l'accès et la durabilité de la production alimentaire. Indice de référence MSCI AC World (EUR), utilisé pour le suivi du risque et la mesure de performance, sans contrainte de composition du portefeuille par rapport à cet indice." },
  { rang:34, gerant:"Pct", nom:"Pictet-Premium Brands P EUR", isin:"LU0217139020", categorie:"Actions", srri:5, equity:99, graphId:"0P000021C4.F", mut:true, fin:false,
    strategie:"Fonds actions thématique investi dans les grandes marques mondiales à fort pouvoir de fixation des prix, sans contrainte géographique." },
  { rang:35, gerant:"C", nom:"Conservateur Horizon 2031 (C)", isin:"FR001400PL02", categorie:"Obligataire", srri:2, equity:5, graphId:"0P0001UGT3.F", mut:true, fin:true,
    strategie:"Fonds obligataire daté à gestion « Buy & Hold » : portefeuille discrétionnaire d'obligations émises par des entités privées ou publiques, de maturité au plus tard le 31 décembre 2031, conservées jusqu'à l'échéance. Objectif de performance annualisée nette de frais de 4,29% pour la part C entre la date d'ouverture du fonds et le 31/12/2031 ; objectif non garanti, dépendant des conditions de marché à la souscription." },
  { rang:36, gerant:"C", nom:"Conservateur Obligations Moyen Terme (C)", isin:"FR0010564328", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0000INO5.F", mut:true, fin:true,
    strategie:"Fonds obligataire investi principalement en obligations internationales (émetteurs privés), avec un objectif de performance égale ou supérieure à l'indice ICE BofA 3-5 Year Euro Corporate (coupons nets réinvestis) sur un horizon de placement recommandé d'au moins 2 ans. Classé Article 8 SFDR." },
  { rang:37, gerant:"DNCA", nom:"DNCA Invest Flex Inflation B", isin:"LU1694790202", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0001CH1A.F", mut:true, fin:true,
    strategie:"Fonds obligataire flexible visant à protéger et valoriser le capital face à l’inflation : gestion active de l’exposition aux obligations d’État indexées sur l’inflation et de la sensibilité aux taux (duration), sans contrainte d’indice, approche ISR." },
  { rang:38, gerant:"LF", nom:"La Française Obligation Carbon Impact (C)", isin:"FR0010915314", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0000236X.F", mut:true, fin:false,
    strategie:"Fonds obligataire (catégorie « Obligations et autres titres de créance libellés en euro ») visant, sur un horizon de placement supérieur à 3 ans, une performance nette de frais supérieure à son indice de référence (Bloomberg Euro Aggregate Corporate). La sélection des émetteurs applique d'abord des exclusions sectorielles puis un filtre ESG (élimination d'au moins 30 % des émetteurs les moins bien notés), suivi d'un score « Carbon Impact » excluant les émetteurs jugés « retardataires » sur la transition énergétique ; le fonds s'engage à une intensité carbone du portefeuille au moins 50 % inférieure à celle de son univers comparable. Fonds labellisé ISR, classé article 8 SFDR." },
  { rang:39, gerant:"ODDO", nom:"ODDO BHF Sust Credit Opportunities (CR-EUR)", isin:"LU1752460292", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0001EITS.F", mut:true, fin:true,
    strategie:"Fonds obligataire crédit à gestion active, visant une performance nette supérieure à l'indice €STR + 2 % (capitalisé) par an, sans indicateur de référence formel. Au moins 70 % de l'actif est investi dans des titres d'émetteurs domiciliés dans un pays de l'OCDE, avec intégration de critères ESG (article 8 SFDR) ; l'univers combine investment grade et high yield (notation minimale B-), dette subordonnée financière et obligations hybrides corporate, avec une sensibilité aux taux comprise entre -2 et +8. Horizon de placement recommandé : 3 ans." },
  { rang:40, gerant:"Carm", nom:"Carmignac Patrimoine (A)", isin:"FR0010135103", categorie:"Mixte / Flexible", srri:3, equity:null, graphId:"0P00000FB4.F", mut:true, fin:false,
    strategie:"FCP patrimonial diversifié visant, sur un horizon de 3 ans, une performance nette supérieure à un indicateur composite (40 % MSCI AC World NR, 40 % ICE BofA Global Government, 20 % €STR capitalisé). Le fonds est exposé à 25-50 % de son actif net en actions internationales toutes capitalisations, au moins 40 % en obligations à taux fixe/variable de notation moyenne au moins « Investment Grade » et produits monétaires, avec gestion active des devises et possibilité de positions vendeuses via dérivés. Approche ISR intégrée (article 8 SFDR), au moins 10 % de l'actif en investissements durables au sens SFDR." },
  { rang:41, gerant:"C", nom:"Congrégation Investissement (C)", isin:"FR0007439666", categorie:"Mixte / Flexible", srri:3, equity:17, graphId:"0P00005VUH.F", mut:false, fin:true,
    strategie:"FCP à gestion active et discrétionnaire visant, sur 3 ans, une performance supérieure ou égale à un indicateur de comparaison composé à 25 % de l'EuroStoxx 50 (dividendes nets réinvestis) et 75 % de l'ICE BofA 3-5 Year All Euro Government Index, avec exclusion des secteurs armement et jeux. Exposition actions comprise entre -5 % et 100 % de l'actif net, obligations/titres de créance jusqu'à 100 % (sensibilité taux -1 à 10), investissements concentrés sur les marchés UE et OCDE, recours possible aux dérivés de crédit (CDS sur indices, max 60 %) et aux matières premières (max 10 %)." },
  { rang:42, gerant:"C", nom:"Congrégation Investissement (R)", isin:"FR001400UAZ4", categorie:"Mixte / Flexible", srri:3, equity:17, graphId:"0P0001XK54.F", mut:true, fin:false,
    strategie:"Même FCP et même objectif de gestion que la part C (indicateur composite 25 % EuroStoxx 50 + 75 % ICE BofA 3-5 Year All Euro Government, exclusion armement/jeux, horizon 3 ans) ; seule la part diffère (R au lieu de C). Exposition actions -5 % à 100 %, obligations jusqu'à 100 % (sensibilité taux -1 à 10), recours possible aux dérivés de crédit et aux matières premières dans les mêmes limites que la part C." },
  { rang:43, gerant:"C", nom:"Conservateur Diversifié C", isin:"FR0010564336", categorie:"Mixte / Flexible", srri:2, equity:13, graphId:"0P0000JLHZ.F", mut:true, fin:true,
    strategie:"Fonds diversifié prudent combinant obligations d’État et grandes capitalisations de la zone euro, horizon recommandé de 2 ans minimum." },
  { rang:44, gerant:"C", nom:"Conservateur Diversifié Réactif C", isin:"FR0010489542", categorie:"Mixte / Flexible", srri:3, equity:23, graphId:"0P0000JZWP.F", mut:true, fin:true,
    strategie:"Gestion diversifiée dynamique, réactive et discrétionnaire, sans biais de style ni de taille, visant une valorisation du capital sur un horizon de 4 ans." },
  { rang:45, gerant:"C", nom:"Conservateur Immo-Or (C)", isin:"FR0011199314", categorie:"Mixte / Flexible", srri:3, equity:null, graphId:"0P0000VYE0.F", mut:true, fin:true,
    strategie:"FIA à gestion discrétionnaire visant, sur 5 ans minimum, une performance non corrélée à celle des actifs classiques, en investissant notamment dans l'or et les métaux précieux, l'immobilier, les obligations d'État et les titres financiers corrélés à l'inflation. Le fonds n'a pas d'indicateur de référence formel (comparaison a posteriori possible à l'IPCH zone euro hors tabac) ; exposition actions -25 % à 65 %, obligations -20 % à 150 %, matières premières jusqu'à 50 % via dérivés, change jusqu'à 70 %. Classé article 6 SFDR." },
  { rang:46, gerant:"C", nom:"Conservateur Rendement Flexible C", isin:"FR0013087152", categorie:"Mixte / Flexible", srri:2, equity:0, graphId:"0P00019OMO.F", mut:true, fin:true,
    strategie:"Fonds diversifié à gestion flexible visant une performance supérieure à l’€ster capitalisé + 1,5 %, avec intégration de critères ESG, horizon recommandé de 4 ans." },
  { rang:47, gerant:"C", nom:"Conservateur Reverso (C)", isin:"FR0011175652", categorie:"Mixte / Flexible", srri:3, equity:0, graphId:"0P00015XU2.F", mut:true, fin:true,
    strategie:"FIA à gestion active et discrétionnaire visant, sur 3 ans minimum, une performance supérieure à celle de l'€STR capitalisé (simple indicateur de comparaison a posteriori, sans indicateur de référence formel). Exposition actions internationales -25 % à 100 % de l'actif net (tous secteurs et zones géographiques), obligations/titres de créance -25 % à 170 % (sensibilité taux -5 à 10), pays émergents limités à 65 %, matières premières jusqu'à 45 % via dérivés, change jusqu'à 70 %. Classé article 6 SFDR." },
  { rang:48, gerant:"CPR", nom:"CPR Croissance Réactive (P)", isin:"FR0010097683", categorie:"Mixte / Flexible", srri:3, equity:25, graphId:"0P00000CGO.F", mut:true, fin:false,
    strategie:"Fonds diversifié international dont l'objectif de gestion est d'obtenir, sur 4 ans minimum, une performance supérieure à son indice de référence (100% ESTR capitalisé depuis le 01/01/2022) avec une volatilité maximale prévisionnelle de 15%. L'exposition actions du portefeuille oscille entre 0% et 80% et sa sensibilité taux entre -2 et +5." },
  { rang:49, gerant:"DNCA", nom:"DNCA Invest - Convertibles (B)", isin:"LU0512124107", categorie:"Mixte / Flexible", srri:3, equity:4, graphId:"0P0000P3DN.F", mut:true, fin:true,
    strategie:"Le compartiment vise l'appréciation du capital avec une faible volatilité en investissant en obligations convertibles. Gestion discrétionnaire intégrant des critères ESG (approche « best in universe », réduction d'au moins 20% de l'univers d'investissement de départ). Le fonds investit toujours au moins 50% de son actif total en obligations convertibles, échangeables ou remboursables obligatoirement d'émetteurs domiciliés dans l'UE ou y exerçant l'essentiel de leur activité, dont au moins 30% notées investment grade. L'indice Refinitiv Europe Focus Hedged CB (EUR) n'est utilisé qu'a posteriori comme indicateur de comparaison des performances, sans contrainte de réplication." },
  { rang:50, gerant:"DNCA", nom:"Eurose (C)", isin:"FR0007051040", categorie:"Mixte / Flexible", srri:2, equity:null, graphId:null, mut:true, fin:true,
    strategie:"L'objectif de gestion est la recherche d'une performance supérieure à l'indice composite 20% EURO STOXX 50 et 80% Bloomberg Euro Aggregate 1-10 year, dividendes et coupons réinvestis, sur la durée de placement recommandée (3 ans). Fonds flexible qui améliore la rentabilité d'un placement patrimonial par une gestion active d'actions et d'obligations principalement libellées en euro, avec sélection ESG (\"best in universe\") : jusqu'à 100% de l'actif en produits de taux (duration limitée à 7 ans, 50% maximum en catégorie \"Speculative Grade\") et jusqu'à 35% en actions de sociétés de l'OCDE de toute capitalisation." },
  { rang:51, gerant:"R·co", nom:"R-co Valor C EUR", isin:"FR0011253624", categorie:"Mixte / Flexible", srri:4, equity:74, graphId:"0P00017T6E.F", mut:true, fin:true,
    strategie:"Gestion flexible et discrétionnaire, sans contrainte d’indice : sélection d’actions et de taux internationaux, de 0 à 100 % investis en actions selon les convictions du gérant." },
  { rang:52, gerant:"Am", nom:"Sextant Grand Large (A)", isin:"FR0010286013", categorie:"Mixte / Flexible", srri:3, equity:50, graphId:"0P00000EUQ.F", mut:true, fin:false,
    strategie:"Compartiment diversifié dont l'exposition aux actions peut varier de 0 à 100% en fonction de la valorisation à long terme des marchés actions. Les actions sont sélectionnées individuellement dans le monde entier, en dehors de toute référence indicielle. La part de l'actif non investie en actions est placée en obligations sélectionnées selon la même approche, ainsi qu'en produits monétaires. Horizon d'investissement recommandé : supérieur à 5 ans." },
  { rang:53, gerant:"Tik", nom:"Tikehau International Cross Assets (R)", isin:"LU2147879543", categorie:"Mixte / Flexible", srri:3, equity:42, graphId:"0P0001L9PD.F", mut:true, fin:true,
    strategie:"Le compartiment vise une performance supérieure à l'€STR +150 points de base, nette des frais de gestion, sur un horizon d'investissement minimum recommandé de 5 ans, dans le cadre d'une gestion active et discrétionnaire. La stratégie repose sur un portefeuille diversifié d'actions (entre -20% et 100% de l'actif net) et de titres de créance (entre 0% et 100% de l'actif net), tous secteurs économiques et zones géographiques, avec possibilité d'investir en titres High Yield et en obligations financières subordonnées, dont des CoCo (dans la limite de 20% de l'actif net)." },
  { rang:54, gerant:"C", nom:"Conservateur Obligations Court Terme C", isin:"FR0011461326", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0000ZL7Q.F", mut:true, fin:true,
    strategie:"Fonds obligataire court terme à gestion active et discrétionnaire sur l’ensemble des marchés obligataires et de taux, dans une fourchette de sensibilité de 0 à 3, visant une performance supérieure au taux monétaire capitalisé, horizon recommandé de 1 an." },
  { rang:55, gerant:"Pal", nom:"Palatine Monétaire Court Terme R", isin:"FR0013287315", categorie:"Monétaire", srri:1, equity:0, graphId:"0P0001CB5C.F", mut:true, fin:true,
    strategie:"Fonds monétaire visant une performance égale à l’€STR (taux monétaire au jour le jour) après frais : instruments du marché monétaire et obligations court terme de la zone euro (maturité maximale 13 mois), approche ESG, durée de placement recommandée inférieure à 3 mois." },
  { rang:56, gerant:"Tik", nom:"TF - Tikehau Short Duration (R)", isin:"LU1585265066", categorie:"Obligataire", srri:2, equity:0, graphId:"0P0001KJDD.F", mut:true, fin:false,
    strategie:"Le compartiment vise une performance annualisée supérieure à l'indice EURIBOR 3 mois + 100 points de base, nette des frais de gestion, sur un horizon d'investissement d'au moins 12 à 18 mois, en gestion active et discrétionnaire. Portefeuille diversifié de titres de créance d'émetteurs privés ou publics situés principalement en zone euro et appartenant essentiellement à la catégorie Investment Grade, avec un risque de taux minimisé (fourchette de sensibilité taux comprise entre -1 et +1) ; l'exposition globale aux titres à haut rendement ou non notés est limitée à 45% de l'actif net (dont 35% maximum en High Yield)." },
];
