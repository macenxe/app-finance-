import Database from 'better-sqlite3';
import { NouveauProduit, ProduitStructure, CoursMarche } from './types';

export function ouvrirBase(chemin = 'data.db'): Database.Database {
  const db = new Database(chemin);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS produits (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    isin             TEXT NOT NULL UNIQUE,
    nom              TEXT NOT NULL,
    sousJacent       TEXT NOT NULL,
    sousJacentLabel  TEXT NOT NULL,
    typeProduit      TEXT NOT NULL DEFAULT 'equity',
    strike           REAL,
    barriereCoupon   REAL,
    barriereAutocall REAL,
    echeance         TEXT NOT NULL,
    constat          TEXT NOT NULL DEFAULT '',
    coupon           REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cours (
    sousJacent   TEXT PRIMARY KEY,
    dernierCours REAL NOT NULL,
    heureCours   TEXT NOT NULL
  );
`;

// --- Produits ---

export function ajouterProduit(db: Database.Database, p: NouveauProduit): number {
  const info = db.prepare(`
    INSERT OR IGNORE INTO produits
      (isin, nom, sousJacent, sousJacentLabel, typeProduit, strike, barriereCoupon, barriereAutocall, echeance, constat, coupon)
    VALUES
      (@isin, @nom, @sousJacent, @sousJacentLabel, @typeProduit, @strike, @barriereCoupon, @barriereAutocall, @echeance, @constat, @coupon)
  `).run(p);
  return Number(info.lastInsertRowid);
}

export function listerProduits(db: Database.Database): ProduitStructure[] {
  return db.prepare('SELECT * FROM produits ORDER BY id').all() as ProduitStructure[];
}

export function supprimerProduit(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM produits WHERE id = ?').run(id);
}

// --- Cours ---

export function enregistrerCours(db: Database.Database, c: CoursMarche): void {
  db.prepare(`
    INSERT INTO cours (sousJacent, dernierCours, heureCours)
    VALUES (@sousJacent, @dernierCours, @heureCours)
    ON CONFLICT(sousJacent) DO UPDATE SET
      dernierCours = excluded.dernierCours,
      heureCours   = excluded.heureCours
  `).run(c);
}

export function lireCours(db: Database.Database, sousJacent: string): CoursMarche | undefined {
  return db.prepare('SELECT * FROM cours WHERE sousJacent = ?').get(sousJacent) as CoursMarche | undefined;
}

export function listerCours(db: Database.Database): CoursMarche[] {
  return db.prepare('SELECT * FROM cours').all() as CoursMarche[];
}
