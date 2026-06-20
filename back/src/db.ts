import Database from 'better-sqlite3';
import { NouveauProduit, ProduitStructure, CoursMarche } from './types';

// Ouvre (et crée si besoin) la base SQLite, puis garantit le schéma.
export function ouvrirBase(chemin = 'data.db'): Database.Database {
  const db = new Database(chemin);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

// Les noms de colonnes reprennent les champs TypeScript pour éviter toute conversion.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS produits (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nom          TEXT NOT NULL,
    sousJacent   TEXT NOT NULL,
    strike       REAL NOT NULL,
    barriere     REAL NOT NULL,
    typeBarriere TEXT NOT NULL,
    echeance     TEXT NOT NULL,
    coupon       REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cours (
    sousJacent   TEXT PRIMARY KEY,
    dernierCours REAL NOT NULL,
    heureCours   TEXT NOT NULL
  );
`;

// --- Produits structurés ---

export function ajouterProduit(db: Database.Database, p: NouveauProduit): number {
  const info = db
    .prepare(
      `INSERT INTO produits (nom, sousJacent, strike, barriere, typeBarriere, echeance, coupon)
       VALUES (@nom, @sousJacent, @strike, @barriere, @typeBarriere, @echeance, @coupon)`,
    )
    .run(p);
  return Number(info.lastInsertRowid);
}

export function listerProduits(db: Database.Database): ProduitStructure[] {
  return db.prepare('SELECT * FROM produits ORDER BY id').all() as ProduitStructure[];
}

// --- Cours de marché : un dernier cours par sous-jacent, écrasé à chaque rafraîchissement ---

export function enregistrerCours(db: Database.Database, c: CoursMarche): void {
  db.prepare(
    `INSERT INTO cours (sousJacent, dernierCours, heureCours)
     VALUES (@sousJacent, @dernierCours, @heureCours)
     ON CONFLICT(sousJacent) DO UPDATE SET
       dernierCours = excluded.dernierCours,
       heureCours   = excluded.heureCours`,
  ).run(c);
}

export function lireCours(db: Database.Database, sousJacent: string): CoursMarche | undefined {
  return db.prepare('SELECT * FROM cours WHERE sousJacent = ?').get(sousJacent) as
    | CoursMarche
    | undefined;
}
