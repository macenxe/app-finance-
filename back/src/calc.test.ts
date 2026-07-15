import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerIndicateurs } from './calc';
import type { ProduitStructure, CoursMarche } from './types';

const base = {
  id: 1, isin: 'X', nom: 'X', sousJacent: 'X', sousJacentLabel: 'X',
  emission: '', echeance: '2030-01-01', constat: '', coupon: 5,
};
const prod = (o: Partial<ProduitStructure>): ProduitStructure => ({
  ...base, typeProduit: 'equity', strike: null, barriereAutocall: null, barriereCoupon: null, protection: null, ...o,
});
const cours = (n: number): CoursMarche => ({ sousJacent: 'X', dernierCours: n, heureCours: '' });

test('equity autocall classique (barrière 100 %) : rappel au-dessus du seuil', () => {
  const p = prod({ typeProduit: 'equity', strike: 100, barriereAutocall: 100, barriereCoupon: 70 });
  assert.equal(calculerIndicateurs(p, cours(101)).zoneAutocall, true);
  assert.equal(calculerIndicateurs(p, cours(99)).zoneAutocall, false);
});

test('equity autocall à la baisse (barrière < 100 %) : rappel au niveau ou en-dessous', () => {
  const p = prod({ typeProduit: 'equity', strike: 100, barriereAutocall: 80, barriereCoupon: 70 });
  assert.equal(calculerIndicateurs(p, cours(80)).zoneAutocall, true);
  assert.equal(calculerIndicateurs(p, cours(79)).zoneAutocall, true);
  assert.equal(calculerIndicateurs(p, cours(85)).zoneAutocall, false);
});

test('CMS : rappelé quand le taux descend à / sous la barrière autocall', () => {
  const p = prod({ typeProduit: 'cms', barriereAutocall: 2.5, barriereCoupon: 3.0 });
  assert.equal(calculerIndicateurs(p, cours(2.4)).zoneAutocall, true);
  assert.equal(calculerIndicateurs(p, cours(2.5)).zoneAutocall, true);
  assert.equal(calculerIndicateurs(p, cours(2.93)).zoneAutocall, false);
});

test('CMS : taux au-dessus de la barrière de coupon = zone défavorable (risque)', () => {
  const p = prod({ typeProduit: 'cms', barriereAutocall: 2.5, barriereCoupon: 3.0 });
  assert.equal(calculerIndicateurs(p, cours(3.2)).statutZone, 'risque');
  assert.equal(calculerIndicateurs(p, cours(2.93)).statutZone, 'surveillance');
});
