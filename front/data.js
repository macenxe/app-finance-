// Données statiques des produits structurés (à remplacer par l'API back)
const PRODUITS = [
  { isin:'FR001400KP78', nom:'Conservateur Autocall CAC 90% Déc 2026',      sj:'CAC 40',     coupon:'6 %',    strike:'7 346',  niveau:'8 351',  bAuto:'90 %',   bCoupon:'—',    constat:'1er j./mois*', ech:'15/12/2026', type:'equity', strikeNum:7346,   niveauNum:8351,  zoneAutocall:'NON', protection:null },
  { isin:'FRF0000001M7', nom:'CAP 40 Août 2030',                             sj:'ES Banks',   coupon:'7 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FRF0000001K1', nom:'CAP 50 Août 2030',                             sj:'ES Banks',   coupon:'6 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FRF0000001L9', nom:'CAP 60 Août 2030',                             sj:'ES Banks',   coupon:'5 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR0014011HA6', nom:'CAP 40 Décembre 2030',                         sj:'ES Banks',   coupon:'7 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FR0014011HB4', nom:'CAP 50 Décembre 2030',                         sj:'ES Banks',   coupon:'6 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FR0014011HC2', nom:'CAP 60 Décembre 2030',                         sj:'ES Banks',   coupon:'5 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR0014013KJ7', nom:'CAP 40 Février 2031',                          sj:'ES Banks',   coupon:'7 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FR0014013KI9', nom:'CAP 50 Février 2031',                          sj:'ES Banks',   coupon:'6 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FR0014013KK5', nom:'CAP 60 Février 2031',                          sj:'ES Banks',   coupon:'5 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FRF0000002N3', nom:'CAP 40 Avril 2031',                            sj:'ES Banks',   coupon:'7 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-40 %' },
  { isin:'FRF0000002M5', nom:'CAP 50 Avril 2031',                            sj:'ES Banks',   coupon:'6 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-50 %' },
  { isin:'FRF0000002O1', nom:'CAP 60 Avril 2031',                            sj:'ES Banks',   coupon:'5 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI', protection:'-60 %' },
  { isin:'FR1459AB7782', nom:'Conservateur Autocall CMS Juillet 2030',       sj:'CMS 10 ans', coupon:'4,25 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'13/07/2026', ech:'25/07/2030', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR00140108S4', nom:'Conservateur Autocall CMS Octobre 2030',       sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,25 %', bCoupon:'2,75 %', constat:'16/10/2026', ech:'30/10/2030', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR0014012R49', nom:'Conservateur Autocall CMS Janvier 2031',       sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,20 %', bCoupon:'2,85 %', constat:'18/01/2027', ech:'03/02/2031', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FR0014014XL4', nom:'Conservateur Autocall CMS Avril 2031',         sj:'CMS 10 ans', coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'12/04/2027', ech:'02/05/2031', type:'cms', zoneAutocall:'NON', protection:'Capital garanti' },
  { isin:'FRF0000001C8', nom:'LC Athena BNP Juillet 2030',                   sj:'BNP Paribas', coupon:'10 %',  strike:'77,84',  niveau:'96,69',  bAuto:'100 %',  bCoupon:'NA',   constat:'20/07/2026',   ech:'31/07/2030', type:'equity', strikeNum:77.84,  niveauNum:96.69,  zoneAutocall:'OUI', protection:'-70 %' },
  { isin:'FRBCP1260215', nom:'LC Athena Stellantis Novembre 2030',           sj:'Stellantis',  coupon:'11 %',  strike:'8,45',   niveau:'5,90',   bAuto:'100 %',  bCoupon:'NA',   constat:'16/11/2026',   ech:'28/11/2030', type:'equity', strikeNum:8.45,   niveauNum:5.90,   zoneAutocall:'NON', protection:'-70 %' },
  { isin:'FR0014015OJ4', nom:'LC Athena Capgemini Mai 2031',                 sj:'Capgemini',   coupon:'10 %',  strike:'106,10', niveau:'96,72',  bAuto:'100 %',  bCoupon:'NA',   constat:'04/05/2027',   ech:'12/05/2031', type:'equity', strikeNum:106.10, niveauNum:96.72,  zoneAutocall:'NON', protection:'-50 %' },
  { isin:'FRBCP1260678', nom:'LC Athena Rheinmetall Juin 2031',             sj:'Rheinmetall', coupon:'10 %',  strike:'1 150,20', niveau:'1 150,20', bAuto:'100 %', bCoupon:'NA',  constat:'15/06/2027',   ech:'23/06/2031', type:'equity', strikeNum:1150.20, niveauNum:1150.20, zoneAutocall:'NON', protection:'-50 %' },
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
  { nom:'€STR (taux moné.)', valeur:'2,14 %', var:'stable', hausse:null  },
  { nom:'OAT 10 ans',        valeur:'3,12 %', var:'+4 pb',  hausse:false },
  { nom:'Bund 10 ans',       valeur:'2,48 %', var:'+3 pb',  hausse:false },
  { nom:'US 10 ans',         valeur:'4,28 %', var:'−2 pb',  hausse:true  },
  { nom:'CMS 10 ans',        valeur:'3,04 %', var:'stable', hausse:null  },
];

const MACRO = [
  { nom:'Pétrole Brent', valeur:'84,20 $',  var:'+0,6 %', hausse:true  },
  { nom:'Or',            valeur:'2 321 $',  var:'+0,3 %', hausse:true  },
  { nom:'Bitcoin',       valeur:'63 400 $', var:'−1,2 %', hausse:false },
];

// Dernière valeur connue des séries FRED (générée depuis front/data/history/),
// affichée sur le tableau de bord pour coller au dernier point du graphique.
const HISTO_DERNIER = {
  'fred:DGS10':                 { valeur:'4,50 %', var:'-1 pb',   hausse:false },
  'fred:IRLTLT01FRM156N':       { valeur:'3,74 %', var:'+7 pb',   hausse:true  },
  'fred:IRLTLT01DEM156N':       { valeur:'3,05 %', var:'+5 pb',   hausse:true  },
  'fred:ECBESTRVOLWGTTRMDMNRT': { valeur:'2,18 %', var:'stable',  hausse:null  },
  'hicp:CP0000EZ19M086NEST':    { valeur:'3,1 %',  var:'+0,1 pt', hausse:true  },
};

const ALERTES = [
  { couleur:'#9a3535', texte:'<b>LC Athena Stellantis</b> — sous-jacent à 69,8 % du strike, surveillance renforcée du capital.' },
  { couleur:'#b06a1a', texte:'<b>Autocall CMS Juillet 2030</b> — 1ère constatation dans 23 jours (13/07/2026).' },
  { couleur:'#1d6f4c', texte:'<b>13 produits</b> en zone de rappel probable à la prochaine constatation.' },
];

const EVENEMENTS = [
  { date:'24 juin', label:'IFO climat des affaires — Allemagne', zone:'DE', important:false },
  { date:'02 juil', label:'Inflation flash zone euro (juin)',    zone:'UE', important:false },
  { date:'17 juil', label:'Réunion BCE — décision de taux',     zone:'UE', important:true  },
  { date:'30 juil', label:'Réunion Fed / FOMC',                 zone:'US', important:true  },
];

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

const VEILLE = [
  { tag:'BCE',        tagBg:'#eaf0f6', tagColor:'#16304f', date:'20 juin 2026',
    titre:'La BCE maintient son taux de dépôt à 2,25 % et confirme un biais prudent',
    corps:'Christine Lagarde évoque une désinflation « en bonne voie » tout en restant dépendante des données. Marché anticipe une dernière baisse au S2.' },
  { tag:'Fed',        tagBg:'#eaf0f6', tagColor:'#16304f', date:'19 juin 2026',
    titre:'La Fed laisse ses taux inchangés, inflation US jugée « collante »',
    corps:'Le FOMC reporte ses prévisions de baisse. Dollar ferme, 10 ans US à 4,28 %. Pression maintenue sur les sous-jacents technologiques.' },
  { tag:'Inflation',  tagBg:'#f3eee2', tagColor:'#8a6d2e', date:'18 juin 2026',
    titre:'Inflation zone euro stable à 2,1 % en mai',
    corps:'Le sous-jacent des services reste élevé. Cible des 2 % en approche, soutenant la trajectoire de taux directeurs.' },
  { tag:'Géopolitique', tagBg:'#f0ecec', tagColor:'#8a4a4a', date:'17 juin 2026',
    titre:'Tensions commerciales : regain de volatilité sur les marchés actions',
    corps:'Nouveaux droits de douane évoqués — secteurs cycliques sous pression. Surveillance accrue des barrières de protection.' },
  { tag:'Immobilier', tagBg:'#e9efe9', tagColor:'#3f6b46', date:'16 juin 2026',
    titre:'SCPI : stabilisation des valorisations après deux ans de correction',
    corps:'La baisse des taux longs redonne de l\'attractivité à la pierre-papier. Sélectivité recommandée sur les actifs de bureau.' },
  { tag:'Fiscalité',  tagBg:'#efeae0', tagColor:'#7a6a45', date:'13 juin 2026',
    titre:'Assurance-vie & transmission : rappel des abattements en vigueur',
    corps:'Point de cadrage interne sur la fiscalité patrimoniale 2026. Aucun changement réglementaire majeur à ce jour — à confirmer.' },
];

// Ticker Yahoo des sous-jacents (pour le graphique en mode statique hors-ligne).
const TICKERS_SJ = {
  'CAC 40':'^FCHI', 'ES Banks':'BNKE.PA', 'CMS 10 ans':'CMS10',
  'BNP Paribas':'BNP.PA', 'Stellantis':'STLAM.MI', 'Capgemini':'CAP.PA', 'Rheinmetall':'RHM.DE',
};

// Identifiant de graphique par nom d'élément (indices « statiques », taux, macro).
// Préfixes : fred: (série FRED), hicp: (inflation glissement annuel), scrape:cms (proxy),
// sinon symbole Yahoo. Le routage est fait côté Worker / serveur de dev.
const GRAPH_IDS_EXACT = { 'Or': 'GC=F' };
const GRAPH_IDS_SUB = [
  ['Euro Stoxx Banks', 'BNKE.PA'],          // ETF proxy de l'indice (Yahoo ne sert pas SX7E)
  ['MSCI World',       'IWDA.AS'],
  ['STR',              'fred:ECBESTRVOLWGTTRMDMNRT'],
  ['OAT',              'fred:IRLTLT01FRM156N'],
  ['Bund',             'fred:IRLTLT01DEM156N'],
  ['US 10',            'fred:DGS10'],
  // CMS 10 ans : graphique désactivé en attendant une vraie source de swap CMS (valeur statique/saisie).
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
    const statuts = { green:'Zone Rappel', orange:'Zone Coupon', red:'Risque' };
    const pct = p.type === 'equity' ? fmt(p.niveauNum / p.strikeNum * 100) + ' %' : '-';
    return {
      ...p, zoneAutocall, k, estBaisse, couponAtteint, belowProtection, statut: statuts[k], pct,
      ticker: TICKERS_SJ[p.sj] || null, sjLabel: p.sj,
      bAutoNum:   isNaN(bAutoRaw)   ? null : bAutoRaw,
      bCouponNum: isNaN(bCouponNum) ? null : bCouponNum,
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

// ── Catalogue UC suivi (sélection ordonnée : actions → obligataire) ──
// Cliquables : graphId = symbole Yahoo du fonds (historique de VL). equity = exposition actions indicative.
const UC_CATALOGUE = [
  { rang:1,  gerant:'R·co', nom:'R-co Valor C EUR',                     isin:'FR0011253624', categorie:'Flexible',             srri:4, equity:65,  graphId:'0P00017T6E.F' },
  { rang:2,  gerant:'LFDE', nom:'Echiquier Artificial Intelligence B',  isin:'LU1819480192', categorie:'Actions thématique',   srri:6, equity:100, graphId:'0P0001DYQM.F' },
  { rang:3,  gerant:'EdR',  nom:'EdR Fund Big Data A EUR',              isin:'LU1244893696', categorie:'Actions thématique',   srri:4, equity:100, graphId:'0P00016P7T.F' },
  { rang:4,  gerant:'Pct',  nom:'Pictet Clean Energy Transition P EUR', isin:'LU0280435388', categorie:'Actions thématique',   srri:5, equity:100, graphId:'0P00008OBQ.F' },
  { rang:5,  gerant:'Pct',  nom:'Pictet-Premium Brands P EUR',          isin:'LU0217139020', categorie:'Actions thématique',   srri:5, equity:95,  graphId:'0P000021C4.F' },
  { rang:6,  gerant:'C',    nom:'Conservateur Actions Monde C',         isin:'FR0010564229', categorie:'Actions Monde',        srri:6, equity:95,  graphId:'0P0000INCI.F' },
  { rang:7,  gerant:'Cg',   nom:'Comgest Renaissance Europe C',         isin:'FR0000295230', categorie:'Actions Europe',       srri:5, equity:100, graphId:'0P00000PM8.F' },
  { rang:8,  gerant:'Fid',  nom:'Fidelity World Fund A-ACC-EUR',        isin:'LU1261432659', categorie:'Actions Monde',        srri:5, equity:100, graphId:'0P00016FY4.F' },
  { rang:9,  gerant:'C',    nom:'Conservateur Actions Flexibles C',     isin:'FR0013256930', categorie:'Mixte / Flexible',     srri:3, equity:55,  graphId:'0P0001HI3U.F' },
  { rang:10, gerant:'C',    nom:'Conservateur Diversifié Réactif C',    isin:'FR0010489542', categorie:'Mixte obligataire',    srri:3, equity:25,  graphId:'0P0000JZWP.F' },
  { rang:11, gerant:'C',    nom:'Conservateur Rendement Flexible C',    isin:'FR0013087152', categorie:'Obligataire flexible', srri:2, equity:20,  graphId:'0P00019OMO.F' },
  { rang:12, gerant:'C',    nom:'Conservateur Diversifié C',            isin:'FR0010564336', categorie:'Mixte obligataire',    srri:2, equity:15,  graphId:'0P0000JLHZ.F' },
];

// ── Contrats assurance-vie & UC ──
// Structure : un objet par contrat, avec fonds euros + liste des UC.
// Mettre à jour manuellement les taux et performances.
const CONTRATS = [
  {
    id: 'c1',
    nom: 'Contrat 1',
    assureur: 'À compléter',
    ref: 'REF-001',
    ouverture: '20XX',
    fondsEuros: {
      nom: 'Fonds en euros',
      taux2024: '—',
      taux2023: '—',
      part: '— %',
    },
    uc: [
      {
        nom: 'À compléter',
        isin: '—',
        categorie: 'À renseigner',
        risque: 0,
        perfYtd: '—',
        perfAn:  '—',
        part:    '— %',
        hausse:  null,
      },
    ],
  },
  {
    id: 'c2',
    nom: 'Contrat 2',
    assureur: 'À compléter',
    ref: 'REF-002',
    ouverture: '20XX',
    fondsEuros: {
      nom: 'Fonds en euros',
      taux2024: '—',
      taux2023: '—',
      part: '— %',
    },
    uc: [],
  },
];
