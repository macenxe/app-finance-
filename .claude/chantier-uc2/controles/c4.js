// Contrôle du lot 4 — aperçu de la liste UC (exécuté dans la page de l'aperçu, viewport mobile).
// Mesure : DOM de la page « contrats » (cartes .uc-item[data-isin], pastilles .uc-chip-nb) pour les
//   onglets Tous / Mut / Fin. Les erreurs console sont lues à part (read_console_messages).
// Exigences : Tous 63, Mut 61, Fin 28 (cartes ET pastilles) ; les 10 ajouts présents ; aucun des 4 retraits.
(async () => {
  const AJOUTS = ['FR0013367265', 'FR0010871830', 'IE000S1JLOI7', 'FR0014014FK3', 'LU1317704051',
                  'LU1833929729', 'LU0255976994', 'LU0270904781', 'LU0104884860', 'FR0010380675'];
  const RETRAITS = ['FR0010479931', 'LU1103305709', 'LU1752460292', 'FR001400U512'];
  const ATTENDU = { Tous: 63, Mut: 61, Fin: 28 };
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const ecarts = [], mesure = {};
  App.goto('contrats');
  await attendre(800);
  for (const [lib, cat] of [['Tous', null], ['Mut', 'Mut'], ['Fin', 'Fin']]) {
    App.setUcCat(cat);
    await attendre(600);
    const isins = new Set([...document.querySelectorAll('.uc-item[data-isin]')].map((e) => e.dataset.isin));
    const chip = [...document.querySelectorAll('.uc-chip')].find((b) => b.classList.contains('active'));
    const nbChip = chip ? Number(chip.querySelector('.uc-chip-nb').textContent) : null;
    mesure[lib] = { cartes: isins.size, pastille: nbChip };
    if (isins.size !== ATTENDU[lib]) ecarts.push(`${lib} : ${isins.size} cartes (attendu ${ATTENDU[lib]})`);
    if (nbChip !== ATTENDU[lib]) ecarts.push(`${lib} : pastille ${nbChip} (attendu ${ATTENDU[lib]})`);
    if (lib !== 'Fin') AJOUTS.filter((i) => !isins.has(i)).forEach((i) => ecarts.push(`${lib} : ${i} absent`));
    else AJOUTS.filter((i) => isins.has(i)).forEach((i) => ecarts.push(`Fin : ${i} présent (D1 : Mut seulement)`));
    RETRAITS.filter((i) => isins.has(i)).forEach((i) => ecarts.push(`${lib} : ${i} retiré mais affiché`));
  }
  App.setUcCat(null);
  return { mesure, ecarts, conforme: ecarts.length === 0 };
})()
