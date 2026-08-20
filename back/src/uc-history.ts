// Génère front/data/history/uc/<graphId>.json : historique complet (VL quotidienne, depuis
// l'inception) des UC du catalogue, au format {ticker, points:[{t,c}]} — même forme que les
// eq/*.json. Source : FT Markets (chartapi), qui couvre l'historique long sans le trou d'inception
// que Yahoo affiche sur certains fonds (voir MEMORY : autocall-modele-donnees).
// Lancé par GitHub Actions (voir .github/workflows/snapshot.yml) ; à exécuter depuis back/.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SORTIE_DIR = join(process.cwd(), '..', 'front', 'data', 'history', 'uc');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

// [ISIN, graphId (= identifiant Yahoo servi côté front, clé du fichier de sortie), XID FT de
// repli si la tearsheet ne répond pas]. Double UC_CATALOGUE (front/data.js) et FONDS
// (fonds-meta.ts) : à tenir synchronisée quand une UC entre ou sort du catalogue.
const FONDS: { isin: string; graphId: string; xidRepli: string }[] = [
  { isin: "LU1120766388", graphId: "0P00016ALF.F", xidRepli: "89433279" },
  { isin: "FR0007076930", graphId: "0P00000NME.F", xidRepli: "129283105" },
  { isin: "FR0000295230", graphId: "0P00000PM8.F", xidRepli: "28293710" },
  { isin: "FR0014008EI2", graphId: "0P0001P8TA.F", xidRepli: "736104161" },
  { isin: "FR0013256930", graphId: "0P0001HI3U.F", xidRepli: "535630594" },
  { isin: "FR0010564229", graphId: "0P0000INCI.F", xidRepli: "535705860" },
  { isin: "FR0010038257", graphId: "0P00001NMQ.F", xidRepli: "29243392" },
  { isin: "FR001400U512", graphId: "0P0001UVBG.F", xidRepli: "971918157" },
  { isin: "FR0012844140", graphId: "0P00016HZ8.F", xidRepli: "121433264" },
  { isin: "LU1653748860", graphId: "0P0001BOX5.F", xidRepli: "535659169" },
  { isin: "LU1902443420", graphId: "0P0001FLNU.F", xidRepli: "124339677" },
  { isin: "LU0870553020", graphId: "0P0000XTFD.F", xidRepli: "577573691" },
  { isin: "LU1490785091", graphId: "0P000195NQ.F", xidRepli: "535660703" },
  { isin: "LU1819480192", graphId: "0P0001DYQM.F", xidRepli: "118269986" },
  { isin: "FR0010863688", graphId: "0P0000O4H2.F", xidRepli: "725351543" },
  { isin: "LU1244893696", graphId: "0P00016P7T.F", xidRepli: "436934526" },
  { isin: "LU1160365091", graphId: "0P00016716.F", xidRepli: "535682298" },
  { isin: "LU1103305709", graphId: "0P000172SH.F", xidRepli: "535640226" },
  { isin: "FR0010479931", graphId: "0P000018ZI.F", xidRepli: "129515405" },
  { isin: "LU0528228074", graphId: "0P0000VTJH.F", xidRepli: "535676989" },
  { isin: "LU1892829828", graphId: "0P0001EVSZ.F", xidRepli: "632611556" },
  { isin: "LU1261432659", graphId: "0P00016FY4.F", xidRepli: "535674156" },
  { isin: "LU1744646933", graphId: "0P0001DK5M.F", xidRepli: "121434284" },
  { isin: "FR0000292278", graphId: "0P00000PM7.F", xidRepli: "28293700" },
  { isin: "FR0010298596", graphId: "0P00005ZUG.F", xidRepli: "28304590" },
  { isin: "FR0000989899", graphId: "0P00000QLE.F", xidRepli: "535673245" },
  { isin: "FR0000974149", graphId: "0P00000QLM.F", xidRepli: "31877975" },
  { isin: "FR0000989915", graphId: "0P00000QLD.F", xidRepli: "535667228" },
  { isin: "FR0000983819", graphId: "0P00000HN7.F", xidRepli: "29231066" },
  { isin: "FR0000978439", graphId: "0P00000QN4.F", xidRepli: "535703298" },
  { isin: "FR0010649079", graphId: "0P0000KM3B.F", xidRepli: "29427001" },
  { isin: "LU0280435388", graphId: "0P00008OBQ.F", xidRepli: "7034894" },
  { isin: "LU0366534344", graphId: "0P0000K8E5.F", xidRepli: "67838099" },
  { isin: "LU0217139020", graphId: "0P000021C4.F", xidRepli: "55108085" },
  { isin: "FR001400PL02", graphId: "0P0001UGT3.F", xidRepli: "946894421" },
  { isin: "FR0010564328", graphId: "0P0000INO5.F", xidRepli: "535682367" },
  { isin: "LU1694790202", graphId: "0P0001CH1A.F", xidRepli: "535718490" },
  { isin: "FR0010915314", graphId: "0P0000236X.F", xidRepli: "126470672" },
  { isin: "LU1752460292", graphId: "0P0001EITS.F", xidRepli: "120854472" },
  { isin: "FR0010135103", graphId: "0P00000FB4.F", xidRepli: "" },
  { isin: "FR0007439666", graphId: "0P00005VUH.F", xidRepli: "112049394" },
  { isin: "FR001400UAZ4", graphId: "0P0001XK54.F", xidRepli: "1065471905" },
  { isin: "FR0010564336", graphId: "0P0000JLHZ.F", xidRepli: "535689289" },
  { isin: "FR0010489542", graphId: "0P0000JZWP.F", xidRepli: "29420762" },
  { isin: "FR0011199314", graphId: "0P0000VYE0.F", xidRepli: "" },
  { isin: "FR0013087152", graphId: "0P00019OMO.F", xidRepli: "116366721" },
  { isin: "FR0011175652", graphId: "0P00015XU2.F", xidRepli: "" },
  { isin: "FR0010097683", graphId: "0P00000CGO.F", xidRepli: "535672644" },
  { isin: "LU0512124107", graphId: "0P0000P3DN.F", xidRepli: "535690001" },
  { isin: "FR0011253624", graphId: "0P00017T6E.F", xidRepli: "519283609" },
  { isin: "FR0010286013", graphId: "0P00000EUQ.F", xidRepli: "535679011" },
  { isin: "LU2147879543", graphId: "0P0001L9PD.F", xidRepli: "637716559" },
  { isin: "FR0011461326", graphId: "0P0000ZL7Q.F", xidRepli: "535673498" },
  { isin: "FR0013287315", graphId: "0P0001CB5C.F", xidRepli: "535659321" },
  { isin: "LU1585265066", graphId: "0P0001KJDD.F", xidRepli: "617134022" },
];

// Résout le XID FT depuis la tearsheet (champ xid du data-mod-config, servi en HTML échappé).
async function resoudreXid(isin: string): Promise<string> {
  const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${encodeURIComponent(isin)}:EUR`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/&quot;xid&quot;:&quot;(\d+)&quot;/);
  if (!m) throw new Error('xid introuvable dans la tearsheet');
  return m[1];
}

// Historique complet (série Close) via le chartapi FT, pour un XID donné.
async function historique(xid: string): Promise<{ t: number; c: number }[]> {
  const body = JSON.stringify({
    days: 20000, dataNormalized: false, dataPeriod: 'Day', dataInterval: 1, realtime: false,
    yFormat: '0.###', timeServiceFormat: 'JSON', returnDateType: 'ISO8601',
    elements: [{ Type: 'price', Symbol: xid, OverlayIndicators: [], Params: {} }],
  });
  const r = await fetch('https://markets.ft.com/data/chartapi/series', {
    method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }, body,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const dates: string[] = d.Dates || [];
  const cs = d.Elements?.[0]?.ComponentSeries || [];
  const vals: (number | null)[] = (cs.find((s: any) => s.Type === 'Close') || cs[0])?.Values || [];
  const points: { t: number; c: number }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const c = vals[i];
    // Dates FT sans offset ('YYYY-MM-DDTHH:mm:ss') : on force l'UTC.
    if (c != null) points.push({ t: Math.floor(Date.parse(dates[i] + 'Z') / 1000), c });
  }
  if (points.length < 2) throw new Error('pas assez de points');
  return points;
}

async function main() {
  mkdirSync(SORTIE_DIR, { recursive: true });
  let ok = 0, ko = 0;
  for (const fonds of FONDS) {
    try {
      let xid: string;
      try {
        xid = await resoudreXid(fonds.isin);
      } catch (e) {
        console.error(`Tearsheet indisponible pour ${fonds.isin}, repli sur XID connu :`, e);
        xid = fonds.xidRepli;
      }
      const points = await historique(xid);
      writeFileSync(join(SORTIE_DIR, `${fonds.graphId}.json`), JSON.stringify({ ticker: fonds.graphId, points }));
      ok++;
    } catch (e) {
      console.error(`Historique indisponible pour ${fonds.isin} :`, e);
      ko++;
    }
    // Pause entre fonds pour rester raisonnable côté FT (deux requêtes par fonds).
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`Historique UC généré : ${ok} fonds OK, ${ko} en échec.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
