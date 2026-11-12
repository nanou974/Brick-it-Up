# Brick'it Up — document de conception

## Boucle de jeu
- Le **camion** livre des éléments à intervalle régulier (10 s au départ). Ils attendent sur la **palette** (l'entrepôt).
- Le joueur touche le **bouton de pose** (en restant appuyé, les poses s'enchaînent de plus en plus vite, de 0,2 s à 0,07 s entre deux poses) : l'élément suivant tombe à sa place sur le chantier (contour bleu = prochain élément) et rapporte des **crédits**.
- Quand l'entrepôt est plein, le camion attend : il faut poser pour qu'il revienne.
- **Tapoter le chantier** accélère la livraison : 0,1 s par tape, au plus 60 % de l'intervalle par livraison. Le camion approche sur la route au rythme du minuteur.
- **Musique** : morceau original en Do majeur, 116 BPM, 32 mesures en boucle, calculé par `tools/music-render.mjs` (assets/music/theme.ogg).
- Les **ouvriers** font l'aller-retour à pied (2,2 cases/s) : palette → élément → poste, en contournant ce qui est déjà construit (fondations, murs). L'élément tombe à leur arrivée. La cadence vient de leurs trajets : un ouvrier libre prend un élément du stock. Au-delà de 8 ouvriers (affichés au maximum), les autres font marcher l'équipe plus vite (+12 % chacun). Chaque tape sur le chantier fait presser le pas (cumulable jusqu'à ×2, retombe en 1 à 2 s). Ils posent tout seuls ce qui est en stock, même quand le jeu est fermé (jusqu'à 8 h d'absence rattrapées).

## Étapes d'une maison
| Étape | Élément | Crédits au niveau 1 |
| --- | --- | --- |
| Voirie | tronçon de rue, carrefour, réverbère, arbre | 1 |
| Fondations | parpaing, dalle | 1 |
| Murs | brique, pignon | 1 |
| Charpente | ferme (triangle de poutres) | 4 |
| Toiture | tuile | 2 |
| Menuiseries | fenêtre, porte | 6 |
| Finitions | cheminée, allée, massifs, boîte aux lettres, lampadaire, balcon, piscine, tours | 5 |

## La ville
Chaque construction terminée reste en place : elles forment une ville qui grandit autour d'une place centrale (fontaine, bancs, massifs).
- Parcelles de 32 m posées en spirale autour de la place ; rues de 7 m de large (chaussée, trottoirs, bordures, réverbères, arbres).
- Chaque chantier commence par l'étape **Voirie** : on pose une seule rue, celle par laquelle arrive le camion (6 à 7 éléments). Les autres côtés neufs de la parcelle restent en chemin de terre et sont goudronnés automatiquement, en récompense, quand la construction est terminée.
- Les constructions terminées sont affichées en version simplifiée et fusionnée (une par image au chargement) pour que la ville reste fluide.
- On peut dézoomer et glisser à deux doigts pour voir toute la ville.

## Constructions
30 constructions, toutes différentes (catalogue dans `src/game/houses.js`) : 19 maisons, 10 bâtiments publics et le château, toujours le dernier.

| N° | Bâtiment public | Ce qui le distingue |
| --- | --- | --- |
| 4 | Boulangerie | vitrines avec pains, store rayé, enseigne, terrasse de café |
| 7 | Bureau de poste | enseigne jaune, boîte aux lettres jaune, fourgon de La Poste |
| 10 | École | horloge sur fronton, cour avec marelle et paniers de basket, grille |
| 13 | Caserne de pompiers | portes rouges, tour de séchage des tuyaux, camion de pompiers |
| 16 | Mairie | colonnade avec fronton et horloge, marches, drapeaux français et européen |
| 19 | Église | clocher avec flèche et croix, rosace, vitraux, ifs |
| 22 | Gare | quai couvert, voie ferrée, train, bancs, horloge |
| 24 | Supermarché | grande enseigne, parking avec voitures, chariots |
| 26 | Hôpital | deux ailes, croix verte lumineuse, hélistation sur le toit, ambulance |
| 28 | Usine | toit en dents de scie, cheminées qui fument, citerne, palettes |

Aux tours suivants (constructions 31 et plus), on recommence la liste avec des variantes (couleurs, matériaux, taille, ajouts) et des étoiles dans le nom.
Chaque maison combine : un ou plusieurs volumes (plan en L, garage, grange, volumes décalés), un type de toit
(2 pans, 2 pans très pentus, 4 pans, une pente, plat, créneaux), un mur (brique, pierre, bois, crépi, colombages, soubassement),
des fenêtres (classiques, peu nombreuses, nombreuses, baies vitrées), des volets ou non, et des ajouts.

| # | Maison | Ce qui la rend unique |
| --- | --- | --- |
| 1 | Cabanon | tout petit, toit à une pente, briques |
| 2 | Chalet en bois | murs en planches, toit très pentu, terrasse, sapins |
| 3 | Maisonnette | crépi, auvent sur la porte, clôture |
| 4 | Petite maison | toit à 4 pans, cheminée |
| 5 | Maison de pêcheur | blanche, volets bleus, barque, filet |
| 6 | Longère | très longue et basse, pierre, 3 lucarnes |
| 7 | Maison normande | colombages, toit pentu, lucarnes, pommier |
| 8 | Mas provençal | plan en L, ocre, pergola, puits, oliviers, lavande |
| 9 | Maison à étage | 2 niveaux, balcon |
| 10 | Maison moderne | toit plat, baies vitrées, panneaux solaires |
| 11 | Maison de ville | étroite et haute (3 niveaux), bow-window |
| 12 | Grande maison | 4 pans, garage attenant, terrasse |
| 13 | Chalet de montagne | bois sur soubassement de pierre, grand balcon |
| 14 | Villa | 4 pans, piscine, palmiers, transats |
| 15 | Ferme | maison en pierre et grange en bois |
| 16 | Maison d'architecte | volumes décalés, toits plats, véranda |
| 17 | Manoir | pierre, porche à colonnes, tourelle, lucarnes |
| 18 | Petit immeuble | 4 niveaux, balcons à chaque étage, antenne |
| 19 | Hôtel particulier | très large, crépi clair, grille d'entrée, balcons |
| 20 | Château | tours crénelées, créneaux, douves, pont-levis, drapeaux |

Ensuite, la liste recommence en plus grand (★, ★★, ★★★) avec des **variantes** : autres couleurs de murs et de toit,
matériau échangé un tour sur deux (brique → pierre → crépi), un à trois ajouts supplémentaires (véranda, pergola, puits…).
Gains ×1,7 par maison, prix ×1,8 par maison.

## Améliorations
Remises à zéro à chaque nouvelle maison, comme les crédits (seules les étoiles sont conservées). Palier toutes les 5 améliorations : chaque achat compte pour 0,7 et chaque palier ajoute d'un coup 1,5.
| Amélioration | Effet | Palier visible |
| --- | --- | --- |
| Rapport | crédits ×(1 + 0,4 × niveau effectif) | — |
| Livraison | 10 s × 0,86^niveau effectif (0,8 s minimum) | — |
| Camion | +1 élément par livraison | camion plus grand, d'une autre couleur, plus chargé |
| Entrepôt | +2 places en attente | — |
| Ouvriers | +1 ouvrier (pose toutes les 6 s, un peu plus vite à chaque recrue) | ouvriers visibles sur le chantier |

## Étoiles et boutique
Une étoile par maison terminée. Les étoiles sont une monnaie, dépensée dans la boutique (bouton BOUTIQUE en haut de l'écran).

**Améliorations permanentes** (jamais remises à zéro) :
| Amélioration | Effet par niveau | Prix (étoiles) |
| --- | --- | --- |
| Équipe de départ | +1 ouvrier dès le début de chaque maison | 3, 6, 10 |
| Gros camion | +1 élément par livraison | 4, 8 |
| Livraison express | livraisons 10 % plus rapides | 2, 4, 6 |
| Tapes efficaces | +0,05 s par tape (0,1 → 0,2 s) | 1, 3 |
| Coffre rapide | un coffre toutes les 20 → 16 → 12 min | 2, 5 |
| Rapport de base | +10 % de pièces | 1, 2, 3, 4, 5 |

**Personnalisation** : 6 camions (plateau, benne, américain ; plusieurs couleurs), 5 tenues d'ouvriers,
5 décors (prairie, bord de mer, montagne enneigée, campagne d'automne, ville). 1 à 3 étoiles chacun.

## Coffre du chantier (pas de gain hors ligne)
Quand l'appli est fermée, le chantier s'arrête : aucune livraison, aucun ouvrier au travail, aucun revenu.
Un **coffre** se remplit en temps réel toutes les 20 minutes (16 puis 12 avec « Coffre rapide »), même appli fermée.
Le bouton du coffre (en bas à gauche) affiche le compte à rebours, puis « OUVRIR ! ». Il ne s'accumule pas : un coffre à la fois.
Contenu tiré à l'ouverture : entre 60 % et 90 % du prix moyen des 5 améliorations à ce moment-là (jamais plus de 90 %).

## Durée (simulation, joueur actif)
En dépensant ses étoiles (`PERKS=1 LEVELS=30 node tools/sim.mjs`) : Cabanon ≈ 6,5 min, puis 7 à 15 min par construction (les plus longues : Église et Ferme ≈ 15 min, Château ≈ 12 min), environ 5 h pour les 30 constructions.

## Camion
Le modèle grandit avec l'amélioration « Camion » (un palier toutes les 5 améliorations) : petit utilitaire → camion plateau → camion avec grue → 3 essieux avec grue et gyrophare → semi-remorque.
La boutique choisit la carrosserie (plateau, benne, américain) et la couleur. Le chargement montre les éléments de l'étape en cours (bordures, parpaings, briques, poutres, tuiles, fenêtres, plantes) ; le camion repart à vide.
Animations : roues qui tournent, feux stop et cabine qui plonge au freinage, fumée au démarrage, grue qui pivote vers la palette, phares allumés au crépuscule du feu d'artifice.

## Sauvegarde
- Enregistrée sur l'appareil (localStorage), toutes les 5 s et en quittant.
- Code de sauvegarde (Paramètres) : la partie est réduite à l'essentiel (niveau, éléments posés, étoiles, pièces, stock, améliorations, boutique, articles possédés et équipés, coffre) sous forme de nombres compacts, puis chiffrée (AES-GCM) dans un texte « BIU2-… » d'environ 80 à 100 caractères (format détaillé dans `src/game/savecode.js` ; les anciens codes « BIU1- » restent acceptés), à copier ou partager, puis à coller sur un autre appareil. Un code abîmé ou modifié est refusé.
- QR code : il contient un lien vers la version web avec le code (`…/Brick-it-Up/#code=BIU2-…`). Il reste simple (≈ 50 modules de côté) pour les caméras moyennes. Le bouton « Scanner un QR code » du jeu le lit avec la caméra (jsQR, aussi sur iPhone) ; l'appareil photo du téléphone ouvre la version web, qui propose de charger la partie. Dans tous les cas, le jeu montre ce que contient la partie et demande de confirmer.

## Mises à jour (version web)
Le jeu vérifie s'il existe une nouvelle version au lancement, au retour dans le jeu et toutes les 10 minutes. Sur l'écran titre, il recharge tout seul ; en pleine partie, un bandeau propose de redémarrer (partie sauvegardée) ou plus tard.
