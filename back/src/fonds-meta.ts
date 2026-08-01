// Génère front/data/fonds-meta.json : fiche signalétique des UC du catalogue — note Morningstar,
// note de risque Morningstar, société de gestion et performances CALENDAIRES officielles.
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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

// [ISIN (clé côté front), identifiant Morningstar servi par Yahoo (= graphId de UC_CATALOGUE)]
const FONDS: [string, string][] = [
  ['FR0011253624', '0P00017T6E.F'], ['LU1819480192', '0P0001DYQM.F'], ['LU1244893696', '0P00016P7T.F'],
  ['LU0280435388', '0P00008OBQ.F'], ['LU0217139020', '0P000021C4.F'], ['FR0010564229', '0P0000INCI.F'],
  ['FR0000295230', '0P00000PM8.F'], ['LU1261432659', '0P00016FY4.F'], ['FR0013256930', '0P0001HI3U.F'],
  ['FR0010489542', '0P0000JZWP.F'], ['FR0013087152', '0P00019OMO.F'], ['FR0010564336', '0P0000JLHZ.F'],
  ['LU1694790202', '0P0001CH1A.F'],
];

type Meta = {
  note: number | null;          // note Morningstar globale, 1 à 5 étoiles
  risque: number | null;        // note de risque Morningstar, 1 (faible) à 5 (élevé)
  societe: string | null;       // société de gestion telle que déclarée par le fonds
  annuels: Record<string, number>; // performances calendaires officielles, en %
};

const brut = (v: any) => (v && typeof v === 'object' && 'raw' in v ? v.raw : v);

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

async function meta(id: string, s: { cookie: string; crumb: string }): Promise<Meta> {
  const modules = 'defaultKeyStatistics,fundProfile,fundPerformance';
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
    note: brut(dks.morningStarOverallRating) ?? null,
    risque: brut(dks.morningStarRiskRating) ?? null,
    societe: res.fundProfile?.family || null,
    annuels,
  };
}

async function main() {
  const s = await session();
  const fonds: Record<string, Meta> = {};
  let ok = 0, ko = 0;
  for (const [isin, id] of FONDS) {
    try {
      fonds[isin] = await meta(id, s);
      ok++;
    } catch (e) {
      console.error(`Fiche indisponible pour ${isin} (${id}) :`, e);
      ko++;
    }
    // Pause entre requêtes : même précaution anti rate-limit que history-snapshot.ts.
    await new Promise((r) => setTimeout(r, 300));
  }
  if (ok === 0) { console.error('Aucune fiche récupérée — fichier laissé intact.'); process.exit(1); }
  mkdirSync(join(SORTIE, '..'), { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ genere: new Date().toISOString().slice(0, 10), fonds }, null, 1));
  console.log(`Fiches fonds générées : ${ok} OK, ${ko} en échec.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
