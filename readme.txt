# Grille Sudoku — Générateur / Résolveur (HTML + jQuery)

Petite application web statique pour créer, éditer, épurer et résoudre des grilles de Sudoku 9x9.

## Description
- Interface en HTML/CSS et logique en JavaScript (jQuery).
- Génère dynamiquement une grille 9x9 et propose des outils d'aide et de résolution.

## Fonctionnalités principales
- Création dynamique d'une grille HTML (`CreeTableau`).
- Saisie directe des chiffres (1–9) dans les cases (édition par `contentEditable`).
- Validation en temps réel des entrées et marquage des erreurs.
- Affichage du nombre de possibilités pour chaque case.
- Résolveur automatique (heuristiques + backtracking aléatoire).
- Chargement d'une grille depuis un fichier texte via l'input `#chargeGrille`.
- Épuration aléatoire (création de puzzles) via l'option `Epurer la grille`.

## Structure du dépôt
- `HTML-JS/creeTableauSudoku.html` — page principale.
- `HTML-JS/CreeTableauSudoku.jquery.js` — logique JavaScript centrale.
- `HTML-JS/jquery-3.7.1.min.js` — dépendance jQuery (fichier local).
- `HTML-JS/*.txt` — exemples de grilles (optionnel).
- `.editorconfig` — configuration pour forcer UTF-8.

## Installation & exécution
Aucune compilation requise — fichiers statiques.
1. Ouvrir `HTML-JS/creeTableauSudoku.html` dans un navigateur moderne (Chrome, Edge, Firefox), ou
2. Déployer le dossier `HTML-JS` sur un serveur web.

Si servi depuis un serveur, assurez-vous que les en?têtes HTTP incluent `charset=utf-8` pour éviter des problèmes d'affichage d'accents.

## Encodage
- Tous les fichiers doivent être enregistrés en UTF?8 (sans BOM). Un fichier `.editorconfig` est fourni pour standardiser le comportement des éditeurs.

## Utilisation rapide
- La grille se crée automatiquement à l'ouverture de la page.
- Saisir un chiffre dans une case pour le valider automatiquement.
- Boutons disponibles :
  - `Bloquer les cellules` : verrouille les cases correctes.
  - `Montrer le nombre de chiffres possibles` : affichage des possibilités par case.
  - `Résoudre la grille` : lance le résolveur.
  - `Epurer la grille` : supprimer un nombre de cases aléatoirement (paramètre `Nb de cases à épurer`).
  - `#chargeGrille` : charger une grille depuis un fichier texte.

## Contributions
- Pull requests bienvenues : décrivez le changement et fournissez un exemple ou une grille de test.
- Respectez l'encodage UTF?8 pour les nouveaux fichiers.

## Limitations et notes techniques
- Conçu pour des grilles 9x9 (variable `vChiffres = '123456789'`).
- Le résolveur peut échouer sur des grilles très complexes ou ambigües.
- Testé sur navigateurs modernes; IE non garanti.

## Licence
Ce projet est distribué sous la licence MIT — voir le fichier `LICENSE`.

---

Si vous voulez que je publie automatiquement le dépôt sur GitHub (création du repo et push), dites?le et fournissez l'URL distante ou autorisez l'accès Git localement.