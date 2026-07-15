import Database from 'better-sqlite3';
import { NouveauProduit, ProduitStructure, CoursMarche } from './types';

export function ouvrirBase(chemin = 'data.db'): Database.Database {
  const db = new Database(chemin);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  // Migration légère : ajoute la colonne emission si la base est antérieure (ignoré si présente).
  try { db.exec(`ALTER TABLE produits ADD COLUMN emission TEXT NOT NULL DEFAULT ''`); } catch {}
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
    emission         TEXT NOT NULL DEFAULT '',
    echeance         TEXT NOT NULL,
    constat          TEXT NOT NULL DEFAULT '',
    coupon           REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cours (
    sousJacent   TEXT PRIMARY KEY,
    dernierCours REAL NOT NULL,
    heureCours   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS taux_manuels (
    nom      TEXT PRIMARY KEY,
    valeur   REAL NOT NULL,
    date_maj TEXT NOT NULL
  );
`;

// --- Produits ---

export function ajouterProduit(db: Database.Database, p: NouveauProduit): number {
  const info = db.prepare(`
    INSERT OR IGNORE INTO produits
      (isin, nom, sousJacent, sousJacentLabel, typeProduit, strike, barriereCoupon, barriereAutocall, emission, echeance, constat, coupon)
    VALUES
      (@isin, @nom, @sousJacent, @sousJacentLabel, @typeProduit, @strike, @barriereCoupon, @barriereAutocall, @emission, @echeance, @constat, @coupon)
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

// --- Taux manuels ---

export function lireTauxManuel(db: Database.Database, nom: string): { valeur: number; date_maj: string } | undefined {
  return db.prepare('SELECT valeur, date_maj FROM taux_manuels WHERE nom = ?').get(nom) as { valeur: number; date_maj: string } | undefined;
}

export function sauvegarderTauxManuel(db: Database.Database, nom: string, valeur: number): void {
  db.prepare(`
    INSERT INTO taux_manuels (nom, valeur, date_maj) VALUES (?, ?, ?)
    ON CONFLICT(nom) DO UPDATE SET valeur = excluded.valeur, date_maj = excluded.date_maj
  `).run(nom, valeur, new Date().toISOString());
}
