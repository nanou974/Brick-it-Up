# Brick'it Up

Jeu mobile 3D incrémental (Three.js + Capacitor) : le camion livre les matériaux, tu les poses un par un, tu améliores ton chantier et tu construis des maisons de plus en plus grandes.

## Jouer
- **APK Android** : onglet *Releases* du dépôt, fichier `BrickItUp-vX.Y.Z.apk`. Il s'installe par-dessus la version précédente.
- **Version web (iPhone, iPad, PC…)** : https://nanou974.github.io/Brick-it-Up/ — mise à jour automatiquement à chaque nouvelle version.
  Sur iPhone : ouvrir le lien dans **Safari**, bouton Partager → **« Sur l'écran d'accueil »**. Le jeu s'ouvre alors en plein écran, avec son icône, et marche sans connexion.
- **En local** : `npm run serve`, puis ouvrir http://localhost:8080 (format portrait).

## Principe
1. Le camion livre un élément toutes les 10 s (au début).
2. Touche le gros bouton pour le poser : il tombe à sa place et rapporte des crédits.
3. Achète des améliorations : rapport, livraison, camion, entrepôt, ouvriers.
4. Maison terminée : une étoile et une maison plus grande, construite sur la parcelle suivante : les maisons finies forment une ville.

Les étapes de chaque maison : voirie (les rues de la parcelle), fondations (parpaings), murs (briques), charpente, toiture, menuiseries, finitions.

## Structure
- `src/game/rules.js` : étapes, maisons, améliorations, prix (sans dépendance)
- `src/game/houses.js` : catalogue des 20 maisons et variantes des tours suivants
- `src/game/house.js` : génère la liste des éléments d'une maison (volumes, toits, ouvertures, finitions)
- `src/game/items3d.js` : dessin 3D de chaque élément
- `src/game/city.js` : plan de la ville (parcelles en spirale, rues de chaque parcelle)
- `src/game/city3d.js` : affichage de la ville (constructions terminées fusionnées, rues, place)
- `src/game/game.js` : moteur (livraisons, pose, ouvriers, achats, absence)
- `src/game/scene.js` : scène 3D (chantier, camion, palette, ouvriers)
- `src/game/main.js` : interface, sauvegarde, boucle de jeu
- `tools/sim.mjs` : simulation d'un joueur pour régler la durée des maisons
- `tools/shot.mjs`, `tools/play.mjs`, `tools/houses-shot.mjs` : captures, partie automatique, photo de chaque maison
- `docs/GDD.md` : règles détaillées

## Publier une version
Augmenter `VERSION` dans `src/game/version.js`, écrire `docs/release-notes.md`, pousser sur `main` : GitHub Actions compile l'APK et crée la release, et publie la version web (workflow `pages.yml`). La version web est gardée hors connexion par un service worker (`tools/sw-template.js`, généré dans `www/sw.js`).
