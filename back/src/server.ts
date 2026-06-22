import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { ouvrirBase, listerProduits, enregistrerCours, lireCours, listerCours } from './db';
import { calculerIndicateurs } from './calc';
import { recupererIndices, recupererTaux, recupererCours, INDICES_DASHBOARD, TAUX_DASHBOARD, TICKERS_PRODUITS } from './indices';
import { seederBase } from './seed';
import { ProduitEnrichi } from './types';

const PORT = 3001;
const app = new Hono();

app.use('*', cors({ origin: '*' }));

// ── GET /api/indices ────────────────────────────────────────────────────────
// Renvoie les cours des indices du dashboard (avec refresh Yahoo Finance).
app.get('/api/indices', async (c) => {
  const db = ouvrirBase();
  try {
    const cours = await recupererIndices();
    for (const cr of cours) enregistrerCours(db, cr);
    const enrichis = cours.map((cr) => ({
      ...cr,
      nom: INDICES_DASHBOARD.find((i) => i.ticker === cr.sousJacent)?.nom ?? cr.sousJacent,
    }));
    return c.json(enrichis);
  } catch (err) {
    // En cas d'échec réseau, renvoie les derniers cours en DB
    const cached = listerCours(db).filter((cr) =>
      INDICES_DASHBOARD.some((i) => i.ticker === cr.sousJacent)
    );
    return c.json(cached.map((cr) => ({
      ...cr,
      nom: INDICES_DASHBOARD.find((i) => i.ticker === cr.sousJacent)?.nom ?? cr.sousJacent,
    })));
  } finally {
    db.close();
  }
});

// ── GET /api/produits ───────────────────────────────────────────────────────
// Renvoie tous les produits enrichis (cours + indicateurs calculés).
app.get('/api/produits', async (c) => {
  const db = ouvrirBase();
  try {
    const produits = listerProduits(db);

    // Rafraîchit les cours des sous-jacents actions
    const tickersEquity = [...new Set(
      produits.filter(p => p.typeProduit === 'equity').map(p => p.sousJacent)
    )];
    try {
      const coursFrais = await recupererCours(tickersEquity);
      for (const cr of coursFrais) enregistrerCours(db, cr);
    } catch {
      // on continue avec les cours en cache
    }

    const enrichis: ProduitEnrichi[] = produits.map((p) => {
      const cours = lireCours(db, p.sousJacent) ?? null;
      const indicateurs = cours ? calculerIndicateurs(p, cours) : null;
      return { ...p, cours, indicateurs };
    });

    return c.json(enrichis);
  } finally {
    db.close();
  }
});

// ── GET /api/taux ────────────────────────────────────────────────────────────
// Renvoie les taux obligataires 10 ans (OAT, Bund, US) via Yahoo Finance.
app.get('/api/taux', async (c) => {
  const db = ouvrirBase();
  try {
    const cours = await recupererTaux();
    for (const cr of cours) enregistrerCours(db, cr);
    const enrichis = cours.map((cr) => ({
      ...cr,
      nom: TAUX_DASHBOARD.find((t) => t.ticker === cr.sousJacent)?.nom ?? cr.sousJacent,
    }));
    return c.json(enrichis);
  } catch {
    const cached = listerCours(db).filter((cr) =>
      TAUX_DASHBOARD.some((t) => t.ticker === cr.sousJacent)
    );
    return c.json(cached.map((cr) => ({
      ...cr,
      nom: TAUX_DASHBOARD.find((t) => t.ticker === cr.sousJacent)?.nom ?? cr.sousJacent,
    })));
  } finally {
    db.close();
  }
});

// ── Démarrage ───────────────────────────────────────────────────────────────
const db = ouvrirBase();
seederBase(db);
db.close();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Back Conservateur — http://localhost:${PORT}`);
});
