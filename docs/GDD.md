# Brick'it Up — document de conception

## Boucle de jeu
- Le **camion** livre des éléments à intervalle régulier (10 s au départ). Ils attendent sur la **palette** (l'entrepôt).
- Le joueur touche le **bouton de pose** : l'élément suivant tombe à sa place sur le chantier (contour bleu = prochain élément) et rapporte des **crédits**.
- Quand l'entrepôt est plein, le camion attend : il faut poser pour qu'il revienne.
- Les **ouvriers** posent tout seuls ce qui est en stock, même quand le jeu est fermé (jusqu'à 8 h d'absence rattrapées).

## Étapes d'une maison
| Étape | Élément | Crédits au niveau 1 |
| --- | --- | --- |
| Fondations | parpaing, dalle | 1 |
| Murs | brique, pignon | 1 |
| Charpente | ferme (triangle de poutres) | 4 |
| Toiture | tuile | 2 |
| Menuiseries | fenêtre, porte | 6 |
| Finitions | cheminée, allée, massifs, boîte aux lettres, lampadaire, balcon, piscine, tours | 5 |

## Maisons
Cabanon (92 éléments), Maisonnette, Petite maison, Maison de campagne, Maison à étage, Grande maison, Villa (piscine), Manoir, Petit immeuble, Château (582 éléments, tours). Ensuite, la liste recommence en plus grand (★).
Gains ×1,7 par maison, prix ×2 par maison : chaque maison demande un peu plus de temps que la précédente.

## Améliorations
Remises à zéro à chaque nouvelle maison. Palier toutes les 5 améliorations : chaque achat compte pour 0,7 et chaque palier ajoute d'un coup 1,5.
| Amélioration | Effet | Palier visible |
| --- | --- | --- |
| Rapport | crédits ×(1 + 0,4 × niveau effectif) | — |
| Livraison | 10 s × 0,86^niveau effectif (0,8 s minimum) | — |
| Camion | +1 élément par livraison | camion plus grand, d'une autre couleur, plus chargé |
| Entrepôt | +2 places en attente | — |
| Ouvriers | +1 ouvrier (pose toutes les 6 s, un peu plus vite à chaque recrue) | ouvriers visibles sur le chantier |

## Étoiles
Une étoile par maison terminée : +5 % de crédits pour toujours.

## Durée (simulation, joueur actif)
Cabanon ≈ 6 min, puis 5 à 9 min, Château ≈ 11 min, puis 12 à 14 min au tour suivant.
