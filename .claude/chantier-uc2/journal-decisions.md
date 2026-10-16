# Journal des décisions — chantier « catalogue UC — octobre »

Numérotation unique et chronologique ; origine entre parenthèses (utilisateur / session).

- **D1** (utilisateur, 16/10/2026) — Les 10 fonds ajoutés sont éligibles à la mutuelle seulement : `mut:true, fin:false`.
- **D2** (session, 16/10/2026) — Retrait COMPLET des 4 fonds (sens littéral de « retire »), y compris FR001400U512 et LU1752460292, présents dans les deux contrats. Question posée sans réponse → A1 au journal d'attente.
- **D3** (session, 16/10/2026) — Ajouts en fin de catalogue, rangs 58 à 67, sans renumérotation des rangs existants. Mesure : aucun code ne lit `rang` (git grep), la liste UC est triée par défaut sur la performance depuis le 01/01 (`pages.js`, `{ cle: 'ytd', sens: -1 }`).
- **D4** (session, 16/10/2026) — `front/data/uc-actu.json` intact : les 3 événements des fonds retirés datent du 05/09, ne sont épinglés que 7 jours et sortent par le plafond de 100.
- **D5** (session, 16/10/2026) — Données générées produites en isolé (scratchpad) pour les seuls fonds concernés puis insérées ; les entrées des autres fonds restent identiques à la borne (méthode du commit Eurose 15c2bd1).
- **D6** (session, 16/10/2026) — Libellé gérant « Laz » pour Lazard (nouvelle société) ; libellés existants repris pour R·co, Mon, Carm, ODDO, Pct.
- **D7** (session, 16/10/2026) — c1 accepte un 2e argument (commit de fin de lot) et mesure alors ce commit : le périmètre d'un lot se mesure entre ses bornes, et l'exigence « 53 UC » ne vaut qu'à la fin du lot 1 (le lot 3 en ajoute 10). Exigence inchangée ; revalidé : c1 39a21e2 eb267dd = CONFORME, état de départ 39a21e2 = NON CONFORME. La non-régression des retraits sur l'état final est portée par c3.
- **D8** (utilisateur, 16/10/2026) — « lance tous les lots en même temps » : la règle « un lot à la fois » est levée pour la suite du chantier.
- **D9** (session, 16/10/2026) — Parallélisme borné par les dépendances : le lot 3 démarre sans attendre le lot 2 pour ce qui n'en dépend pas (identifiants déjà résolus → listes fonds-meta.ts / uc-history.ts / uc-managers.ts, génération isolée des données) ; les entrées UC_CATALOGUE et FLUX_UC_FONDS attendent le référentiel du lot 2 ; le lot 4 (aperçu) attend la fin du lot 3.
- **D10** (session, 16/10/2026) — Lazard Japanese Strategic Equity (IE000S1JLOI7) : SRI 5 retenu, d'après le KID anglais du 21/09/2026, plus récent que le seul DIC français (05/12/2025, 4/7). Le SRI est daté : la version la plus récente prime sur la langue.
- **D11** (session, 16/10/2026) — Catégories selon la règle du lot 2 : Moneta Long Short et Carmignac Long-Short European Equities (long/short) en « Mixte / Flexible » ; ODDO BHF US Equity Trend (au moins 70 % d'actions du S&P 500, jusqu'à 30 % d'obligations) en « Actions » ; R-co Valor Balanced en « Mixte / Flexible » ; Pictet ×3 et Lazard ×3 en « Actions ».
- **D12** (session, 16/10/2026) — Même correction que D7 pour c2 : l'unicité des `nom_flux` se mesure sur news.ts à la borne du lot 2 (eb267dd), et non sur l'arbre de travail, où le lot 3 a légitimement ajouté ces noms. Exigence inchangée. Bilan : c2 sans borne = 10 écarts « déjà pris » ; c2 eb267dd = voir ci-dessous.
