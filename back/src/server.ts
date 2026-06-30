import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { ouvrirBase, listerProduits, enregistrerCours, lireCours, listerCours, lireTauxManuel, sauvegarderTauxManuel } from './db';
import { calculerIndicateurs } from './calc';
import { recupererIndices, recupererTaux, recupererCours, recupererTauxFRED, INDICES_DASHBOARD, TAUX_DASHBOARD, FRED_TAUX, TICKERS_PRODUITS } from './indices';
import { recupererNewsGlobales, recupererNewsProduits } from './news';
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

    // Synchronise le taux CMS saisi manuellement dans la table cours
    // pour que calculerIndicateurs puisse l'utiliser via lireCours('CMS10').
    const cmsTaux = lireTauxManuel(db, 'CMS 10 ans');
    if (cmsTaux) {
      enregistrerCours(db, { sousJacent: 'CMS10', dernierCours: cmsTaux.valeur, heureCours: cmsTaux.date_maj });
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
// US 10 ans via Yahoo Finance (^TNX) ; OAT + Bund via FRED (mensuel ECB) ;
// CMS 10 ans (EUR IRS 10Y) via saisie manuelle (taux_manuels).
app.get('/api/taux', async (c) => {
  const db = ouvrirBase();
  const fredKey = process.env.FRED_API_KEY ?? '';

  const nomMap: Record<string, string> = {};
  TAUX_DASHBOARD.forEach((t) => { nomMap[t.ticker]   = t.nom; });
  FRED_TAUX.forEach((t)      => { nomMap[t.seriesId] = t.nom; });

  const allIds = [
    ...TAUX_DASHBOARD.map((t) => t.ticker),
    ...FRED_TAUX.map((t) => t.seriesId),
  ];

  type TauxItem = { nom: string; sousJacent: string; dernierCours: number; heureCours: string; variationPct?: number; manuel?: boolean; dateMaj?: string };

  const appendCms = (items: TauxItem[]) => {
    const cms = lireTauxManuel(db, 'CMS 10 ans');
    if (cms) {
      const d = new Date(cms.date_maj);
      items.push({
        nom: 'CMS 10 ans', sousJacent: 'CMS10',
        dernierCours: cms.valeur, heureCours: cms.date_maj,
        manuel: true,
        dateMaj: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      });
    }
    return items;
  };

  try {
    const [coursYahoo, coursFred] = await Promise.all([
      recupererTaux(),
      fredKey ? recupererTauxFRED(fredKey) : Promise.resolve([]),
    ]);
    const cours = [...coursYahoo, ...coursFred];
    for (const cr of cours) enregistrerCours(db, cr);
    const items: TauxItem[] = cours.map((cr) => ({ ...cr, nom: nomMap[cr.sousJacent] ?? cr.sousJacent }));
    return c.json(appendCms(items));
  } catch {
    const cached = listerCours(db).filter((cr) => allIds.includes(cr.sousJacent));
    const items: TauxItem[] = cached.map((cr) => ({ ...cr, nom: nomMap[cr.sousJacent] ?? cr.sousJacent }));
    return c.json(appendCms(items));
  } finally {
    db.close();
  }
});

// ── PUT /api/taux/cms ────────────────────────────────────────────────────────
// Enregistre le taux EUR IRS 10Y (CMS 10 ans) saisi manuellement.
app.put('/api/taux/cms', async (c) => {
  const body = await c.req.json<{ valeur: number }>();
  if (typeof body.valeur !== 'number' || body.valeur <= 0 || body.valeur > 20) {
    return c.json({ error: 'Valeur invalide (doit être entre 0 et 20)' }, 400);
  }
  const db = ouvrirBase();
  try {
    sauvegarderTauxManuel(db, 'CMS 10 ans', body.valeur);
    return c.json({ ok: true });
  } finally {
    db.close();
  }
});

// ── GET /api/news ────────────────────────────────────────────────────────────
// Renvoie les actualités économiques globales + par sous-jacent produit.
app.get('/api/news', async (c) => {
  const [globales, produits] = await Promise.allSettled([
    recupererNewsGlobales(3),
    recupererNewsProduits(3),
  ]);
  return c.json({
    globales: globales.status === 'fulfilled' ? globales.value : [],
    produits: produits.status === 'fulfilled' ? produits.value : [],
  });
});

// ── Démarrage ───────────────────────────────────────────────────────────────
const db = ouvrirBase();
seederBase(db);
db.close();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Back Conservateur — http://localhost:${PORT}`);
});
