// Lot 1 (déterministe) — enrichit referentiel.json :
//  - gerant : code court dérivé de la société (D9) ;
//  - reprise des valeurs de production pour les 15 UC existantes (graphId, srri, strategie,
//    equity) depuis front/data.js (source de vérité d'avant-chantier) ;
//  - equity d'amorce par section pour les nouvelles (D10, réécrit au lot 3 depuis la compo) ;
//  - résolution Yahoo (search → 0P….F) et FT (tearsheet → xid) pour les nouvelles ;
//    non-résolu → null + note (D5). Les champs éditoriaux (srri, strategie) des nouvelles
//    restent à remplir par le workflow du lot 1.
import { readFileSync, writeFileSync } from 'fs';
import vm from 'vm';

const REF = '/Users/maxenceevrard/Documents/claude/application finance/.claude/chantier-uc/referentiel.json';
const DATA_JS = '/Users/maxenceevrard/Documents/claude/application finance/front/data.js';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const GERANTS = {
  'Candriam': 'Cand', 'DNCA Finance': 'DNCA', 'COMGEST': 'Cg', 'Conservateur Gestion Valor': 'C',
  'Palatine AM': 'Pal', 'CPR AM': 'CPR', "La Financière de l'Echiquier": 'LFDE',
  'Edmond de Rothschild AM': 'EdR', 'FIL Investment Management': 'Fid', 'La Française AM': 'LF',
  'Moneta AM': 'Mon', 'ODDO BHF AM SAS': 'ODDO', 'OFI AM': 'OFI', 'Pictet AM': 'Pct',
  'Carmignac Gestion': 'Carm', 'Rothschild & Co AM': 'R·co', 'Amiral Gestion': 'Am', 'Tikehau IM': 'Tik',
};
const EQUITY_SECTION = { Actions: 95, Mixtes: 50, Obligations: 5, 'Monétaires': 0 };

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

// Catalogue de production : data.js évalué en sandbox (fichier de constantes globales).
function catalogueProduction() {
  const ctx = vm.createContext({});
  // Les `const` du script ne deviennent pas des propriétés du contexte : on lit la valeur
  // en expression finale.
  return vm.runInContext(readFileSync(DATA_JS, 'utf8') + '\n;UC_CATALOGUE;', ctx);
}

async function yahooSymbol(isin, libelle) {
  for (const q of [isin, libelle]) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`,
        { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const quotes = (await r.json())?.quotes || [];
      const fonds = quotes.find((x) => /^0P\w+\.F$/.test(x.symbol || ''));
      if (fonds) return fonds.symbol;
    } catch { /* essai suivant */ }
    await dodo(250);
  }
  return null;
}

async function ftXid(isin) {
  try {
    const r = await fetch(`https://markets.ft.com/data/funds/tearsheet/summary?s=${encodeURIComponent(isin)}:EUR`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const m = (await r.text()).match(/&quot;xid&quot;:&quot;(\d+)&quot;/);
    return m ? m[1] : null;
  } catch { return null; }
}

const doc = JSON.parse(readFileSync(REF, 'utf8'));
const prod = new Map(catalogueProduction().map((u) => [u.isin, u]));
let resolus = 0, manques = 0;

for (const u of doc.ucs) {
  u.gerant = GERANTS[u.societe] ?? null;
  if (!u.gerant) throw new Error(`société sans code gérant : ${u.societe}`);
  const p = prod.get(u.isin);
  if (p) {
    // UC existante : reprise à l'identique (non-régression C1).
    u.graphId = p.graphId; u.srri = p.srri; u.strategie = p.strategie; u.equity = p.equity;
    u.libelleProd = p.nom;
    u.xid = null; u.xid_note = 'déjà en production (xidRepli maintenu dans uc-history.ts)';
    continue;
  }
  u.equity = EQUITY_SECTION[u.section];
  u.graphId = await yahooSymbol(u.isin, u.libelle);
  await dodo(300);
  u.xid = await ftXid(u.isin);
  await dodo(300);
  if (!u.graphId) { u.graphId_note = 'introuvable via Yahoo search (ISIN et libellé) — D5 : ligne non cliquable'; manques++; }
  else resolus++;
  if (!u.xid) u.xid_note = 'tearsheet FT sans xid — uc-history résoudra à chaud ou le fonds restera sans historique statique';
  console.log(`${u.isin} → graphId ${u.graphId ?? 'null'} | xid ${u.xid ?? 'null'}`);
}

writeFileSync(REF, JSON.stringify(doc, null, 1));
console.log(`Résolution terminée : ${resolus} graphId trouvés, ${manques} manquants sur les nouvelles.`);
