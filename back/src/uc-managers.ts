// Génère front/data/uc-managers.json : fiche gérants/frais/note des 15 UC (snapshot Morningstar)
// et détecte les événements de vie des fonds par DIFF avec le fichier précédent — gérant
// (arrivée/départ/changement, y compris passage à zéro), frais courants, note et risque
// Morningstar, société de gestion, structure juridique. Les événements détectés sont apposés
// EN TÊTE de front/data/uc-actu.json (plafond 100).
//
// Source : API Morningstar « security_details » (viewId=snapshot), plus robuste pour un diff
// qu'un scraping HTML (D18 du chantier). Repli documenté mais non implémenté : tearsheet FT
// funds (classes managerinfo__name / managerinfo__date), mêmes données, 11/13 fonds convergents.
//
// GARDE-FOU : un échec de fetch sur un fonds n'est jamais un événement — ses données précédentes
// sont conservées telles quelles et rien n'est émis pour lui ce jour-là.
//
// MODE TEST : si UC_MANAGERS_SIMULE pointe vers un JSON au format uc-managers.json, ce fichier
// sert de snapshot frais à la place du fetch (diff et écriture inchangés) — c'est le mode utilisé
// par le contrôle du lot.
//
// Lancé par GitHub Actions (voir .github/workflows/cms-daily.yml) ; à exécuter depuis back/.
//
// ⚠️ La liste ci-dessous double UC_CATALOGUE (front/data.js) : à tenir synchronisée quand une UC
// entre ou sort du catalogue. Même contrainte que TICKERS dans history-snapshot.ts.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SORTIE_META = join(process.cwd(), '..', 'front', 'data', 'uc-managers.json');
const SORTIE_ACTU = join(process.cwd(), '..', 'front', 'data', 'uc-actu.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const PLAFOND_EVENEMENTS = 100;

// [ISIN, SecId Morningstar, nom court affiché dans les événements]
const FONDS: [string, string, string][] = [
  ['FR0011253624', '0P00017T6E', 'R-co Valor'],
  ['LU1819480192', '0P0001DYQM', 'Echiquier Artificial Intelligence'],
  ['LU1244893696', '0P00016P7T', 'EdR Big Data'],
  ['LU0280435388', '0P00008OBQ', 'Pictet Clean Energy Transition'],
  ['LU0217139020', '0P000021C4', 'Pictet Premium Brands'],
  ['FR0010564229', '0P0000INCI', 'Conservateur Actions Monde'],
  ['FR0000295230', '0P00000PM8', 'Comgest Renaissance Europe'],
  ['LU1261432659', '0P00016FY4', 'Fidelity World'],
  ['FR0013256930', '0P0001HI3U', 'Conservateur Actions Flexibles'],
  ['FR0010489542', '0P0000JZWP', 'Conservateur Diversifié Réactif'],
  ['FR0013087152', '0P00019OMO', 'Conservateur Rendement Flexible'],
  ['FR0010564336', '0P0000JLHZ', 'Conservateur Diversifié'],
  ['LU1694790202', '0P0001CH1A', 'DNCA Flex Inflation'],
  ['FR0011461326', '0P0000ZL7Q', 'Conservateur Obligations Court Terme'],
  ['FR0013287315', '0P0001CB5C', 'Palatine Monétaire Court Terme'],
];

type Gerant = { nom: string; depuis: string };
type Meta = {
  gerants: Gerant[];
  fraisCourants: number | null;   // en %
  societe: string | null;
  structure: string | null;       // ex. SICAV, FCP
  note: number | null;            // note Morningstar, 1 à 5 étoiles (période 3 ans — M36)
  risque: number | null;          // note de risque Morningstar, 1 à 5 (période 3 ans — M36)
};
type FichierManagers = { genere: string; fonds: Record<string, Meta> };

type TypeEvenement = 'gerant' | 'frais' | 'note' | 'risque' | 'societe' | 'structure';
type Evenement = { date: string; isin: string; fonds: string; type: TypeEvenement; titre: string; detail: string };
type FichierActu = { evenements: Evenement[] };

function chargerJSON<T>(chemin: string): T | null {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchMeta(secId: string): Promise<Meta> {
  const url = `https://lt.morningstar.com/api/rest.svc/t92wz0sj7c/security_details/${secId}`
    + `?viewId=snapshot&idtype=Morningstar&responseViewFormat=json`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json())?.[0];
  if (!d) throw new Error('réponse vide');

  const gerants: Gerant[] = (d.ManagerList || [])
    .slice()
    .sort((a: any, b: any) => (a.DisplayPreference ?? 99) - (b.DisplayPreference ?? 99))
    .map((m: any) => ({
      nom: `${m.GivenName ?? ''} ${m.FamilyName ?? ''}`.trim(),
      depuis: (m.StartDate || '').slice(0, 10),
    }));

  // Note et risque : période « M36 » (3 ans), toujours présente sur les 13 fonds testés au lot 1 ;
  // les périodes plus longues (M60/M120/M255) ne sont pas garanties selon l'ancienneté du fonds.
  const m36 = (d.RiskAndRating || []).find((x: any) => x.TimePeriod === 'M36') ?? (d.RiskAndRating || [])[0];
  const frais = d.OngoingCharge != null ? parseFloat(d.OngoingCharge) : NaN;

  return {
    gerants,
    fraisCourants: Number.isFinite(frais) ? frais : null,
    societe: d.ProviderCompany?.Name || null,
    structure: d.LegalStructure || null,
    note: m36?.RatingValue ?? null,
    risque: m36?.RiskRatingValue ?? null,
  };
}

const fmtGerant = (g: Gerant) => `${g.nom} (depuis ${g.depuis})`;
const fmtPct = (v: number | null) => (v === null ? 'non communiqués' : `${v} %`);
const fmtNote = (v: number | null) => (v === null ? 'non notée' : `${v}/5`);

// Compare le snapshot précédent et le frais d'un fonds, retourne les événements détectés.
// N'est appelé que si `avant` existe (fonds déjà connu) et `apres` vient d'un fetch réussi.
function diffFonds(isin: string, nomCourt: string, avant: Meta, apres: Meta, date: string): Evenement[] {
  const evs: Evenement[] = [];
  const emettre = (type: TypeEvenement, titre: string, detail: string) =>
    evs.push({ date, isin, fonds: nomCourt, type, titre, detail });

  // Gérants : diff sur le SET de noms uniquement — un changement de date seule ne déclenche rien.
  const nomsAvant = avant.gerants.map((g) => g.nom).sort();
  const nomsApres = apres.gerants.map((g) => g.nom).sort();
  if (JSON.stringify(nomsAvant) !== JSON.stringify(nomsApres)) {
    const listeAvant = avant.gerants.map(fmtGerant).join(', ') || 'aucun';
    const listeApres = apres.gerants.map(fmtGerant).join(', ') || 'aucun';
    if (apres.gerants.length === 0) {
      emettre('gerant', `Plus de gérant déclaré sur ${nomCourt}`, `Gérants avant : ${listeAvant}.`);
    } else if (avant.gerants.length === 0) {
      emettre('gerant', `Gérant déclaré sur ${nomCourt} : ${apres.gerants.map((g) => g.nom).join(', ')}`,
        `Gérants après : ${listeApres}.`);
    } else {
      emettre('gerant',
        `Changement de gérant sur ${nomCourt} : ${avant.gerants.map((g) => g.nom).join(', ')} → ${apres.gerants.map((g) => g.nom).join(', ')}`,
        `Gérants avant : ${listeAvant} — après : ${listeApres}.`);
    }
  }

  if (avant.fraisCourants !== apres.fraisCourants) {
    emettre('frais', `Frais courants modifiés sur ${nomCourt} : ${fmtPct(avant.fraisCourants)} → ${fmtPct(apres.fraisCourants)}`,
      `Frais courants passés de ${fmtPct(avant.fraisCourants)} à ${fmtPct(apres.fraisCourants)}.`);
  }
  if (avant.note !== apres.note) {
    emettre('note', `Note Morningstar modifiée sur ${nomCourt} : ${fmtNote(avant.note)} → ${fmtNote(apres.note)}`,
      `Note Morningstar (3 ans) passée de ${fmtNote(avant.note)} à ${fmtNote(apres.note)}.`);
  }
  if (avant.risque !== apres.risque) {
    emettre('risque', `Risque Morningstar modifié sur ${nomCourt} : ${fmtNote(avant.risque)} → ${fmtNote(apres.risque)}`,
      `Note de risque Morningstar (3 ans) passée de ${fmtNote(avant.risque)} à ${fmtNote(apres.risque)}.`);
  }
  if (avant.societe !== apres.societe) {
    emettre('societe', `Changement de société de gestion sur ${nomCourt} : ${avant.societe ?? 'inconnue'} → ${apres.societe ?? 'inconnue'}`,
      `Société de gestion passée de ${avant.societe ?? 'inconnue'} à ${apres.societe ?? 'inconnue'}.`);
  }
  if (avant.structure !== apres.structure) {
    emettre('structure', `Changement de structure juridique sur ${nomCourt} : ${avant.structure ?? 'inconnue'} → ${apres.structure ?? 'inconnue'}`,
      `Structure juridique passée de ${avant.structure ?? 'inconnue'} à ${apres.structure ?? 'inconnue'}.`);
  }
  return evs;
}

async function main() {
  const precedent = chargerJSON<FichierManagers>(SORTIE_META);
  const actuPrecedente = chargerJSON<FichierActu>(SORTIE_ACTU) ?? { evenements: [] };
  const cheminSimule = process.env.UC_MANAGERS_SIMULE;
  const snapshotSimule = cheminSimule ? chargerJSON<FichierManagers>(cheminSimule)?.fonds ?? {} : null;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const fonds: Record<string, Meta> = {};
  const nouveaux: Evenement[] = [];
  let ok = 0, ko = 0;

  for (const [isin, secId, nomCourt] of FONDS) {
    const avant = precedent?.fonds[isin];
    try {
      const meta = snapshotSimule
        ? (snapshotSimule[isin] ?? (() => { throw new Error('absent du snapshot simulé'); })())
        : await fetchMeta(secId);
      fonds[isin] = meta;
      ok++;
      if (avant) nouveaux.push(...diffFonds(isin, nomCourt, avant, meta, aujourdhui));
    } catch (e) {
      console.error(`Snapshot indisponible pour ${isin} (${secId}) :`, e);
      ko++;
      // Garde-fou : échec de fetch ≠ événement — on garde les données précédentes telles quelles.
      fonds[isin] = avant ?? { gerants: [], fraisCourants: null, societe: null, structure: null, note: null, risque: null };
    }
    if (!snapshotSimule) await new Promise((r) => setTimeout(r, 250));
  }

  mkdirSync(join(SORTIE_META, '..'), { recursive: true });
  writeFileSync(SORTIE_META, JSON.stringify({ genere: aujourdhui, fonds }, null, 1));

  const evenements = [...nouveaux, ...actuPrecedente.evenements].slice(0, PLAFOND_EVENEMENTS);
  writeFileSync(SORTIE_ACTU, JSON.stringify({ evenements }, null, 1));

  const avecGerant = Object.values(fonds).filter((f) => f.gerants.length > 0).length;
  console.log(`Snapshot gérants : ${ok} OK, ${ko} en échec. ${avecGerant}/${FONDS.length} fonds avec gérant déclaré. `
    + `${nouveaux.length} événement(s) émis.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
