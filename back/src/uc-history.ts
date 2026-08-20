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
  { isin: 'FR0011253624', graphId: '0P00017T6E.F', xidRepli: '519283609' },
  { isin: 'LU1819480192', graphId: '0P0001DYQM.F', xidRepli: '118269986' },
  { isin: 'LU1244893696', graphId: '0P00016P7T.F', xidRepli: '436934526' },
  { isin: 'LU0280435388', graphId: '0P00008OBQ.F', xidRepli: '7034894' },
  { isin: 'LU0217139020', graphId: '0P000021C4.F', xidRepli: '55108085' },
  { isin: 'FR0010564229', graphId: '0P0000INCI.F', xidRepli: '535705860' },
  { isin: 'FR0000295230', graphId: '0P00000PM8.F', xidRepli: '28293710' },
  { isin: 'LU1261432659', graphId: '0P00016FY4.F', xidRepli: '535674156' },
  { isin: 'FR0013256930', graphId: '0P0001HI3U.F', xidRepli: '535630594' },
  { isin: 'FR0010489542', graphId: '0P0000JZWP.F', xidRepli: '29420762' },
  { isin: 'FR0013087152', graphId: '0P00019OMO.F', xidRepli: '116366721' },
  { isin: 'FR0010564336', graphId: '0P0000JLHZ.F', xidRepli: '535689289' },
  { isin: 'LU1694790202', graphId: '0P0001CH1A.F', xidRepli: '535718490' },
  { isin: 'FR0011461326', graphId: '0P0000ZL7Q.F', xidRepli: '535673498' },
  { isin: 'FR0013287315', graphId: '0P0001CB5C.F', xidRepli: '535659321' },
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
