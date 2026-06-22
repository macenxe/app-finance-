// Peuple la base avec les 20 produits du design si elle est vide.
import { ouvrirBase, ajouterProduit, listerProduits } from './db';
import { NouveauProduit } from './types';

const ESB = 'SX7E.PA'; // Euro Stoxx Banks — ticker Yahoo Finance

const PRODUITS: NouveauProduit[] = [
  { isin:'FR001400KP78', nom:'Conservateur Autocall CAC 90% Déc 2026',    sousJacent:'^FCHI',  sousJacentLabel:'CAC 40',          typeProduit:'equity', strike:7346,   barriereAutocall:90,  barriereCoupon:null, echeance:'2026-12-15', constat:'1er j./mois*', coupon:6   },
  { isin:'FRF0000001M7', nom:'CAP 40 Août 2030',                           sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:215.10, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-08-13', constat:'29/07/2026',   coupon:7   },
  { isin:'FRF0000001K1', nom:'CAP 50 Août 2030',                           sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:215.10, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-08-13', constat:'29/07/2026',   coupon:6   },
  { isin:'FRF0000001L9', nom:'CAP 60 Août 2030',                           sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:215.10, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-08-13', constat:'29/07/2026',   coupon:5   },
  { isin:'FR0014011HA6', nom:'CAP 40 Décembre 2030',                       sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:243.31, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-12-16', constat:'30/11/2026',   coupon:7   },
  { isin:'FR0014011HB4', nom:'CAP 50 Décembre 2030',                       sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:243.31, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-12-16', constat:'30/11/2026',   coupon:6   },
  { isin:'FR0014011HC2', nom:'CAP 60 Décembre 2030',                       sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:243.31, barriereAutocall:100, barriereCoupon:80,   echeance:'2030-12-16', constat:'30/11/2026',   coupon:5   },
  { isin:'FR0014013KJ7', nom:'CAP 40 Février 2031',                        sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:273.13, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-03-17', constat:'26/02/2027',   coupon:7   },
  { isin:'FR0014013KI9', nom:'CAP 50 Février 2031',                        sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:273.13, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-03-17', constat:'26/02/2027',   coupon:6   },
  { isin:'FR0014013KK5', nom:'CAP 60 Février 2031',                        sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:273.13, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-03-17', constat:'26/02/2027',   coupon:5   },
  { isin:'FRF0000002N3', nom:'CAP 40 Avril 2031',                          sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:257.72, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-05-12', constat:'27/04/2027',   coupon:7   },
  { isin:'FRF0000002M5', nom:'CAP 50 Avril 2031',                          sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:257.72, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-05-12', constat:'27/04/2027',   coupon:6   },
  { isin:'FRF0000002O1', nom:'CAP 60 Avril 2031',                          sousJacent:ESB,      sousJacentLabel:'ES Banks',         typeProduit:'equity', strike:257.72, barriereAutocall:100, barriereCoupon:80,   echeance:'2031-05-12', constat:'27/04/2027',   coupon:5   },
  { isin:'FR1459AB7782', nom:'Conservateur Autocall CMS Juillet 2030',     sousJacent:'CMS10',  sousJacentLabel:'CMS 10 ans',       typeProduit:'cms',    strike:null,   barriereAutocall:2.50,barriereCoupon:3.00, echeance:'2030-07-25', constat:'13/07/2026',   coupon:4.25},
  { isin:'FR00140108S4', nom:'Conservateur Autocall CMS Octobre 2030',     sousJacent:'CMS10',  sousJacentLabel:'CMS 10 ans',       typeProduit:'cms',    strike:null,   barriereAutocall:2.25,barriereCoupon:2.75, echeance:'2030-10-30', constat:'16/10/2026',   coupon:4   },
  { isin:'FR0014012R49', nom:'Conservateur Autocall CMS Janvier 2031',     sousJacent:'CMS10',  sousJacentLabel:'CMS 10 ans',       typeProduit:'cms',    strike:null,   barriereAutocall:2.20,barriereCoupon:2.85, echeance:'2031-02-03', constat:'18/01/2027',   coupon:4   },
  { isin:'FR0014014XL4', nom:'Conservateur Autocall CMS Avril 2031',       sousJacent:'CMS10',  sousJacentLabel:'CMS 10 ans',       typeProduit:'cms',    strike:null,   barriereAutocall:2.50,barriereCoupon:3.00, echeance:'2031-05-02', constat:'12/04/2027',   coupon:4   },
  { isin:'FRF0000001C8', nom:'LC Athena BNP Juillet 2030',                 sousJacent:'BNP.PA', sousJacentLabel:'BNP Paribas',      typeProduit:'equity', strike:77.84,  barriereAutocall:100, barriereCoupon:null, echeance:'2030-07-31', constat:'20/07/2026',   coupon:10  },
  { isin:'FRBCP1260215', nom:'LC Athena Stellantis Novembre 2030',         sousJacent:'STLAM.MI',sousJacentLabel:'Stellantis',      typeProduit:'equity', strike:8.45,   barriereAutocall:100, barriereCoupon:null, echeance:'2030-11-28', constat:'16/11/2026',   coupon:11  },
  { isin:'FR0014015OJ4', nom:'LC Athena Capgemini Mai 2031',               sousJacent:'CAP.PA', sousJacentLabel:'Capgemini',        typeProduit:'equity', strike:106.10, barriereAutocall:100, barriereCoupon:null, echeance:'2031-05-12', constat:'04/05/2027',   coupon:10  },
];

export function seederBase(db: ReturnType<typeof ouvrirBase>): void {
  if (listerProduits(db).length > 0) return; // déjà seedé
  for (const p of PRODUITS) ajouterProduit(db, p);
  console.log(`Seed : ${PRODUITS.length} produits insérés.`);
}
