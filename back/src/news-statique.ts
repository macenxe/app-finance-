// Génère le fond d'actualités statique front/data/news-fond.json (D30) : Google News
// renvoie 503 aux IP Cloudflare Workers, mais répond à GitHub Actions et aux postes
// locaux. Ce script exécute l'agrégation complète du miroir (news.ts) et publie le
// résultat ; le Worker le fusionne avec ses flux directs (ABC, BFM, BCE, Sénat).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recupererNews } from './news';

const CIBLE = join(__dirname, '../../front/data/news-fond.json');

async function main() {
  const news = await recupererNews();
  const total = Object.values(news).reduce((n, l) => n + l.length, 0);

  // Garde-fou : une agrégation quasi vide (Google bloquant aussi cette IP, panne réseau)
  // ne doit pas écraser un fond encore exploitable — échec visible plutôt que fichier vide.
  if (total < 5) {
    console.error(`Agrégation quasi vide (${total} items) : fond NON écrit.`);
    process.exit(1);
  }

  writeFileSync(CIBLE, JSON.stringify({ genere: new Date().toISOString(), ...news }, null, 1) + '\n');
  console.log(`Fond écrit : ${Object.entries(news).map(([k, l]) => `${k} ${l.length}`).join(', ')} (${total} items).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
