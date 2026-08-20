// Génère front/data/fonds-meta.json : fiche signalétique des UC du catalogue — note Morningstar,
// note de risque Morningstar, société de gestion et performances CALENDAIRES officielles.
// Génère aussi front/data/uc-compo/<ISIN>.json (répartition par classes d'actifs, secteurs,
// principales lignes) depuis le même appel quoteSummary (module topHoldings) : la composition
// suit donc la même cadence de rafraîchissement que les fiches (hebdomadaire, snapshot.yml).
//
// Pourquoi un instantané et pas un appel direct depuis le navigateur :
//  1. l'endpoint quoteSummary de Yahoo n'autorise pas le CORS et exige un couple cookie + crumb,
//     donc il faudrait de toute façon passer par le Worker ;
//  2. ces valeurs ne bougent qu'une fois par mois au plus (la note Morningstar est mensuelle),
//     alors qu'un fichier statique servi en même origine est instantané, sans clé et hors ligne.
// Lancé par GitHub Actions (voir .github/workflows/snapshot.yml) ; à exécuter depuis back/.
//
// ⚠️ La liste ci-dessous double UC_CATALOGUE (front/data.js) : à tenir synchronisée quand une UC
// entre ou sort du catalogue. Même contrainte que TICKERS dans history-snapshot.ts.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SORTIE = join(process.cwd(), '..', 'front', 'data', 'fonds-meta.json');
const SORTIE_COMPO = join(process.cwd(), '..', 'front', 'data', 'uc-compo');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

// [ISIN (clé côté front), identifiant Morningstar servi par Yahoo (= graphId de UC_CATALOGUE)]
const FONDS: [string, string][] = [
  ["LU1120766388", "0P00016ALF.F"],
  ["FR0007076930", "0P00000NME.F"],
  ["FR0000295230", "0P00000PM8.F"],
  ["FR0014008EI2", "0P0001P8TA.F"],
  ["FR0013256930", "0P0001HI3U.F"],
  ["FR0010564229", "0P0000INCI.F"],
  ["FR0010038257", "0P00001NMQ.F"],
  ["FR001400U512", "0P0001UVBG.F"],
  ["FR0012844140", "0P00016HZ8.F"],
  ["LU1653748860", "0P0001BOX5.F"],
  ["LU1902443420", "0P0001FLNU.F"],
  ["LU0870553020", "0P0000XTFD.F"],
  ["LU1490785091", "0P000195NQ.F"],
  ["LU1819480192", "0P0001DYQM.F"],
  ["FR0010863688", "0P0000O4H2.F"],
  ["LU1244893696", "0P00016P7T.F"],
  ["LU1160365091", "0P00016716.F"],
  ["LU1103305709", "0P000172SH.F"],
  ["FR0010479931", "0P000018ZI.F"],
  ["LU0528228074", "0P0000VTJH.F"],
  ["LU1892829828", "0P0001EVSZ.F"],
  ["LU1261432659", "0P00016FY4.F"],
  ["LU1744646933", "0P0001DK5M.F"],
  ["FR0000292278", "0P00000PM7.F"],
  ["FR0010298596", "0P00005ZUG.F"],
  ["FR0000989899", "0P00000QLE.F"],
  ["FR0000974149", "0P00000QLM.F"],
  ["FR0000989915", "0P00000QLD.F"],
  ["FR0000983819", "0P00000HN7.F"],
  ["FR0000978439", "0P00000QN4.F"],
  ["FR0010649079", "0P0000KM3B.F"],
  ["LU0280435388", "0P00008OBQ.F"],
  ["LU0366534344", "0P0000K8E5.F"],
  ["LU0217139020", "0P000021C4.F"],
  ["FR001400PL02", "0P0001UGT3.F"],
  ["FR0010564328", "0P0000INO5.F"],
  ["LU1694790202", "0P0001CH1A.F"],
  ["FR0010915314", "0P0000236X.F"],
  ["LU1752460292", "0P0001EITS.F"],
  ["FR0010135103", "0P00000FB4.F"],
  ["FR0007439666", "0P00005VUH.F"],
  ["FR001400UAZ4", "0P0001XK54.F"],
  ["FR0010564336", "0P0000JLHZ.F"],
  ["FR0010489542", "0P0000JZWP.F"],
  ["FR0011199314", "0P0000VYE0.F"],
  ["FR0013087152", "0P00019OMO.F"],
  ["FR0011175652", "0P00015XU2.F"],
  ["FR0010097683", "0P00000CGO.F"],
  ["LU0512124107", "0P0000P3DN.F"],
  ["FR0011253624", "0P00017T6E.F"],
  ["FR0010286013", "0P00000EUQ.F"],
  ["LU2147879543", "0P0001L9PD.F"],
  ["FR0011461326", "0P0000ZL7Q.F"],
  ["FR0013287315", "0P0001CB5C.F"],
  ["LU1585265066", "0P0001KJDD.F"],
];

type Meta = {
  note: number | null;          // note Morningstar globale, 1 à 5 étoiles
  risque: number | null;        // note de risque Morningstar, 1 (faible) à 5 (élevé)
  societe: string | null;       // société de gestion telle que déclarée par le fonds
  annuels: Record<string, number>; // performances calendaires officielles, en %
};
type Compo = {
  isin: string;
  alloc: { action: number; obligation: number; liquidite: number; autre: number };
  secteurs: { nom: string; pct: number }[];
  holdings: { nom: string; pct: number }[];
};

const brut = (v: any) => (v && typeof v === 'object' && 'raw' in v ? v.raw : v);

// Libellés français des secteurs Yahoo (mêmes intitulés que les fichiers uc-compo historiques).
const SECTEURS_FR: Record<string, string> = {
  consumer_cyclical: 'Conso. cyclique', basic_materials: 'Matériaux', healthcare: 'Santé',
  industrials: 'Industrie', communication_services: 'Communication', technology: 'Technologie',
  financial_services: 'Finance', utilities: 'Services collectifs', consumer_defensive: 'Conso. de base',
  realestate: 'Immobilier', energy: 'Énergie',
};

// Répartition par classes d'actifs, normalisée à 100 (poids négatifs — cash de levier repo —
// ramenés à 0 : la barre du front attend des poids positifs sommant à 100). Renvoie null si les
// données sont inexploitables (somme quasi nulle) pour conserver le fichier précédent.
function composer(isin: string, th: any): Compo | null {
  if (!th) return null;
  const pos = (k: string) => Math.max(0, brut(th[k]) ?? 0) * 100;
  const cru = {
    action: pos('stockPosition'),
    obligation: pos('bondPosition') + pos('preferredPosition') + pos('convertiblePosition'),
    liquidite: pos('cashPosition'),
    autre: pos('otherPosition'),
  };
  const tot = cru.action + cru.obligation + cru.liquidite + cru.autre;
  if (tot < 50) return null;
  const alloc = Object.fromEntries(
    Object.entries(cru).map(([k, v]) => [k, +(v / tot * 100).toFixed(1)]),
  ) as Compo['alloc'];
  const secteurs = (th.sectorWeightings || [])
    .flatMap((o: any) => Object.entries(o).map(([k, v]) => ({ nom: SECTEURS_FR[k] ?? k, pct: +((brut(v) ?? 0) * 100).toFixed(1) })))
    .sort((a: any, b: any) => b.pct - a.pct);
  const holdings = (th.holdings || [])
    .map((h: any) => ({ nom: h.holdingName, pct: +((brut(h.holdingPercent) ?? 0) * 100).toFixed(1) }))
    .filter((h: any) => h.nom);
  return { isin, alloc, secteurs, holdings };
}

// quoteSummary refuse les requêtes nues depuis 2023 : il faut un cookie de session Yahoo ET le
// « crumb » associé, à passer ensemble. Les deux se périment, on les prend à chaque exécution.
async function session(): Promise<{ cookie: string; crumb: string }> {
  const r = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA } });
  const cookie = (r.headers.getSetCookie?.() || []).map((s) => s.split(';')[0]).join('; ');
  const crumb = (
    await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, cookie } })
      .then((x) => x.text())
  ).trim();
  if (!cookie || !crumb || crumb.length > 40) throw new Error('cookie/crumb Yahoo indisponible');
  return { cookie, crumb };
}

async function meta(isin: string, id: string, s: { cookie: string; crumb: string }): Promise<{ meta: Meta; compo: Compo | null }> {
  const modules = 'defaultKeyStatistics,fundProfile,fundPerformance,topHoldings';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(id)}`
    + `?modules=${modules}&crumb=${encodeURIComponent(s.crumb)}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, cookie: s.cookie } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const res = (await r.json())?.quoteSummary?.result?.[0];
  if (!res) throw new Error('réponse vide');
  const dks = res.defaultKeyStatistics || {};
  const annuels: Record<string, number> = {};
  for (const a of res.fundPerformance?.annualTotalReturns?.returns || []) {
    const v = brut(a.annualValue);
    // L'année en cours est présente mais vide (NaN) : la performance de l'année courante est
    // calculée côté front sur la série de cours, pour rester alignée sur le graphique affiché.
    if (a.year && typeof v === 'number' && Number.isFinite(v)) annuels[String(a.year)] = +(v * 100).toFixed(1);
  }
  return {
    meta: {
      // Yahoo renvoie 0 pour « non noté » (échelle Morningstar : 1 à 5) : 0 devient null,
      // sinon le front afficherait « 0 étoile sur 5 » pour un fonds simplement non noté.
      note: brut(dks.morningStarOverallRating) || null,
      risque: brut(dks.morningStarRiskRating) || null,
      societe: res.fundProfile?.family || null,
      annuels,
    },
    compo: composer(isin, res.topHoldings),
  };
}

async function main() {
  const s = await session();
  mkdirSync(join(SORTIE, '..'), { recursive: true });
  mkdirSync(SORTIE_COMPO, { recursive: true });
  const fonds: Record<string, Meta> = {};
  let ok = 0, ko = 0, compos = 0;
  for (const [isin, id] of FONDS) {
    try {
      const { meta: m, compo } = await meta(isin, id, s);
      fonds[isin] = m;
      ok++;
      // Composition écrite seulement si exploitable : un échec conserve le fichier précédent.
      if (compo) {
        writeFileSync(join(SORTIE_COMPO, `${isin}.json`), JSON.stringify(compo, null, 1) + '\n');
        compos++;
      }
    } catch (e) {
      console.error(`Fiche indisponible pour ${isin} (${id}) :`, e);
      ko++;
    }
    // Pause entre requêtes : même précaution anti rate-limit que history-snapshot.ts.
    await new Promise((r) => setTimeout(r, 300));
  }
  if (ok === 0) { console.error('Aucune fiche récupérée — fichier laissé intact.'); process.exit(1); }
  writeFileSync(SORTIE, JSON.stringify({ genere: new Date().toISOString().slice(0, 10), fonds }, null, 1));
  console.log(`Fiches fonds générées : ${ok} OK, ${ko} en échec, ${compos} compositions écrites.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
