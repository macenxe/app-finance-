// Génère front/data/uc-vl-hebdo.json : VL hebdomadaire des UC sur un peu plus de 5 ans, dérivée
// des historiques complets déjà publiés (front/data/history/uc/<graphId>.json). Aucun accès
// réseau : ce script ne fait que résumer des fichiers du dépôt, il peut donc être rejoué hors
// ligne et tourne en quelques millisecondes.
//
// À quoi ça sert : le TABLEAU des fonds (colonnes 1 an / 3 ans / 5 ans) ne peut pas charger les
// historiques complets — 5,5 Mo pour 56 fonds — et le Worker (Yahoo) ne remonte pas assez loin
// pour une bonne moitié d'entre eux (trou d'inception : rien avant mars 2022 sur Candriam
// Biotech, par exemple). Il affichait donc « 5 ans » sur 4,4 ans, sans le dire, et sortait un
// chiffre écarté de 17 à 80 points de celui du graphique, qui dispose de la profondeur.
// Ce résumé (~60 Ko gzip, une requête) donne au tableau la même profondeur, au grain de la
// semaine : le front y prend la VL de référence de la période et la recale sur la dernière VL
// live du Worker, ce qui préserve la fraîcheur quotidienne du dernier point.
//
// Lancé par GitHub Actions juste après `npm run uc` (voir .github/workflows/snapshot.yml) ;
// à exécuter depuis back/.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(process.cwd(), '..', 'front', 'data', 'history', 'uc');
const SORTIE = join(process.cwd(), '..', 'front', 'data', 'uc-vl-hebdo.json');

// Profondeur retenue : 5 ans (la plus longue colonne du tableau) + 90 jours de marge. La marge
// couvre deux besoins : que l'ancre « il y a 5 ans pile » ait toujours un point AVANT elle, et
// que le fichier reste juste jusqu'au prochain passage de la CI (hebdomadaire) alors que
// l'ancre, elle, avance chaque jour.
const JOURS_COUVERTS = 5 * 365 + 90;

// Autour des dates d'ancrage des colonnes du tableau (il y a 1 an, 3 ans, 5 ans, et le 31
// décembre pour l'année en cours), on garde la VL de CHAQUE JOUR et non celle de la semaine :
// c'est ce point-là qui sert de base au calcul, et une base décalée de quelques jours suffit à
// écarter le tableau du graphique de 2 à 3 points sur un fonds volatil.
// ±21 jours : l'ancre avance d'un jour par jour alors que ce fichier n'est régénéré que le
// lundi — la marge couvre trois semaines sans passage de la CI. Au-delà, le calcul retombe
// proprement sur la grille hebdomadaire (à 7 jours près) plutôt que de ne rien trouver.
const ANCRES_ANS = [1, 3, 5];
const MARGE_ANCRE_J = 21;

// Dates d'ancrage du jour, en secondes epoch.
function ancres(): number[] {
  const out: number[] = [];
  for (const ans of ANCRES_ANS) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - ans);
    out.push(Math.floor(d.getTime() / 1000));
  }
  out.push(Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000));
  return out;
}

type Point = { t: number; c: number };

// Un point par semaine : le DERNIER de chaque semaine ISO (en pratique le vendredi, ou le
// dernier jour ouvré valorisé). Prendre le dernier plutôt que le premier fait tomber la série
// sur des clôtures de semaine complètes, et garantit que le dernier point du fichier est bien
// la VL la plus récente connue.
function hebdomadaire(points: Point[]): Point[] {
  const parSemaine = new Map<number, Point>();
  for (const p of points) {
    // Numéro de semaine continu depuis l'epoch (1970-01-01 était un jeudi : +4 aligne les
    // semaines sur le lundi, ce qui n'a d'importance que pour la stabilité du découpage).
    const semaine = Math.floor((Math.floor(p.t / 86400) + 4) / 7);
    parSemaine.set(semaine, p); // les points sont triés : le dernier écrit gagne
  }
  return [...parSemaine.values()].sort((a, b) => a.t - b.t);
}

function main() {
  let fichiers: string[];
  try {
    fichiers = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json'));
  } catch (e) {
    console.error(`Historiques UC introuvables dans ${SRC_DIR} :`, e);
    process.exit(1);
  }

  const limite = Math.floor(Date.now() / 1000) - JOURS_COUVERTS * 86400;
  const fonds: Record<string, { j: number[]; c: number[] }> = {};
  let vides = 0;

  for (const f of fichiers) {
    const graphId = f.replace(/\.json$/, '');
    try {
      const d = JSON.parse(readFileSync(join(SRC_DIR, f), 'utf8'));
      const points: Point[] = (d.points || []).filter((p: Point) => p && isFinite(p.c) && p.c > 0);
      if (points.length < 2) { vides++; continue; }
      // Un point AVANT la limite est conservé s'il existe : sans lui, un fonds dont la série
      // commence pile sur la limite n'aurait aucune base pour « 5 ans ».
      const dansFenetre = points.filter((p) => p.t >= limite);
      const avant = points.filter((p) => p.t < limite).slice(-1);
      // Grille hebdomadaire pour la profondeur + tous les jours autour des ancres, fusionnés
      // et dédoublonnés (un point peut appartenir aux deux).
      const marge = MARGE_ANCRE_J * 86400;
      const bornes = ancres();
      const parT = new Map<number, Point>();
      for (const p of hebdomadaire(avant.concat(dansFenetre))) parT.set(p.t, p);
      for (const p of dansFenetre) {
        if (bornes.some((a) => Math.abs(p.t - a) <= marge)) parT.set(p.t, p);
      }
      const retenus = [...parT.values()].sort((a, b) => a.t - b.t);
      // Dernier point de la série complète : c'est la VL la plus récente, elle doit figurer même
      // si sa semaine est encore en cours.
      const dernier = points[points.length - 1];
      if (retenus.length && retenus[retenus.length - 1].t !== dernier.t) retenus.push(dernier);
      if (retenus.length < 2) { vides++; continue; }
      fonds[graphId] = {
        // Jours depuis l'epoch plutôt que secondes : 5 chiffres au lieu de 10, pour un fichier
        // deux fois plus léger sans rien perdre (une VL est datée du jour, jamais de l'heure).
        j: retenus.map((p) => Math.floor(p.t / 86400)),
        c: retenus.map((p) => +p.c.toFixed(4)),
      };
    } catch (e) {
      console.error(`Résumé impossible pour ${graphId} :`, e);
      vides++;
    }
  }

  const nb = Object.keys(fonds).length;
  if (!nb) {
    console.error('Aucun fonds résumé : fichier non écrit.');
    process.exit(1);
  }
  mkdirSync(join(process.cwd(), '..', 'front', 'data'), { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ genere: new Date().toISOString(), fonds }));
  const points = Object.values(fonds).reduce((n, s) => n + s.j.length, 0);
  console.log(`VL hebdomadaires générées : ${nb} fonds, ${points} points${vides ? `, ${vides} ignoré(s)` : ''}.`);
}

main();
