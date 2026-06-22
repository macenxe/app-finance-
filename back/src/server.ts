import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { ouvrirBase, listerProduits, enregistrerCours, lireCours, listerCours } from './db';
import { calculerIndicateurs } from './calc';
import { recupererIndices, recupererTaux, recupererCours, recupererTauxFRED, INDICES_DASHBOARD, TAUX_DASHBOARD, FRED_TAUX, TICKERS_PRODUITS } from './indices';
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
// US 10 ans via Yahoo Finance (^TNX) ; OAT + Bund via FRED (mensuel ECB).
app.get('/api/taux', async (c) => {
  const db = ouvrirBase();
  const fredKey = process.env.FRED_API_KEY ?? '';

  // Table de correspondance sousJacent → nom affichable
  const nomMap: Record<string, string> = {};
  TAUX_DASHBOARD.forEach((t) => { nomMap[t.ticker]    = t.nom; });
  FRED_TAUX.forEach((t)      => { nomMap[t.seriesId]  = t.nom; });

  const allIds = [...TAUX_DASHBOARD.map((t) => t.ticker), ...FRED_TAUX.map((t) => t.seriesId)];

  try {
    const [coursYahoo, coursFred] = await Promise.all([
      recupererTaux(),
      fredKey ? recupererTauxFRED(fredKey) : Promise.resolve([]),
    ]);
    const cours = [...coursYahoo, ...coursFred];
    for (const cr of cours) enregistrerCours(db, cr);
    return c.json(cours.map((cr) => ({ ...cr, nom: nomMap[cr.sousJacent] ?? cr.sousJacent })));
  } catch {
    const cached = listerCours(db).filter((cr) => allIds.includes(cr.sousJacent));
    return c.json(cached.map((cr) => ({ ...cr, nom: nomMap[cr.sousJacent] ?? cr.sousJacent })));
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
