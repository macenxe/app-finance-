// Lot 2 (déterministe) — génère depuis referentiel.json :
//  - le bloc UC_CATALOGUE de front/data.js (56 entrées, ordre du fichier, flags mut/fin) ;
//  - les listes FONDS de back/src/fonds-meta.ts, uc-history.ts, uc-managers.ts
//    (les 55 UC avec graphId ; Eurose C sans source de cours en est absente, D5/I2).
// UC_FAVORIS et le reste des fichiers ne sont pas touchés.
// D11 : libellé d'affichage = nom de production pour les 15 UC existantes, libellé Excel
// (corrigé D7) pour les nouvelles.
import { readFileSync, writeFileSync } from 'fs';

const BASE = '/Users/maxenceevrard/Documents/claude/application finance';
const REF = JSON.parse(readFileSync(`${BASE}/.claude/chantier-uc/referentiel.json`, 'utf8')).ucs;
const CAT = { Actions: 'Actions', Obligations: 'Obligataire', Mixtes: 'Mixte / Flexible', 'Monétaires': 'Monétaire' };

const js = (v) => JSON.stringify(v);

// ── UC_CATALOGUE (front/data.js) ──
const entrees = REF.map((u, i) => {
  const nom = u.libelleProd ?? u.libelle;
  const champs = [
    `rang:${i + 1}`, `gerant:${js(u.gerant)}`, `nom:${js(nom)}`, `isin:${js(u.isin)}`,
    `categorie:${js(CAT[u.section])}`, `srri:${u.srri === null ? 'null' : u.srri}`,
    `equity:${u.equity}`, `graphId:${u.graphId === null ? 'null' : js(u.graphId)}`,
    `mut:${u.mutuelle === 'Ouvert'}`, `fin:${u.cto === 'Ouvert'}`,
  ];
  const strategie = u.strategie === null ? '    strategie:null },' : `    strategie:${js(u.strategie)} },`;
  return `  { ${champs.join(', ')},\n${strategie}`;
});
const blocCatalogue = `const UC_CATALOGUE = [\n${entrees.join('\n')}\n];`;

let dataJs = readFileSync(`${BASE}/front/data.js`, 'utf8');
const reCat = /const UC_CATALOGUE = \[[\s\S]*?\n\];/;
if (!reCat.test(dataJs)) throw new Error('bloc UC_CATALOGUE introuvable dans data.js');
dataJs = dataJs.replace(reCat, blocCatalogue);
// Commentaire de tête du catalogue : reflète la nouvelle source de vérité.
dataJs = dataJs.replace(
  /\/\/ ── Catalogue UC suivi \(sélection ordonnée : actions → obligataire\) ──/,
  '// ── Catalogue UC suivi (56 supports éligibles, ordre du référentiel « Supports éligibles\n// CHP CHC CER CTO - 12-2025 » ; généré par .claude/chantier-uc/scripts/lot2-catalogue.mjs) ──\n// mut/fin : éligibilité Mutuelle (CHP/CHC/CER) / Finance (CTO).',
);
writeFileSync(`${BASE}/front/data.js`, dataJs);

// ── Listes back (55 UC avec graphId) ──
const avecId = REF.filter((u) => u.graphId);
const nomCourt = (u) => (u.libelleProd ?? u.libelle).replace(/\s*\([^)]*\)\s*$/, '').trim();

const remplacer = (fichier, re, bloc) => {
  const chemin = `${BASE}/back/src/${fichier}`;
  let src = readFileSync(chemin, 'utf8');
  if (!re.test(src)) throw new Error(`bloc FONDS introuvable dans ${fichier}`);
  src = src.replace(re, bloc);
  writeFileSync(chemin, src);
};

remplacer('fonds-meta.ts', /const FONDS: \[string, string\]\[\] = \[[\s\S]*?\n\];/,
  `const FONDS: [string, string][] = [\n${avecId.map((u) => `  [${js(u.isin)}, ${js(u.graphId)}],`).join('\n')}\n];`);

// xidRepli des 15 UC de production : valeurs éprouvées d'avant-chantier (le référentiel les
// porte à null car uc-history les possédait déjà).
const XID_PROD = {
  FR0011253624: '519283609', LU1819480192: '118269986', LU1244893696: '436934526',
  LU0280435388: '7034894', LU0217139020: '55108085', FR0010564229: '535705860',
  FR0000295230: '28293710', LU1261432659: '535674156', FR0013256930: '535630594',
  FR0010489542: '29420762', FR0013087152: '116366721', FR0010564336: '535689289',
  LU1694790202: '535718490', FR0011461326: '535673498', FR0013287315: '535659321',
};

remplacer('uc-history.ts', /const FONDS: \{ isin: string; graphId: string; xidRepli: string \}\[\] = \[[\s\S]*?\n\];/,
  `const FONDS: { isin: string; graphId: string; xidRepli: string }[] = [\n${avecId.map((u) =>
    `  { isin: ${js(u.isin)}, graphId: ${js(u.graphId)}, xidRepli: ${js(XID_PROD[u.isin] ?? String(u.xid ?? ''))} },`
  ).join('\n')}\n];`);

remplacer('uc-managers.ts', /const FONDS: \[string, string, string\]\[\] = \[[\s\S]*?\n\];/,
  `const FONDS: [string, string, string][] = [\n${avecId.map((u) => `  [${js(u.isin)}, ${js(u.graphId.replace(/\.F$/, ''))}, ${js(nomCourt(u))}],`).join('\n')}\n];`);

console.log(`Catalogue généré : 56 entrées ; listes back : ${avecId.length} UC.`);
