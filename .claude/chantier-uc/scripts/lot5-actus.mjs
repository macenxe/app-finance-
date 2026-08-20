// Lot 5 (déterministe) — étend les actus UC à tout le catalogue (D8) :
//  - FLUX_UC_FONDS de back/src/news.ts régénéré depuis referentiel.json : nom de recherche
//    par fonds (libellé nettoyé du suffixe de part, surcharges curatées pour les libellés
//    abrégés de l'Excel et les 15 noms historiques), dédoublonné (parts multiples d'un
//    même fonds → un seul nom, ex. Congrégation Investissement C/R) ;
//  - générateur FLUX_UC réécrit : tranches de 7 noms (≈ 8 requêtes OR), tagParMot trié par
//    longueur décroissante (un nom court préfixe d'un long ne capte plus ses titres) ;
//  - table isin → nom émise dans .claude/chantier-uc/actus-noms.json pour le contrôle C5.
import { readFileSync, writeFileSync } from 'fs';

const BASE = '/Users/maxenceevrard/Documents/claude/application finance';
const REF = JSON.parse(readFileSync(`${BASE}/.claude/chantier-uc/referentiel.json`, 'utf8')).ucs;

// Surcharges : 15 noms historiques (liste curatée d'avant-chantier) + libellés Excel abrégés
// remis en toutes lettres (une recherche Google News quotée sur une abréviation ne matche rien).
const SURCHARGES = {
  FR0011253624: 'R-co Valor', LU1819480192: 'Echiquier Artificial Intelligence',
  LU1244893696: 'EdR Fund Big Data', LU0280435388: 'Pictet Clean Energy Transition',
  LU0217139020: 'Pictet-Premium Brands', FR0010564229: 'Conservateur Actions Monde',
  FR0000295230: 'Comgest Renaissance Europe', LU1261432659: 'Fidelity World Fund',
  FR0013256930: 'Conservateur Actions Flexibles', FR0010489542: 'Conservateur Diversifié Réactif',
  FR0013087152: 'Conservateur Rendement Flexible', FR0010564336: 'Conservateur Diversifié',
  LU1694790202: 'DNCA Invest Flex Inflation', FR0011461326: 'Conservateur Obligations Court Terme',
  FR0013287315: 'Palatine Monétaire Court Terme',
  LU1653748860: 'CPR Invest Food For Generations',
  LU0528228074: 'Fidelity Global Demographics',
  LU1892829828: 'Fidelity Sustainable Water & Waste',
  LU1744646933: 'La Française Carbon Impact Global',
  LU1752460292: 'ODDO BHF Sustainable Credit Opportunities',
  LU1585265066: 'Tikehau Short Duration',
};
const nomRecherche = (u) => SURCHARGES[u.isin]
  ?? u.libelle.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+-\s+/g, ' ').trim();

const parIsin = {};
const noms = [];
for (const u of REF) {
  const n = nomRecherche(u);
  parIsin[u.isin] = n;
  if (!noms.includes(n)) noms.push(n);
}
writeFileSync(`${BASE}/.claude/chantier-uc/actus-noms.json`, JSON.stringify(parIsin, null, 1));

const js = (v) => `'${v.replace(/'/g, "\\'")}'`;
const lignes = [];
for (let i = 0; i < noms.length; i += 4) lignes.push('  ' + noms.slice(i, i + 4).map((n) => js(n) + ',').join(' '));

let src = readFileSync(`${BASE}/back/src/news.ts`, 'utf8');

const reListe = /\/\/ Les \d+ fonds du cabinet[\s\S]*?const FLUX_UC_FONDS = \[[\s\S]*?\];/;
if (!reListe.test(src)) throw new Error('bloc FLUX_UC_FONDS introuvable');
src = src.replace(reListe, `// Les fonds du catalogue (nom de recherche par fonds, sans suffixe de part — généré par
// .claude/chantier-uc/scripts/lot5-actus.mjs depuis le référentiel « Supports éligibles ») —
// actu des fonds eux-mêmes, pas des sociétés de gestion (D23/D24). Les parts multiples d'un
// même fonds partagent un nom unique (ex. Congrégation Investissement C/R).
const FLUX_UC_FONDS = [
${lignes.join('\n')}
];`);

const reBuilder = /\/\/ Volume faible attendu[\s\S]*?const FLUX_UC: Flux\[\] = \[[\s\S]*?\n\}\);/;
if (!reBuilder.test(src)) throw new Error('générateur FLUX_UC introuvable');
src = src.replace(reBuilder, `// Volume faible attendu (presse spécialisée peu couverte en fetch direct — mesuré au lot 1) :
// pas de liste blanche de sources ici, seul le titre doit mentionner le fonds.
// Les fonds sont regroupés en requêtes OR par tranches de 7 (budget sous-requêtes : ce flux
// n'est exécuté que par GitHub Actions, D30). Le label de carte reste le fonds matché grâce à
// tagParMot ; ses clés sont triées par longueur décroissante pour qu'un nom court préfixe d'un
// nom plus long (« Conservateur Diversifié » vs « … Réactif ») ne capte pas ses titres.
const FLUX_UC: Flux[] = (() => {
  const groupes: string[][] = [];
  for (let i = 0; i < FLUX_UC_FONDS.length; i += 7) groupes.push(FLUX_UC_FONDS.slice(i, i + 7));
  return groupes.map((groupe) => {
    const tries = [...groupe].sort((a, b) => b.length - a.length);
    const mots = tries.map((n) => n.toLowerCase());
    const tagParMot: Record<string, string> = Object.fromEntries(tries.map((n) => [n.toLowerCase(), n]));
    if (groupe.includes('R-co Valor')) { mots.push('r co valor'); tagParMot['r co valor'] = 'R-co Valor'; }
    if (groupe.includes('Pictet-Premium Brands')) { mots.push('pictet premium brands'); tagParMot['pictet premium brands'] = 'Pictet-Premium Brands'; }
    const q = groupe.map((n) => \`"\${n}"\`).join(' OR ');
    return { ...fluxGoogleNews(q, '30d', 'uc', mots, []), tag: groupe[0], tagParMot, max: 6, dispenseSource: true };
  });
})();`);

writeFileSync(`${BASE}/back/src/news.ts`, src);
console.log(`Actus UC : ${noms.length} noms uniques, ${Math.ceil(noms.length / 7)} requêtes.`);
