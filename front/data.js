// Données statiques des produits structurés (à remplacer par l'API back)
const PRODUITS = [
  { isin:'FR001400KP78', nom:'Conservateur Autocall CAC 90% Déc 2026',      sj:'CAC 40',         coupon:'6 %',    strike:'7 346',  niveau:'8 351',  bAuto:'90 %',   bCoupon:'—',    constat:'1er j./mois*', ech:'15/12/2026', type:'equity', strikeNum:7346,   niveauNum:8351,  zoneAutocall:'NON' },
  { isin:'FRF0000001M7', nom:'CAP 40 Août 2030',                             sj:'ES Banks',       coupon:'7 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FRF0000001K1', nom:'CAP 50 Août 2030',                             sj:'ES Banks',       coupon:'6 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FRF0000001L9', nom:'CAP 60 Août 2030',                             sj:'ES Banks',       coupon:'5 %',    strike:'215,10', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'29/07/2026',   ech:'13/08/2030', type:'equity', strikeNum:215.10, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014011HA6', nom:'CAP 40 Décembre 2030',                         sj:'ES Banks',       coupon:'7 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014011HB4', nom:'CAP 50 Décembre 2030',                         sj:'ES Banks',       coupon:'6 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014011HC2', nom:'CAP 60 Décembre 2030',                         sj:'ES Banks',       coupon:'5 %',    strike:'243,31', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'30/11/2026',   ech:'16/12/2030', type:'equity', strikeNum:243.31, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014013KJ7', nom:'CAP 40 Février 2031',                          sj:'ES Banks',       coupon:'7 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014013KI9', nom:'CAP 50 Février 2031',                          sj:'ES Banks',       coupon:'6 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR0014013KK5', nom:'CAP 60 Février 2031',                          sj:'ES Banks',       coupon:'5 %',    strike:'273,13', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'26/02/2027',   ech:'17/03/2031', type:'equity', strikeNum:273.13, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FRF0000002N3', nom:'CAP 40 Avril 2031',                            sj:'ES Banks',       coupon:'7 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FRF0000002M5', nom:'CAP 50 Avril 2031',                            sj:'ES Banks',       coupon:'6 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FRF0000002O1', nom:'CAP 60 Avril 2031',                            sj:'ES Banks',       coupon:'5 %',    strike:'257,72', niveau:'277,95', bAuto:'100 %',  bCoupon:'80 %', constat:'27/04/2027',   ech:'12/05/2031', type:'equity', strikeNum:257.72, niveauNum:277.95, zoneAutocall:'OUI' },
  { isin:'FR1459AB7782', nom:'Conservateur Autocall CMS Juillet 2030',       sj:'CMS 10 ans',     coupon:'4,25 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'13/07/2026', ech:'25/07/2030', type:'cms',    zoneAutocall:'NON' },
  { isin:'FR00140108S4', nom:'Conservateur Autocall CMS Octobre 2030',       sj:'CMS 10 ans',     coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,25 %', bCoupon:'2,75 %', constat:'16/10/2026', ech:'30/10/2030', type:'cms',    zoneAutocall:'NON' },
  { isin:'FR0014012R49', nom:'Conservateur Autocall CMS Janvier 2031',       sj:'CMS 10 ans',     coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,20 %', bCoupon:'2,85 %', constat:'18/01/2027', ech:'03/02/2031', type:'cms',    zoneAutocall:'NON' },
  { isin:'FR0014014XL4', nom:'Conservateur Autocall CMS Avril 2031',         sj:'CMS 10 ans',     coupon:'4,00 %', strike:'NA',     niveau:'3,04 %', bAuto:'2,50 %', bCoupon:'3,00 %', constat:'12/04/2027', ech:'02/05/2031', type:'cms',    zoneAutocall:'NON' },
  { isin:'FRF0000001C8', nom:'LC Athena BNP Juillet 2030',                   sj:'BNP Paribas',    coupon:'10 %',   strike:'77,84',  niveau:'96,69',  bAuto:'100 %',  bCoupon:'NA',   constat:'20/07/2026',   ech:'31/07/2030', type:'equity', strikeNum:77.84,  niveauNum:96.69,  zoneAutocall:'OUI' },
  { isin:'FRBCP1260215', nom:'LC Athena Stellantis Novembre 2030',           sj:'Stellantis',     coupon:'11 %',   strike:'8,45',   niveau:'5,90',   bAuto:'100 %',  bCoupon:'NA',   constat:'16/11/2026',   ech:'28/11/2030', type:'equity', strikeNum:8.45,   niveauNum:5.90,   zoneAutocall:'NON' },
  { isin:'FR0014015OJ4', nom:'LC Athena Capgemini Mai 2031',                 sj:'Capgemini',      coupon:'10 %',   strike:'106,10', niveau:'96,72',  bAuto:'100 %',  bCoupon:'NA',   constat:'04/05/2027',   ech:'12/05/2031', type:'equity', strikeNum:106.10, niveauNum:96.72,  zoneAutocall:'NON' },
];

const INDICES_MARCHE = [
  { nom:'CAC 40',           ticker:'^FCHI',     valeur:'8 351,20', var:'−0,23 %', hausse:false },
  { nom:'Euro Stoxx 50',    ticker:'^STOXX50E', valeur:'5 124,30', var:'+0,42 %', hausse:true  },
  { nom:'Euro Stoxx Banks', ticker:'SX7E.PA',   valeur:'277,95',   var:'+0,87 %', hausse:true, statique:true },
  { nom:'S&P 500',          ticker:'^GSPC',     valeur:'5 487,12', var:'+0,18 %', hausse:true  },
  { nom:'Nasdaq',           ticker:'^IXIC',     valeur:'26 166,6', var:'+0,55 %', hausse:true  },
  { nom:'MSCI World',       ticker:'IWDA.AS',   valeur:'4 102,50', var:'+0,31 %', hausse:true, statique:true },
];

const TAUX = [
  { nom:'€STR (taux moné.)', valeur:'2,14 %', var:'stable', hausse:null  },
  { nom:'OAT 10 ans',        valeur:'3,12 %', var:'+4 pb',  hausse:false },
  { nom:'CMS 10 ans',        valeur:'3,04 %', var:'stable', hausse:null  },
  { nom:'US 10 ans',         valeur:'4,28 %', var:'−2 pb',  hausse:true  },
];

const MACRO = [
  { nom:'Inflation zone €', valeur:'2,1 %',    var:'stable', hausse:null  },
  { nom:'Pétrole Brent',    valeur:'84,20 $',  var:'+0,6 %', hausse:true  },
  { nom:'Or',               valeur:'2 321 $',  var:'+0,3 %', hausse:true  },
  { nom:'Bitcoin',          valeur:'63 400 $', var:'−1,2 %', hausse:false },
];

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
  'CAC 40':'^FCHI', 'ES Banks':'SX7E.PA', 'CMS 10 ans':'CMS10',
  'BNP Paribas':'BNP.PA', 'Stellantis':'STLAM.MI', 'Capgemini':'CAP.PA',
};

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
    let k;
    if (zoneAutocall === 'OUI') k = 'green';
    else if (p.type === 'equity' && (p.niveauNum / p.strikeNum) < 0.75) k = 'red';
    else k = 'orange';
    const pct = p.type === 'equity' ? fmt(p.niveauNum / p.strikeNum * 100) + ' %' : '—';
    const statuts = { green:'Rappel probable', orange:'Surveillance', red:'Risque' };
    const bCouponNum = parseNum(p.bCoupon);
    return {
      ...p, zoneAutocall, k, estBaisse, statut: statuts[k], pct,
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

// ── Catalogue UC proposées — Performances au 31/12/2025 (1 an, 4 ans, 8 ans) ──
const UC_CATALOGUE = [
  // OPC Obligataires Court Terme & Monétaire
  { nom:'Palatine Monétaire Court Terme (R)',           isin:'FR0013287315', categorie:'Oblig. CT / Monétaire', risque:0, perfYtd:'+2,2 %',  perf1an:'+9,8 %',   perf3an:'+8,5 %'   },
  { nom:'Conservateur Obligations Court Terme (C)',     isin:'FR0011461326', categorie:'Oblig. CT / Monétaire', risque:0, perfYtd:'+2,8 %',  perf1an:'+7,1 %',   perf3an:'+6,4 %'   },
  { nom:'TF - Tikehau Short Duration (R)',              isin:'LU1585265066', categorie:'Oblig. CT / Monétaire', risque:0, perfYtd:'+2,9 %',  perf1an:'+9,4 %',   perf3an:'+8,5 %'   },
  // OPC Obligataires Long Terme
  { nom:'DNCA Invest Flex Inflation (B)',               isin:'LU1694790202', categorie:'Oblig. Long Terme',     risque:0, perfYtd:'+0,8 %',  perf1an:'+3,2 %',   perf3an:'+15,1 %'  },
  { nom:'Conservateur Obligations Moyen Terme (C)',     isin:'FR0010564328', categorie:'Oblig. Long Terme',     risque:0, perfYtd:'+2,6 %',  perf1an:'+4 %',     perf3an:'+7,2 %'   },
  { nom:'ODDO BHF Sust Credit Opportunities (CR-EUR)', isin:'LU1752460292', categorie:'Oblig. Long Terme',     risque:0, perfYtd:'+2,5 %',  perf1an:'+5,2 %',   perf3an:'+12,7 %'  },
  { nom:'La Française Obligation Carbon Impact (C)',    isin:'FR0010915314', categorie:'Oblig. Long Terme',     risque:0, perfYtd:'+2,7 %',  perf1an:'−1,1 %',   perf3an:'+2,1 %'   },
  // OPC Obligataires à Échéance
  { nom:'Conservateur Horizon 2031 (C)',                isin:'FR001400PL02', categorie:'Oblig. à Échéance',     risque:0, perfYtd:'+4 %',    perf1an:'—',        perf3an:'—'        },
  // OPC Mixtes Obligataires
  { nom:'Conservateur Diversifié (C)',                  isin:'FR0010564336', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+9,9 %',  perf1an:'+10,8 %',  perf3an:'+16,4 %'  },
  { nom:'Conservateur Diversifié Réactif (C)',          isin:'FR0010489542', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+7,8 %',  perf1an:'+10 %',    perf3an:'+14,8 %'  },
  { nom:'Carmignac Patrimoine (A)',                     isin:'FR0010135103', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+12,1 %', perf1an:'+11,2 %',  perf3an:'+21,5 %'  },
  { nom:'Congrégation Investissement (R)',              isin:'FR001400UAZ4', categorie:'Mixte Obligataire',     risque:0, perfYtd:'—',       perf1an:'—',        perf3an:'—'        },
  { nom:'Eurose (C)',                                   isin:'FR0007051040', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+7,9 %',  perf1an:'+17 %',    perf3an:'+21,2 %'  },
  { nom:'DNCA Invest - Convertibles (B)',               isin:'LU0512124107', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+10,2 %', perf1an:'+4,5 %',   perf3an:'+3,3 %'   },
  { nom:'Conservateur Immo-Or (C)',                     isin:'FR0011199314', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+12,2 %', perf1an:'+5,8 %',   perf3an:'+26,5 %'  },
  { nom:'Conservateur Rendement Flexible (C)',          isin:'FR0013087152', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+3,4 %',  perf1an:'+15,4 %',  perf3an:'+12,9 %'  },
  { nom:'Conservateur Reverso (C)',                     isin:'FR0011175652', categorie:'Mixte Obligataire',     risque:0, perfYtd:'+1,6 %',  perf1an:'−22,1 %',  perf3an:'−23,8 %'  },
  // OPC Actions Françaises
  { nom:'Centifolia (C)',                               isin:'FR0007076930', categorie:'Actions FR',            risque:0, perfYtd:'+20 %',   perf1an:'+34,9 %',  perf3an:'+32,3 %'  },
  { nom:'Conservateur Investissement Proximité (C)',    isin:'FR001400U512', categorie:'Actions FR',            risque:0, perfYtd:'—',       perf1an:'—',        perf3an:'—'        },
  { nom:'Palatine France Small Cap (I)',                isin:'FR0000978439', categorie:'Actions FR',            risque:0, perfYtd:'+18,1 %', perf1an:'−10,7 %',  perf3an:'+13 %'    },
  // OPC Actions Europe
  { nom:'Conservateur Actions Euro (C)',                isin:'FR0014008EI2', categorie:'Actions Europe',        risque:0, perfYtd:'+18,9 %', perf1an:'—',        perf3an:'—'        },
  { nom:'Conservateur Actions Flexibles (C)',           isin:'FR0010038257', categorie:'Actions Europe',        risque:0, perfYtd:'+16,9 %', perf1an:'+12 %',    perf3an:'+29,9 %'  },
  { nom:'Conservateur Emploi Durable (C)',              isin:'FR0010038257', categorie:'Actions Europe',        risque:0, perfYtd:'+5,9 %',  perf1an:'+12,5 %',  perf3an:'+45,3 %'  },
  { nom:'DNCA Invest SRI Norden Europe (A)',            isin:'LU1490785091', categorie:'Actions Europe',        risque:0, perfYtd:'−6 %',    perf1an:'−23,7 %',  perf3an:'+66,7 %'  },
  { nom:'Moneta Multi Caps (C)',                        isin:'FR0010298596', categorie:'Actions Europe',        risque:0, perfYtd:'+26,2 %', perf1an:'+19,8 %',  perf3an:'+63,2 %'  },
  { nom:'ODDO BHF Immobilier (CR-EUR)',                 isin:'FR0000989915', categorie:'Actions Europe',        risque:0, perfYtd:'+7,4 %',  perf1an:'−17,4 %',  perf3an:'−8,7 %'   },
  { nom:'ODDO BHF Avenir (CR-EUR)',                     isin:'FR0000989899', categorie:'Actions Europe',        risque:0, perfYtd:'+5 %',    perf1an:'−10 %',    perf3an:'+15,9 %'  },
  { nom:'OFI RS Croissance Durable et Solidaire (C)',   isin:'FR0000983819', categorie:'Actions Europe',        risque:0, perfYtd:'+15,8 %', perf1an:'+23,6 %',  perf3an:'+65,4 %'  },
  // OPC Actions Internationales
  { nom:'Candriam Equities L Biotech (C)',              isin:'LU1120766388', categorie:'Actions Monde',         risque:0, perfYtd:'+22,1 %', perf1an:'+45 %',    perf3an:'+112,3 %' },
  { nom:'Comgest Renaissance Europe (C)',               isin:'FR0000295230', categorie:'Actions Monde',         risque:0, perfYtd:'−7,3 %',  perf1an:'−10,3 %',  perf3an:'+68,3 %'  },
  { nom:'CPR Global Silver Age (E)',                    isin:'FR0012844140', categorie:'Actions Monde',         risque:0, perfYtd:'−6 %',    perf1an:'−4,2 %',   perf3an:'+32 %'    },
  { nom:'CPR Invest - Food For Gene (A)',               isin:'LU1653748860', categorie:'Actions Monde',         risque:0, perfYtd:'−12,2 %', perf1an:'−19,3 %',  perf3an:'+13,3 %'  },
  { nom:'CPR Invest Climate Action (A)',                isin:'LU1902443420', categorie:'Actions Monde',         risque:0, perfYtd:'+3,4 %',  perf1an:'+23,1 %',  perf3an:'—'        },
  { nom:'Echiquier Artificial Intel. (B)',              isin:'LU1819480192', categorie:'Actions Monde',         risque:0, perfYtd:'+11,7 %', perf1an:'+6,1 %',   perf3an:'—'        },
  { nom:'La Française IP Carbon Impact Glb (R)',        isin:'LU1744646933', categorie:'Actions Monde',         risque:0, perfYtd:'+23,8 %', perf1an:'+14,6 %',  perf3an:'—'        },
  { nom:'EdR Fund - China (A)',                         isin:'LU1160365091', categorie:'Actions Monde',         risque:0, perfYtd:'+10,6 %', perf1an:'−11,5 %',  perf3an:'−6,9 %'   },
  { nom:'EdR India (A)',                                isin:'FR0010479931', categorie:'Actions Monde',         risque:0, perfYtd:'−16,2 %', perf1an:'+8,2 %',   perf3an:'+55,2 %'  },
  { nom:'EdR Fund - US Value (R)',                      isin:'LU1103305709', categorie:'Actions Monde',         risque:0, perfYtd:'−8,1 %',  perf1an:'+15 %',    perf3an:'+38,4 %'  },
  { nom:'EdR Fund - Big Data (A)',                      isin:'LU1244893696', categorie:'Actions Monde',         risque:0, perfYtd:'+5,3 %',  perf1an:'+35,2 %',  perf3an:'+143,5 %' },
  { nom:'FF - World Fund (A)',                          isin:'LU1261432659', categorie:'Actions Monde',         risque:0, perfYtd:'+9,3 %',  perf1an:'+28,8 %',  perf3an:'+109,6 %' },
  { nom:'FF - Sustainable W & W Fund (A)',              isin:'LU1892829828', categorie:'Actions Monde',         risque:0, perfYtd:'−3,2 %',  perf1an:'−11 %',    perf3an:'—'        },
  { nom:'FF - Sustainable Demographics Fund (A)',       isin:'LU0528228074', categorie:'Actions Monde',         risque:0, perfYtd:'+7,6 %',  perf1an:'+1,9 %',   perf3an:'+65,6 %'  },
  { nom:'Echiquier Positive Impact Europe (A)',         isin:'FR0010863688', categorie:'Actions Monde',         risque:0, perfYtd:'−2,2 %',  perf1an:'−6,3 %',   perf3an:'+45,5 %'  },
  { nom:'Magellan (C)',                                 isin:'FR0000292278', categorie:'Actions Monde',         risque:0, perfYtd:'+11,9 %', perf1an:'+0,4 %',   perf3an:'−11,3 %'  },
  { nom:'Conservateur Actions Monde (C)',               isin:'FR0010564229', categorie:'Actions Monde',         risque:0, perfYtd:'+4,5 %',  perf1an:'+22 %',    perf3an:'+59,4 %'  },
  { nom:'ODDO BHF Avenir Europe (CR-EUR)',              isin:'FR0000974149', categorie:'Actions Monde',         risque:0, perfYtd:'+10,1 %', perf1an:'−9,1 %',   perf3an:'+22,5 %'  },
  { nom:'Palatine Planète (R)',                         isin:'FR0010649079', categorie:'Actions Monde',         risque:0, perfYtd:'+11,2 %', perf1an:'+7,5 %',   perf3an:'+61,5 %'  },
  { nom:'Pictet - Clean Energy Transition (P)',         isin:'LU0280435388', categorie:'Actions Monde',         risque:0, perfYtd:'+9,5 %',  perf1an:'+16,6 %',  perf3an:'+129,3 %' },
  { nom:'Pictet - Nutrition (P)',                       isin:'LU0366534344', categorie:'Actions Monde',         risque:0, perfYtd:'−14,1 %', perf1an:'−28,2 %',  perf3an:'+3,7 %'   },
  { nom:'Pictet - Premium Brands (P)',                  isin:'LU0217139020', categorie:'Actions Monde',         risque:0, perfYtd:'−4,5 %',  perf1an:'+0,7 %',   perf3an:'+93,9 %'  },
  // OPC Flexibles
  { nom:'CPR Croissance Réactive (P)',                  isin:'FR0010097683', categorie:'Flexible',             risque:0, perfYtd:'+6,2 %',  perf1an:'+9 %',     perf3an:'+18,9 %'  },
  { nom:'Sextant Grand Large (A)',                      isin:'FR0010286013', categorie:'Flexible',             risque:0, perfYtd:'+2,9 %',  perf1an:'+7,6 %',   perf3an:'+9,8 %'   },
  { nom:'R-co Valor (C)',                               isin:'FR0011253624', categorie:'Flexible',             risque:0, perfYtd:'+16,2 %', perf1an:'+40,9 %',  perf3an:'+89,3 %'  },
  { nom:'Tikehau International Cross Assets (R)',       isin:'LU2147879543', categorie:'Flexible',             risque:0, perfYtd:'+5 %',    perf1an:'+9,3 %',   perf3an:'+23,1 %'  },
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
