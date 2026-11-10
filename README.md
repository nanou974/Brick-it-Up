# Brick'it Up

Jeu mobile 3D incrémental (Three.js + Capacitor) : le camion livre les matériaux, tu les poses un par un, tu améliores ton chantier et tu construis des maisons de plus en plus grandes.

## Jouer
- **APK Android** : onglet *Releases* du dépôt, fichier `BrickItUp-vX.Y.Z.apk`. Il s'installe par-dessus la version précédente.
- **Navigateur** : `npm run serve`, puis ouvrir http://localhost:8080 (format portrait).

## Principe
1. Le camion livre un élément toutes les 10 s (au début).
2. Touche le gros bouton pour le poser : il tombe à sa place et rapporte des crédits.
3. Achète des améliorations : rapport, livraison, camion, entrepôt, ouvriers.
4. Maison terminée : une étoile (+5 % de crédits pour toujours) et une maison plus grande.

Les étapes de chaque maison : fondations (parpaings), murs (briques), charpente, toiture, menuiseries, finitions.

## Structure
- `src/game/rules.js` : étapes, maisons, améliorations, prix (sans dépendance)
- `src/game/house.js` : génère la liste des éléments d'une maison (positions, tailles)
- `src/game/game.js` : moteur (livraisons, pose, ouvriers, achats, absence)
- `src/game/scene.js` : scène 3D (chantier, camion, palette, ouvriers)
- `src/game/main.js` : interface, sauvegarde, boucle de jeu
- `tools/sim.mjs` : simulation d'un joueur pour régler la durée des maisons
- `tools/shot.mjs`, `tools/play.mjs` : captures et partie automatique dans le navigateur
- `docs/GDD.md` : règles détaillées

## Publier une version
Augmenter `VERSION` dans `src/game/version.js`, écrire `docs/release-notes.md`, pousser sur `main` : GitHub Actions compile l'APK et crée la release.
