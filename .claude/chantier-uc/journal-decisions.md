# Journal des décisions — chantier UC (unique, chronologique)

Chaque entrée : numéro, origine (session | utilisateur), énoncé.

- **D1** (session, plan validé 20/08/2026) — Mutuelle = colonne « ÉLIGIBILITÉ CHP, CHC, CER » du fichier ; l'utilisateur a écrit « CHR », la colonne du fichier fait foi.
- **D2** (session, plan validé) — `categorie` de chaque UC = sa section dans le fichier → 4 catégories affichées (Actions, Mixte, Obligataire, Monétaire) ; les sous-catégories actuelles disparaissent du tableau, la fiche garde la stratégie. Reclassements induits : Conservateur Obligations Court Terme → Monétaire ; Conservateur Diversifié, Diversifié Réactif et Rendement Flexible → Mixte.
- **D3** (session, plan validé) — Ordre du catalogue = ordre du fichier.
- **D4** (session, plan validé) — SRI introuvable dans le DIC officiel → null (affiché « — »), jamais approximé depuis le risque Morningstar.
- **D5** (session, plan validé) — Fonds absent de Yahoo/FT → graphId null (ligne non cliquable, perfs absentes), consigné au journal d'attente.
- **D6** (session, plan validé) — Onglet C = nom contenant « Conservateur » : Congrégation Investissement (société Conservateur GV, nom sans « Conservateur ») n'y entre pas.
- **D7** (session, 20/08/2026, lot 0) — Les deux lignes « FF - Sustainable W & W Fund (A) » du fichier sont deux FONDS distincts (mesure FT : LU0528228074 = FF Global Demographics A-Acc-EUR hedged, libellé Excel erroné ; LU1892829828 = FF Water & Waste A-Acc). La réponse utilisateur « garder le capitalisant » visait un doublon inexistant (les deux parts sont capitalisantes) ; la trame (fichier) étant absolue, les DEUX sont retenus, libellé corrigé pour LU0528228074 → 56 UC finales (et non 55). Contrôle C0 mis à jour en citant D7. Incohérence I1 remontée pour arbitrage.
- **D8** (utilisateur, réponses aux questions du 20/08/2026) — Badges « Mut »/« Fin » colorés sur les lignes + « Mutuelle »/« Finance » en toutes lettres sur la fiche ; actus UC étendues à tout le catalogue ; onglet par défaut « Tous » ; Favoris intouché.
- **D12** (session, lot 3) — Correction d'un bug pré-chantier dans fonds-meta.ts/composer() : une position Yahoo non numérique produisait NaN, traversait la garde `tot < 50` et écrivait une composition entièrement nulle (constaté sur FR001400PL02 et FR001400U512, fichiers supprimés). Garde corrigée (`!isFinite(tot)`), aucune exigence de contrôle chantier modifiée.
