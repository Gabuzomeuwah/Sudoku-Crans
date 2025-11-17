/*
  CreeTableauSudoku.jquery.js

  Description (FR):
  ------------------
  Script principal de gestion d'une grille de Sudoku 9x9 construite en HTML.
  - Construit dynamiquement la grille (tableau HTML) et garde en cache les
    références des cellules pour manipulation ultérieure.
  - Permet la saisie manuelle des chiffres, la validation immédiate, le
    masquage des cases reliées, l'affichage des candidats et la résolution
    automatique par plusieurs stratégies (déterministes puis backtracking).

  Points importants:
  - Toutes les fonctions modifient le DOM via jQuery et utilisent des classes
    CSS pour indiquer l'état des cellules (ex. 'valid', 'error', 'sudoku-cell-readonly').
  - Les identifiants des cellules suivent un format fixe (ex. T00R00C00) qui
    permet d'extraire la ligne et la colonne par sous-chaîne.
  - Le résolveur combine : remplissage par candidat unique, essais contrôlés,
    puis backtracking aléatoire avec limite d'itérations.

  Liste synthétique des fonctions principales (FR) :
  - CreeTableau(...) : construit la table HTML et initialise `elements`.
  - formatteNombre(...) : utilitaire pour formater les portions numériques des ids.
  - formatteCases() : attache les gestionnaires d'évènements aux cellules.
  - updateCell() : validation et mise à jour visuelle lors de la saisie.
  - flyOverCell()/flyOutOfCell() : survol des cellules, affichage des candidats ou mise en évidence.
  - lireFichierTexte(elem) : lit un fichier texte de grille et remplit la grille.
  - resoudreGrille(), resoudre1/2/3() : enchaînement des stratégies de résolution.
  - composeLigne/composeColonne/composeCarre : calcul des indices des cases reliées.
  - contenuCasesReliees : renvoie les valeurs actuelles des cases reliées à une cellule.

  Remarques pratiques :
  - Enregistrez les fichiers en UTF-8 (sans BOM) pour éviter des problèmes d'accents.
  - Le script suppose `vChiffres = '123456789'` pour une grille 9x9.
  - Les fichiers fournis sont destinés à être exécutés dans un navigateur moderne.
*/

// Tableau `elements` et nombre total de cellules générées.
// `elements` contient les références vers tous les éléments <td> créés par `CreeTableau`.
// `nbCells` est la longueur de ce tableau et représente le nombre total de cases du Sudoku.
let elements;
let nbCells;

/**
 * CreeTableau
 * Construit dynamiquement une grille HTML (éléments <table>/<tbody>/<tr>/<td>)
 * et l'ajoute au document. Les cellules créées sont référencées dans la
 * variable globale `elements` pour être manipulées ensuite.
 *
 * Paramètres:
 *  - pNumTab : index de la table (sert à nommer les éléments de façon unique)
 *  - pNbLig  : nombre de lignes à créer
 *  - pNbcol  : nombre de colonnes à créer
 *  - pHeader : tableau optionnel contenant le texte des en-têtes (ajoute une ligne <th>)
 *  - pEdit   : booléen indiquant si les cellules doivent être éditables (contentEditable)
 *
 * Chaque cellule reçoit un id construit via `formatteNombre` (ex. T00R00C00) pour
 * permettre un repérage facile ligne/colonne dans le code.
 */
function CreeTableau(pNumTab, pNbLig, pNbcol, pHeader, pEdit) {
    try {
        let ordre = 0; // offset utilisé lorsque une ligne d'entête est présente
        const idDiv = 'div-' + formatteNombre(pNumTab, '0', 2);
        const $myDiv = $('<div>').attr('id', idDiv);
        $('body').append($myDiv);

        const idTab = 'T' + formatteNombre(pNumTab, '0', 2);
        const $elemTable = $('<table>').attr('id', idTab);
        $myDiv.append($elemTable);

        const $elemThead = $('<thead>');
        $elemTable.append($elemThead);
        const $elemTbody = $('<tbody>');
        $elemTable.append($elemTbody);

        // Si un tableau d'entête est fourni, on crée une première ligne <th>
        if (Array.isArray(pHeader)) {
            const idTr = idTab + 'R' + formatteNombre(0, '0', 2);
            const $elemTr = $('<tr>').attr('id', idTr);
            $elemTbody.append($elemTr);
            for (let j = 0; j < pNbcol; j++) {
                const idTh = idTr + 'H' + formatteNombre(j, '0', 2);
                const $elemTh = $('<th>')
                    .attr('id', idTh)
                    .attr('contenteditable', 'false')
                    .text(pHeader[j]);
                $elemTr.append($elemTh);
            }
            $myDiv.append($elemThead);
            ordre = 1; // décale l'indexation des lignes suivantes
        }

        // Création des lignes et cellules demandées
        if (pNbLig > 0) {
            for (let i = ordre; i < pNbLig + ordre; i++) {
                const idTr = idTab + 'R' + formatteNombre(i, '0', 2);
                const $elemTr = $('<tr>').attr('id', idTr);
                $elemTbody.append($elemTr);
                for (let j = 0; j < pNbcol; j++) {
                    const idTd = idTr + 'C' + formatteNombre(j, '0', 2);
                    const $elemTd = $('<td>')
                        .attr('id', idTd)
                        .attr('contenteditable', pEdit.toString());
                    $elemTr.append($elemTd);
                }
            }
        }

        // Mise en cache des <td> créés pour usage ultérieur
        elements = $elemTable.find('td').toArray();
        nbCells = elements.length;
    } catch (err) {
        if (err instanceof Error) {
            alert('creeTableau ' + err.name + ' ' + err.message);
        } else {
            alert('Error ' + String(err));
        }
    }

    // Fonction utilitaire interne : ajoute des caractères de remplissage
    // aux parties numériques des identifiants afin d'obtenir une longueur fixe
    function formatteNombre(pNombre, pCar, pLong) {
        try {
            const resultat = pNombre.toString();
            return resultat.padStart(pLong, pCar);
        } catch (err) {
            if (err instanceof Error) {
                alert('formatteNombre  ' + err.name + ' ' + err.message);
            } else {
                alert('formatteNombre ' + String(err));
            }
        }
    }
}

/*
  Variables d'état utilisées par le script :
  - vCasesRelieesChecked : indique si le mode "montrer les cases reliées" a été activé
  - strValues            : chaîne temporaire utilisée pour agréger les valeurs lors du calcul des possibilités
  - visuCP               : vrai si l'affichage du nombre de possibilités est actif
  - dejaPleine           : mémorise si la grille était déjà pleine au moment du chargement
*/
let vCasesRelieesChecked = false;
let strValues = '';
let visuCP = false;
let dejaPleine;
function extraitLigneEtColonne(pId) {
    try {
        // Le format d'id attendu encode la ligne et la colonne en positions fixes
        // Exemple : T00R00C00 -> la sous-chaîne ligne est en 3..5, colonne en 6..8
        const lig = Number.parseInt(pId.substring(4, 7));
        const col = Number.parseInt(pId.substring(7, 10));
        return [lig, col];
    } catch (err) {
        if (err instanceof Error) {
            alert('extraitLigneEtColonne  ' + err.name + ' ' + err.message);
        } else {
            alert('extraitLigneEtColonne ' + String(err));
        }
        return [0, 0];
    }
}
function razGrille(pSup) {
    try {
        // Réinitialise le titre et l'apparence des cellules : vide le contenu,
        // remet la classe CSS de base et active l'édition si demandé.
        $('#titre').text('Sudoku');
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            $vCell.text('');
            $vCell.removeClass().addClass('sudoku-cell');
            $vCell.attr('contentEditable', 'true');
            if (pSup) { $('#montrerCasesReliees').prop('checked', false); }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('razGrille  ' + err.name + ' ' + err.message);
        } else {
            alert('razGrille ' + String(err));
        }
    }
}
function grillePleine() {
    try {
        // Retourne vrai si toutes les cellules contiennent un texte non vide.
        let resultat = true;
        for (let i = 0; i < nbCells; i++) {
            if ($(elements[i]).text() == '') {
                resultat = false;
                break;
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('grillePleine  ' + err.name + ' ' + err.message);
        } else {
            alert('grillePleine ' + String(err));
        }
        return false;
    }
}
function grilleValide() {
    try {
        // Retourne vrai si toutes les cellules ont été marquées comme valides
        // (classe CSS 'valid'). Utile pour vérifier qu'une grille complète est correcte.
        let resultat = true;
        for (let i = 0; i < nbCells; i++) {
            if (!$(elements[i]).hasClass('valid')) {
                resultat = false;
                break;
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('grilleValide  ' + err.name + ' ' + err.message);
        } else {
            alert('grilleValide ' + String(err));
        }
        return false;
    }
}
function youpie() {
    try {
        // Applique un style de célébration sur les cellules résolues et les verrouille
        // (rend non éditables les cellules qui ne sont pas déjà marquées readonly).
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            if (!$vCell.hasClass('sudoku-cell-readonly')) {
                $vCell.removeClass().addClass('sudoku-youpie');
                $vCell.attr('contentEditable', 'false');
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('youpie  ' + err.name + ' ' + err.message);
        } else {
            alert('youpie ' + String(err));
        }
    }
}
function isValidEntry(id, value) {
    try {
        // Vérifie si l'insertion de `value` dans la cellule identifiée par `id`
        // violerait les contraintes de base du Sudoku (doublon dans la ligne,
        // colonne ou carré). Renvoie vrai si `value` est un seul caractère et
        // n'apparaît pas déjà dans les cases reliées.
        let vCCR = contenuCasesReliees($('#' + id)[0]);
        const resultat = !vCCR.includes(value) && value.length === 1;
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('isValidEntry  ' + err.name + ' ' + err.message);
        } else {
            alert('isValidEntry ' + String(err));
        }
        return false;
    }
}
function complemente(pValues) {
    try {
        // À partir d'une chaîne contenant les chiffres présents (ex. '139'),
        // renvoie la « complémentaire » : les chiffres absents parmi ceux
        // autorisés (`vChiffres`). Utilisé pour afficher les candidats.
        let resultat = '';
        for (let i = 1; i <= lngChiffres; i++) {
            if (pValues.indexOf(i.toString()) === -1) {
                resultat += i.toString() + ' ';
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('complemente ' + err.name + ' ' + err.message);
        } else {
            alert('complemente ' + String(err));
        }
        return '';
    }
}
function bloqueCells() {
    try {
        // Verrouille (rend non éditables) toutes les cellules remplies et marquées
        // comme 'valid'. Utilisé pour protéger les valeurs de départ (givens).
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            if ($vCell.text() !== '' && $vCell.hasClass('valid')) {
                $vCell.removeClass().addClass('sudoku-cell-readonly');
                $vCell.attr('contentEditable', 'false');
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('bloqueCells ' + err.name + ' ' + err.message);
        } else {
            alert('bloqueCells ' + String(err));
        }
    }
}
function formatteCases() {
    try {
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            $vCell.on('mouseover', flyOverCell);
            $vCell.on('mouseout', flyOutOfCell);
            $vCell.on('input', updateCell);
            $vCell.css('caretColor', 'black');
            $vCell.text('');
        }
        $('#chargeGrille').on('change', function () {
            lireFichierTexte(this);
        });
        $('#montrerCasesReliees').on('change', function () {
            if ($(this).prop('checked') === true) {
                razGrille(false);
                $('#chiffresDispo').text('');
                visuCP = false;
            }
        });
        // Ajoute les informations du navigateur détecté dans le DOM (utile
        // pour le débogage ou l'affichage d'informations sur l'environnement).
        $('#Navigator').text($('#Navigator').text() + navigateur());
    } catch (err) {
        if (err instanceof Error) {
            alert('formatteCases ' + err.name + ' ' + err.message);
        } else {
            alert('formatteCases ' + String(err));
        }
    }
}
function updateCell() {
    try {
        // Appelée lorsqu'une cellule est modifiée par l'utilisateur.
        // Valide la nouvelle valeur et met à jour les classes CSS pour indiquer
        // l'état (erreur, valide ou cellule vide).
        let $pCell = $(this);
        strValues = '';
        // Empêche la saisie multilignes (touche Entrée)
        if ($pCell.text().indexOf('\n') !== -1) {
            $pCell.text('');
        }
        const id = $pCell.attr('id');
        const value = $pCell.text();
        // Réinitialise les classes et applique l'état correspondant :
        // - 'error' si la saisie est invalide
        // - 'valid' si la saisie est correcte
        // - 'sudoku-cell' si vide
        $pCell.removeClass();
        if (value !== '') {
            // La saisie est invalide si ce n'est pas un chiffre autorisé unique
            if (!isValidEntry(id, value) || vChiffres.indexOf(value) === -1 || value.length > 1) {
                $pCell.addClass('error');
            } else {
                $pCell.addClass('valid');
                // Si la grille est maintenant pleine et ne l'était pas à l'ouverture,
                // afficher l'animation/message de victoire.
                if (grillePleine() && !dejaPleine) {
                    youpie();
                    $('#titre').text("Sudoku : Bravo c'est gagné !");
                }
            }
        } else {
            $pCell.addClass('sudoku-cell');
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('updateCell ' + err.name + ' ' + err.message);
        } else {
            alert('updateCell ' + String(err));
        }
    }
}
function flyOverCell() {
    try {
        if ($('#montrerCasesReliees').prop('checked')) {
            // Si l'option "Montrer les cases reliées" est cochée, on met en
            // évidence les cases de la même ligne/colonne/carré et on les rend
            // temporairement non éditables pendant le survol.
            let vCasesReliees = casesReliees(this);
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if (vCasesReliees.includes(i)) {
                    $vCell.removeClass().addClass('valid');
                    $vCell.attr('contentEditable', 'false');
                }
            }
            $(this).removeClass().addClass('cellule').attr('contentEditable', 'false');
        } else {
            strValues = '';
            const position = extraitLigneEtColonne($(this).attr('id'));
            const row = position[0];
            const col = position[1];
            const $eVs = $('#chiffresDispo');
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if (!$vCell.hasClass('sudoku-cell-readonly') && !$vCell.hasClass('sudoku-youpie')) {
                    $vCell.attr('contentEditable', 'true');
                }
            }
            if ($(this).text() === '') {
                for (let i = 0; i < lngChiffres; i++) {
                    const $vCell = $(elements[row * lngChiffres + i]);
                    if (!strValues.includes($vCell.text())) {
                        strValues += $vCell.text();
                    }
                }
                for (let i = 0; i < lngChiffres; i++) {
                    const $vCell = $(elements[i * lngChiffres + col]);
                    if (!strValues.includes($vCell.text())) {
                        strValues += $vCell.text();
                    }
                }
                for (let i = 0; i < 3; i++) {
                    const startRow = row - (row % 3);
                    const startCol = col - (col % 3);
                    for (let j = 0; j < 3; j++) {
                        const $vCell = $(elements[(startRow + i) * lngChiffres + startCol + j]);
                        if (!strValues.includes($vCell.text())) {
                            strValues += $vCell.text();
                        }
                    }
                }
                $eVs.text('Chiffre(s) possible(s) : ' + complemente(strValues));
            } else {
                if (vCasesRelieesChecked === false) {
                    $eVs.text('Chiffre(s) possibles : Non disponible(s)');
                }
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('flyOverCell ' + err.name + ' ' + err.message);
        } else {
            alert('flyOverCell ' + String(err));
        }
    }
}
function flyOutOfCell() {
    try {
        if ($('#montrerCasesReliees').prop('checked')) {
            // Restaure l'apparence des cellules qui avaient été mises en évidence
            // lors du survol.
            let vCasesReliees = casesReliees(this);
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if (vCasesReliees.includes(i)) {
                    $vCell.removeClass().addClass('sudoku-cell');
                }
            }
            $(this).removeClass().addClass('sudoku-cell');
        } else {
            $('#chiffresDispo').text('');
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('flyOutOfCell ' + err.name + ' ' + err.message);
        } else {
            alert('flyOutOfCell ' + String(err));
        }
    }
}
function navigateur() {
    try {
        const userAgent = navigator.userAgent;
        let browserName, browserVersion;
        if (userAgent.match(/chrome|chromium|crios/i)) {
            browserName = 'Chrome';
            browserVersion = userAgent.match(/chrome\/(\d+)/i)
                ? userAgent.match(/chrome\/(\d+)/i)[1]
                : 'Version inconnue';
        } else if (userAgent.match(/firefox|fxios/i)) {
            browserName = 'Firefox';
            browserVersion = userAgent.match(/firefox\/(\d+)/i)
                ? userAgent.match(/firefox\/(\d+)/i)[1]
                : 'Version inconnue';
        } else if (userAgent.match(/safari/i)) {
            browserName = 'Safari';
            browserVersion = userAgent.match(/version\/(\d+)/i)
                ? userAgent.match(/version\/(\d+)/i)[1]
                : 'Version inconnue';
        } else if (userAgent.match(/msie|trident/i)) {
            browserName = 'Internet Explorer';
            browserVersion = userAgent.match(/msie (\d+)/i)
                ? userAgent.match(/msie (\d+)/i)[1]
                : userAgent.match(/rv:(\d+)/i)
                    ? userAgent.match(/rv:(\d+)/i)[1]
                    : 'Version inconnue';
        } else if (userAgent.match(/edge/i)) {
            browserName = 'Edge';
            browserVersion = userAgent.match(/edg\/(\d+)/i)
                ? userAgent.match(/edg\/(\d+)/i)[1]
                : 'Version inconnue';
        } else {
            browserName = 'Inconnu';
            browserVersion = 'Version inconnue';
        }
        return ' ' + browserName + ' Version: ' + browserVersion;
    } catch (err) {
        if (err instanceof Error) {
            alert('navigateur ' + err.name + ' ' + err.message);
        } else {
            alert('navigateur ' + String(err));
        }
        return '';
    }
}
function lireFichierTexte(elem) {
    try {
        razGrille(true);
        vCasesRelieesChecked = false;
        $('#montrerCasesReliees').prop('checked', false);
        $('#titre').text($('#titre').text() + ' : ' + elem.files[0].name);
        const reader = new FileReader();
        let resultat_1 = '';
        reader.onload = function (e) {
            // Lecture du contenu du fichier et extraction des caractères numériques
            // correspondant aux chiffres du Sudoku. Les autres caractères sont
            // ignorés. Attention : FileReader.readAsText utilise l'encodage par
            // défaut du navigateur si aucun encodage n'est fourni.
            const text = e.target.result;
            for (let i = 0; i < text.length; i++) {
                if (vChiffres.indexOf(text[i]) !== -1) {
                    resultat_1 += text[i];
                } else if (text[i] === '0') {
                    // traiter '0' comme une case vide
                    resultat_1 += '0';
                } else {
                    resultat_1 += '';
                }
            }
            for (let i = 0; i < resultat_1.length; i++) {
                if (resultat_1[i] != '0') {
                    $(elements[i]).text(resultat_1[i]);
                } else {
                    $(elements[i]).text('');
                }
            }
            dejaPleine = grillePleine();
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if ($vCell.text() !== '') {
                    $vCell.removeClass().addClass('valid');
                }
            }
            if (!dejaPleine) {
                bloqueCells();
            }
        };
        reader.readAsText(elem.files[0]);
        elem.value = '';
    } catch (err) {
        if (err instanceof Error) {
            alert('lireFichierTexte ' + err.name + ' ' + err.message);
        } else {
            alert('lireFichierTexte ' + String(err));
        }
    }
}
function initClassListGrille() {
    try {
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            if (!$vCell.hasClass('sudoku-cell-readonly')) {
                if ($vCell.text() != '') {
                    $vCell.removeClass().addClass('valid');
                } else {
                    $vCell.removeClass().addClass('sudoku-cell');
                }
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('initClassListGrille ' + err.name + ' ' + err.message);
        } else {
            alert('initClassListGrille ' + String(err));
        }
    }
}
let grilleSauvee1 = [];
let grilleSauvee2 = [];
function sauveGrille1() {
    try {
        for (let i = 0; i < nbCells; i++) {
            grilleSauvee1[i] = $(elements[i]).text();
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('sauveGrille1 ' + err.name + ' ' + err.message);
        } else {
            alert('sauveGrille1 ' + String(err));
        }
    }
}
function restaureGrille1() {
    try {
        for (let i = 0; i < nbCells; i++) {
            $(elements[i]).text(grilleSauvee1[i]);
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('restaureGrille1 ' + err.name + ' ' + err.message);
        } else {
            alert('restaureGrille1 ' + String(err));
        }
    }
}
function sauveGrille2() {
    try {
        for (let i = 0; i < nbCells; i++) {
            grilleSauvee2[i] = $(elements[i]).text();
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('sauveGrille2 ' + err.name + ' ' + err.message);
        } else {
            alert('sauveGrille2 ' + String(err));
        }
    }
}
function restaureGrille2() {
    try {
        for (let i = 0; i < nbCells; i++) {
            $(elements[i]).text(grilleSauvee2[i]);
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('restaureGrille2 ' + err.name + ' ' + err.message);
        } else {
            alert('restaureGrille2 ' + String(err));
        }
    }
}
function listeCellulesLibres() {
    try {
        const LCV = [];
        for (let i = 0; i < nbCells; i++) {
            let $vCell = $(elements[i]);
            if (!$vCell.hasClass('sudoku-cell-readonly') && $vCell.text() === '') {
                LCV.push(i);
            }
        }
        return LCV;
    } catch (err) {
        if (err instanceof Error) {
            alert('listeCellulesLibres ' + err.name + ' ' + err.message);
        } else {
            alert('listeCellulesLibres ' + String(err));
        }
    }
}
function ChiffresPossiblesTC() {
    try {
        const vChiffresPossibles = [];
        for (let i = 0; i < nbCells; i++) {
            const $vCell = $(elements[i]);
            let resultat = '';
            for (let k = 1; k <= lngChiffres; k++) {
                if (isValidEntry($vCell.attr('id'), k.toString())) {
                    resultat += k.toString();
                }
            }
            vChiffresPossibles[i] = resultat;
        }
        return vChiffresPossibles;
    } catch (err) {
        if (err instanceof Error) {
            alert('ChiffresPossiblesTC ' + err.name + ' ' + err.message);
        } else {
            alert('ChiffresPossiblesTC ' + String(err));
        }
    }
}
function ChiffresPossibles1C(pCell) {
    try {
        let resultat = '';
        for (let k = 1; k <= lngChiffres; k++) {
            if (isValidEntry($(pCell).attr('id'), k.toString())) {
                resultat += k.toString();
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('ChiffresPossibles1C ' + err.name + ' ' + err.message);
        } else {
            alert('ChiffresPossibles1C ' + String(err));
        }
    }
}
function montrerNombrePossibles() {
    try {
        const vCP = ChiffresPossiblesTC();
        if (visuCP === false) {
            $('#montrerCasesReliees').prop('checked', false);
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if (!$vCell.hasClass('sudoku-cell-readonly')) {
                    if ($vCell.text() === '') {
                        $vCell.removeClass().addClass('sudoku-cell-readonly-cp');
                        $vCell.attr('contentEditable', false);
                        $vCell.text(vCP[i].length);
                    }
                }
            }
            visuCP = true;
        } else {
            for (let i = 0; i < nbCells; i++) {
                const $vCell = $(elements[i]);
                if (!$vCell.hasClass('sudoku-cell-readonly')) {
                    if ($vCell.hasClass('sudoku-cell-readonly-cp')) {
                        $vCell.removeClass().addClass('sudoku-cell');
                        $vCell.attr('contentEditable', true);
                        $vCell.text('');
                    }
                }
            }
            visuCP = false;
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('montrerNombrePossibles ' + err.name + ' ' + err.message);
        } else {
            alert('montrerNombrePossibles ' + String(err));
        }
    }
}
function grilleInitialeValide() {
    for (let i = 0; i < nbCells; i++) {
        const $vCell = $(elements[i]);
        const value = $vCell.text();
        if (value !== '') {
            $vCell.text('');
            if (!isValidEntry($vCell.attr('id'), value)) {
                $vCell.text(value);
                return false;
            }
            $vCell.text(value);
        }
    }
    return true;
}

function resoudreGrille() {
    try {
        document.getElementById('montrerCasesReliees').checked = false;
        sauveGrille2();
        if (!grilleInitialeValide()) {
            alert("La grille initiale contient des erreurs ou des contradictions !");
            return;
        }
        // Lance plusieurs stratégies de résolution successives :
        // 1) méthodes déterministes simples (cases à candidat unique)
        // 2) essais légers avec retour si échec
        // 3) tentative aléatoire/backtracking limité
        // L'objectif est d'essayer les méthodes les plus sûres avant d'utiliser
        // une approche non déterministe.
        resoudre1();
        if (grillePleine()) {
            youpie();
            $('#titre').text("Sudoku : Bravo c'est gagné (1) !");
        } else {
            restaureGrille2();
            resoudre2();
            if (grillePleine()) {
                youpie();
                $('#titre').text("Sudoku : Bravo c'est gagné (2) !");
            } else {
                restaureGrille2();
                resoudre3();
                if (grillePleine()) {
                    if (!document.getElementById("sansYoupie").checked) {
                        youpie();
                        $('#titre').text("Sudoku : Bravo c'est gagné (3) !");
                    } else {
                        $('#titre').text("Sudoku : Grille pleine aléatoire");
                        document.getElementById("sansYoupie").checked = false;
                    }
                } else {
                    alert('Résolution impossible, grille trop complexe');
                }
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('resoudreGrille ' + err.name + ' ' + err.message);
        } else {
            alert('resoudreGrille ' + String(err));
        }
    }
}
function resoudre1() {
    try {
        // Etape 1 : remplissage déterministe des cases à candidat unique.
        // On parcourt les cases libres et on renseigne celles qui n'ont qu'un
        // seul chiffre possible. On répète l'opération tant que des progrès sont faits.
        let change;
        do {
            change = false;
            const vLCL = listeCellulesLibres();
            for (let i = 0; i < vLCL.length; i++) {
                const $vCell = $(elements[vLCL[i]]);
                const vChiffresPossibles1C = ChiffresPossibles1C($vCell[0]);
                if (vChiffresPossibles1C.length === 1 && $vCell.text() === '') {
                    $vCell.removeClass().addClass('valid');
                    $vCell.text(vChiffresPossibles1C);
                    change = true;
                }
            }
        } while (change === true);
        initClassListGrille();
    } catch (err) {
        if (err instanceof Error) {
            alert('resoudre1 ' + err.name + ' ' + err.message);
        } else {
            alert('resoudre1 ' + String(err));
        }
    }
}
function resoudre2() {
    try {
        // Etape 2 : essais contrôlés. Pour chaque case libre on teste tour à tour
        // ses candidats : on sauvegarde la grille, on place un candidat, on relance
        // la phase déterministe (resoudre1). Si cela mène à une solution complète
        // on s'arrête, sinon on restaure et on continue.
        const vLCL = listeCellulesLibres();
        for (let i = 0; i < vLCL.length; i++) {
            const $vCell = $(elements[vLCL[i]]);
            const vCP = ChiffresPossibles1C($vCell[0]);
            sauveGrille1();
            for (let j = 0; j < vCP.length; j++) {
                $vCell.text(vCP[j]);
                resoudre1();
                if (grillePleine()) {
                    break;
                } else {
                    restaureGrille1();
                }
            }
        }
        initClassListGrille();
    } catch (err) {
        if (err instanceof Error) {
            alert('resoudre2 ' + err.name + ' ' + err.message);
        } else {
            alert('resoudre2 ' + String(err));
        }
    }
}
function resoudre3() {
    try {
        // Etape 3 : backtracking aléatoire avec limite. Méthode non déterministe
        // : on remplit au hasard des candidats et on tente d'aboutir. Un compteur
        // limite évite une boucle infinie.
        const limite = 50000;
        let count = 0;
        sauveGrille1();
        do {
            let vLCL = listeCellulesLibres();
            for (let i = 0; i < vLCL.length; i++) {
                const $vCell = $(elements[vLCL[0]]);
                const vCP = ChiffresPossibles1C($vCell[0]);
                if (vCP.length === 0) {
                    restaureGrille1();
                    break;
                }
                $vCell.text(vCP[Math.floor(Math.random() * vCP.length)]);
                vLCL = listeCellulesLibres();
            }
            count++;
        } while (!grillePleine() && count < limite)
        initClassListGrille();
    } catch (err) {
        if (err instanceof Error) {
            alert('resoudre3 ' + err.name + ' ' + err.message);
        } else {
            alert('resoudre3 ' + String(err));
        }
    }
}
function epureGrille() {
    try {
        const $NbCases = $('#nbCases');
        if (grillePleine() && grilleValide() && $NbCases.val().trim() !== '' && !isNaN($NbCases.val())) {
            const traites = [];
            const nbCases = $NbCases.val();
            do {
                const i = Math.floor(Math.random() * nbCells);
                if (!traites.includes(i.toString())) {
                    traites.push(i.toString());
                    const $vCelli = $(elements[i]);
                    $vCelli.removeClass().addClass('sudoku-cell');
                    $vCelli.text('');
                }
            } while (traites.length < nbCases);
            dejaPleine = false;
            bloqueCells();
        } else {
            $NbCases.val('');
        }
    } catch (err) {
        if (err instanceof Error) {
            alert('epureGrille ' + err.name + ' ' + err.message);
        } else {
            alert('epureGrille ' + String(err));
        }
    }
}
function composeLigne(pCell) {
    try {
        const position = extraitLigneEtColonne($(pCell).attr('id'));
        const row = position[0];
        const col = position[1];
        const numCell = row * lngChiffres + col;
        const resultat = [];
        for (let pnt = 0; pnt < lngChiffres; pnt++) {
            if (row * lngChiffres + pnt !== numCell) {
                resultat.push(row * lngChiffres + pnt);
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('composeLigne ' + err.name + ' ' + err.message);
        } else {
            alert('composeLigne ' + String(err));
        }
    }
}
function composeColonne(pCell) {
    try {
        const position = extraitLigneEtColonne($(pCell).attr('id'));
        const row = position[0];
        const col = position[1];
        const numCell = row * lngChiffres + col;
        const resultat = [];
        for (let pnt = 0; pnt < lngChiffres; pnt++) {
            if (col + pnt * lngChiffres !== numCell) {
                resultat.push(col + pnt * lngChiffres);
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('composeColonne ' + err.name + ' ' + err.message);
        } else {
            alert('composeColonne ' + String(err));
        }
    }
}
function composeCarre(pCell) {
    try {
        const position = extraitLigneEtColonne($(pCell).attr('id'));
        const row = position[0];
        const col = position[1];
        const numCell = row * lngChiffres + col;
        const grp3Lig = Math.floor(numCell / lngChiffres / 3);
        const grp3Col = Math.floor((numCell % lngChiffres) / 3);
        const resultat = [];
        const prems = grp3Lig * 3 * lngChiffres + grp3Col * 3;
        for (let pnt = 0; pnt < 3; pnt++) {
            if (prems + 0 * lngChiffres + pnt !== numCell) {
                resultat.push(prems + 0 * lngChiffres + pnt);
            }
            if (prems + 1 * lngChiffres + pnt !== numCell) {
                resultat.push(prems + 1 * lngChiffres + pnt);
            }
            if (prems + 2 * lngChiffres + pnt !== numCell) {
                resultat.push(prems + 2 * lngChiffres + pnt);
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('composeCarre ' + err.name + ' ' + err.message);
        } else {
            alert('composeCarre ' + String(err));
        }
    }
}
function casesReliees(pCell) {
    try {
        const resultat = [];
        const vLigne = composeLigne(pCell);
        const vColonne = composeColonne(pCell);
        const vCarre = composeCarre(pCell);
        for (let pnt = 0; pnt < 8; pnt++) {
            if (!resultat.includes(vLigne[pnt])) {
                resultat.push(vLigne[pnt]);
            }
            if (!resultat.includes(vColonne[pnt])) {
                resultat.push(vColonne[pnt]);
            }
            if (!resultat.includes(vCarre[pnt])) {
                resultat.push(vCarre[pnt]);
            }
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('casesReliees ' + err.name + ' ' + err.message);
        } else {
            alert('casesReliees ' + String(err));
        }
    }
}
function contenuCasesReliees(pCell) {
    try {
        const resultat = [];
        const vCR = casesReliees(pCell);
        for (let i = 0; i < vCR.length; i++) {
            resultat.push($(elements[vCR[i]]).text());
        }
        return resultat;
    } catch (err) {
        if (err instanceof Error) {
            alert('contenuCasesReliees ' + err.name + ' ' + err.message);
        } else {
            alert('contenuCasesReliees ' + String(err));
        }
    }
}

