# État du chantier UC — 56 supports éligibles

Plan validé le 20/08/2026 (fichier : ~/.claude/plans/adaptive-cuddling-bumblebee.md).
Périmètre : 56 UC (D7), 41 nouvelles (les 15 actuelles sont toutes dans le fichier). Un commit par lot conforme, aucun push.

| Lot | Contenu | Contrôle | État |
|---|---|---|---|
| 0 | Infrastructure + referentiel.json (extraction xlsx, résolution FF) | c0.py | **conforme** (essai 1) |
| 1 | Identifiants (Yahoo/FT) + éditorial (SRI, stratégie) des 41 nouvelles | c1.py | **conforme** (essai 1) |
| 2 | Catalogue front + listes back + CAT_MAP 4 catégories | c2.py | **conforme** (essai 1) |
| 3 | Données générées (npm run uc / fonds / ucmanagers) | c3.py | **conforme** (essai 2 — seuils/arrondi de mesure corrigés, bug composer D12) |
| 4 | Badges éligibilité Mut/Fin (lignes + fiche) | c4.py | à faire |
| 5 | Actus UC étendues au catalogue | c5.py | à faire |
| 6 | Bilan : tous contrôles, typecheck, aperçu mobile, commit final | tous | à faire |

Bornes git : lot 0 = « chantier UC : lot 0 » ; lot 1 = « chantier UC : lot 1 » ; lot 2 = « chantier UC : lot 2 » ; lot 3 = « chantier UC : lot 3 ».
