const { test } = require('node:test');
const assert = require('node:assert/strict');
const Autocall = require('./autocall.js');

const today = new Date(2026, 6, 15);            // 15/07/2026
const jour = (y, m, d) => new Date(y, m - 1, d).getTime();
const pt = (y, m, d, c) => ({ t: new Date(y, m - 1, d).getTime() / 1000, c });

// Base produit CMS / equity (format interne du front).
const cms = (o) => ({ type: 'cms', constat: '13/07/2027', emission: '2025-07-13', ech: '25/07/2030',
  strikeNum: null, niveau: '3,04 %', bAutoNum: 2.5, bCouponNum: 3.0, coupon: '4,25 %', estBaisse: true, ...o });
const eq = (o) => ({ type: 'equity', constat: '13/07/2027', emission: '2024-07-13', ech: '25/07/2030',
  strikeNum: 100, bAutoNum: 100, bCouponNum: null, coupon: '10 %', estBaisse: false, ...o });

test('datesConstatation annuel : 1 passée + prochaine (constat futur ou déjà passé)', () => {
  const d1 = Autocall.datesConstatation({ constat: '13/07/2027', emission: '2025-07-13', ech: '25/07/2030' }, today);
  assert.equal(d1.mode, 'annuel');
  assert.equal(d1.passees.length, 1);
  assert.equal(d1.passees[0].getTime(), jour(2026, 7, 13));
  assert.equal(d1.prochaine.getTime(), jour(2027, 7, 13));
  // NB : même si le champ constat vaut encore la date passée.
  const d2 = Autocall.datesConstatation({ constat: '13/07/2026', emission: '2025-07-13', ech: '25/07/2030' }, today);
  assert.equal(d2.passees.length, 1);
  assert.equal(d2.prochaine.getTime(), jour(2027, 7, 13));
});

test('evaluer CMS non rappelé, coupon manqué → réserve', () => {
  const r = Autocall.evaluer(cms({}), [pt(2026, 7, 13, 3.04)], today);
  assert.equal(r.rappele, false);
  assert.equal(r.couponsReserve, 4.25);
  assert.equal(r.nPlusX, 'N+2');
});

test('evaluer CMS rappelé', () => {
  const r = Autocall.evaluer(cms({}), [pt(2026, 7, 13, 2.4)], today);
  assert.equal(r.rappele, true);
  assert.equal(r.aVerserAuRappel, 4.25);
});

test('evaluer equity Athena (sans barrière coupon) rappelé en N+2', () => {
  const r = Autocall.evaluer(eq({}), [pt(2025, 7, 13, 90), pt(2026, 7, 13, 110)], today);
  assert.equal(r.rappele, true);
  assert.equal(r.nPlusX, 'N+2');
  assert.equal(r.aVerserAuRappel, 20);          // 2 coupons de 10 %
});

test('evaluer equity CAP effet mémoire : réserve puis versement', () => {
  const p = eq({ bCouponNum: 80, coupon: '7 %' });
  const r = Autocall.evaluer(p, [pt(2025, 7, 13, 75), pt(2026, 7, 13, 85)], today);
  assert.equal(r.rappele, false);
  assert.equal(r.couponsVerses, 14);            // 2 coupons versés d'un coup
  assert.equal(r.couponsReserve, 0);
});

test('fallback niveau actuel : points vides, constat récente → rappel', () => {
  const p = eq({ emission: '2025-07-13', niveauNum: 120 });   // 1 passée le 13/07/2026 (< 45 j)
  const r = Autocall.evaluer(p, [], today);
  assert.equal(r.rappele, true);
});
