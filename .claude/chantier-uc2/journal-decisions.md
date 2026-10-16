# Journal des décisions — chantier « catalogue UC — octobre »

Numérotation unique et chronologique ; origine entre parenthèses (utilisateur / session).

- **D1** (utilisateur, 16/10/2026) — Les 10 fonds ajoutés sont éligibles à la mutuelle seulement : `mut:true, fin:false`.
- **D2** (session, 16/10/2026) — Retrait COMPLET des 4 fonds (sens littéral de « retire »), y compris FR001400U512 et LU1752460292, présents dans les deux contrats. Question posée sans réponse → A1 au journal d'attente.
- **D3** (session, 16/10/2026) — Ajouts en fin de catalogue, rangs 58 à 67, sans renumérotation des rangs existants. Mesure : aucun code ne lit `rang` (git grep), la liste UC est triée par défaut sur la performance depuis le 01/01 (`pages.js`, `{ cle: 'ytd', sens: -1 }`).
- **D4** (session, 16/10/2026) — `front/data/uc-actu.json` intact : les 3 événements des fonds retirés datent du 05/09, ne sont épinglés que 7 jours et sortent par le plafond de 100.
- **D5** (session, 16/10/2026) — Données générées produites en isolé (scratchpad) pour les seuls fonds concernés puis insérées ; les entrées des autres fonds restent identiques à la borne (méthode du commit Eurose 15c2bd1).
- **D6** (session, 16/10/2026) — Libellé gérant « Laz » pour Lazard (nouvelle société) ; libellés existants repris pour R·co, Mon, Carm, ODDO, Pct.
