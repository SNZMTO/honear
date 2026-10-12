/**
 * Les images de la planche « Fais ta pochette » (étape 4) : chaque choix de l'avatar sur une pochette, les expressions, les motifs,
 * les tirages au sort, douze pochettes sur le noyer, et l'écran lui-même.
 * Rien n'est écrit sur le disque ici : ces images servent aussi aux contrôles et aux tests.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { pochetteAuHasard, type Tirage } from '../../regles/pochette';
import { EXPRESSIONS, type Avatar, type ChoixDeLAvatar, type NomDExpression } from '../../ressources/avatar';
import { DENSITES } from '../../ressources/densites';
import { MOTIFS_DE_POCHETTE, type Pochette } from '../../ressources/pochettes';
import type { Textes } from '../../ressources/textes';
import { calque } from '../../scene/calque';
import { dessinerLeMeuble, surLeBois, type Regard } from '../../scene/meuble';
import { dessinerLaPochette } from '../../scene/pochette';
import { agrandir, empriseDe } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import { pochetteDExemple } from '../exemples';
import type { ImageDePlanche } from '../image';
import { CLES_DES_CHOIX, dessinerLEcran } from './ecran';
import { LEGENDES_DE_LA_POCHETTE as L } from './legendes.fr';

/** Un tirage rejouable : la même graine redonne les mêmes pochettes. */
const tirage = (graine: number): Tirage => hasard(graine).suivant;

/** Le nom d'une chose dans les textes, ou une erreur qui dit laquelle manque. */
function nomDans(liste: Readonly<Record<string, string>>, cle: string, quoi: string): string {
  const nom = liste[cle];
  if (nom === undefined) throw new Error(`${quoi} « ${cle} » n'a pas de nom dans les textes.`);
  return nom;
}

/** Une pochette seule, droite, telle qu'elle est posée sur le meuble, sans le bois autour : une figure de la planche. */
function pochetteSeule(
  fichier: string,
  titre: string,
  pochette: Pochette,
  taille: number,
  expression: NomDExpression,
  encrier: Encrier,
): ImageDePlanche {
  const { pochette: posee } = dessinerLaPochette(
    pochette,
    { nom: `pochette-${fichier}`, centre: [0, 0], angle: 0, taille, expression },
    encrier.largeur,
  );
  const emprise = empriseDe([posee], encrier.largeur);
  if (emprise === undefined) throw new Error(`La pochette « ${fichier} » ne dessine rien.`);
  const { x, y, largeur, hauteur } = agrandir(emprise, L.marge);
  return { fichier, titre, scene: calque('planche', [posee]), regard: { origine: [x, y], largeur, hauteur } };
}

/** Chaque forme de tête, et chaque chose qu'on porte dessus, sur la pochette d'exemple dont on ne change que ce choix. */
export function imagesDesChoix(textes: Textes, encrier: Encrier): Readonly<Record<ChoixDeLAvatar, ImageDePlanche[]>> {
  const base = pochetteDExemple(textes);
  const noms = { tete: textes.pochette.tetes, dessus: textes.pochette.dessus };
  const de = (choix: ChoixDeLAvatar): ImageDePlanche[] =>
    CLES_DES_CHOIX[choix].map((cle, rang) =>
      pochetteSeule(
        `${choix}-${cle}`,
        nomDans(noms[choix], cle, choix === 'tete' ? 'La tête' : 'Le dessus de tête'),
        { ...base, artiste: textes.pochette.artistes[rang] ?? '', album: '', avatar: { ...base.avatar, [choix]: cle } as Avatar },
        L.tailles.calque,
        'content',
        encrier,
      ),
    );
  return { tete: de('tete'), dessus: de('dessus') };
}

/** Les quatre expressions, sur trois avatars : celui d'exemple, un casque audio, un bonnet. */
export function imagesDesExpressions(textes: Textes, encrier: Encrier): ImageDePlanche[][] {
  const base = pochetteDExemple(textes);
  const avatars: readonly Pochette[] = [
    base,
    { ...base, fond: 'miel', motif: 'damier', avatar: { tete: 'ovale', dessus: 'casque', peau: 'noyer', cheveux: 'expresso', tenue: 'olive' } },
    {
      ...base,
      fond: 'lilasFume',
      motif: 'cercles',
      avatar: { tete: 'large', dessus: 'bonnet', peau: 'kraft', cheveux: 'orangeBrule', tenue: 'rougeTomate' },
    },
  ];
  return avatars.map((pochette, rang) =>
    (Object.keys(EXPRESSIONS) as NomDExpression[]).map((expression) =>
      pochetteSeule(
        `expression-${rang}-${expression}`,
        L.sections.expressions.noms[expression],
        { ...pochette, artiste: textes.pochette.artistes[rang * 5] ?? '', album: '' },
        L.tailles.expression,
        expression,
        encrier,
      ),
    ),
  );
}

/** Les quatre motifs, sur la même pochette. */
export function imagesDesMotifs(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const base: Pochette = {
    ...pochetteDExemple(textes),
    artiste: textes.pochette.artistes[7] ?? '',
    album: textes.pochette.albums[3] ?? '',
    fond: 'vieuxRose',
    avatar: { tete: 'carree', dessus: 'chignon', peau: 'kraft', cheveux: 'lilasFume', tenue: 'bleuFane' },
  };
  return MOTIFS_DE_POCHETTE.map((motif) =>
    pochetteSeule(`motif-${motif}`, nomDans(textes.pochette.motifs, motif, 'Le motif'), { ...base, motif }, L.tailles.calque, 'content', encrier),
  );
}

/** Ce que la touche « Au hasard » tire, douze fois de suite, depuis la même graine. */
export function imagesDuHasard(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const t = tirage(L.graines.auHasard);
  return Array.from({ length: L.tirages }, (_, rang) => {
    const pochette = pochetteAuHasard(t, textes.pochette);
    return pochetteSeule(`hasard-${rang + 1}`, `${pochette.artiste} · ${pochette.album}`, pochette, L.tailles.ecran, 'content', encrier);
  });
}

/** Les douze pochettes d'exemple : tirées au sort, depuis leur propre graine. */
export function pochettesDExemple(textes: Textes): Pochette[] {
  const t = tirage(L.graines.exemples);
  return Array.from({ length: 12 }, () => pochetteAuHasard(t, textes.pochette));
}

/** Les douze pochettes posées sur le noyer, de travers comme en jeu ; et les mêmes en 48 px, en éventail. */
export function imagesDesExemples(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const exemples = pochettesDExemple(textes);
  const G = L.grille;
  const rangs = Math.ceil(exemples.length / G.colonnes);
  const grand: Regard = { origine: [40, 40], largeur: G.colonnes * G.pas[0] + G.marge, hauteur: rangs * G.pas[1] + G.marge };
  const angles = [-6, 4, -3, 8, 5, -8, 3, -5, 7, -4, 6, -7];
  const expressions = Object.keys(EXPRESSIONS) as NomDExpression[];
  const posees = exemples.flatMap((pochette, rang) => {
    const colonne = rang % G.colonnes;
    const ligne = Math.floor(rang / G.colonnes);
    const centre = surLeBois(grand, G.premier[0] + colonne * G.pas[0], G.premier[1] + ligne * G.pas[1]);
    const d = dessinerLaPochette(
      pochette,
      {
        nom: `pochette-exemple-${rang + 1}`,
        centre,
        angle: angles[rang] ?? 4,
        taille: L.tailles.exemple,
        // Comme en jeu : chacun son humeur du moment.
        expression: expressions[(rang * 3) % expressions.length] ?? 'content',
      },
      encrier.largeur,
    );
    return [d.ombre, d.pochette];
  });
  const petit: Regard = { origine: [40, 900], largeur: exemples.length * G.pasEnPetit + 24, hauteur: 80 };
  const eventail = exemples.flatMap((pochette, rang) => {
    const d = dessinerLaPochette(
      pochette,
      {
        nom: `pochette-mini-${rang + 1}`,
        centre: surLeBois(petit, 36 + rang * G.pasEnPetit, 40),
        angle: angles[(rang + 3) % angles.length] ?? 4,
        taille: 48,
        expression: expressions[(rang * 3) % expressions.length] ?? 'content',
      },
      encrier.largeur,
    );
    return [d.ombre, d.pochette];
  });
  const densite = DENSITES.fine;
  return [
    { fichier: 'exemples', titre: L.sections.exemples.titre, scene: dessinerLeMeuble({ regard: grand, densite, objets: posees }), regard: grand },
    {
      fichier: 'exemples-48',
      titre: L.sections.exemples.titre,
      scene: dessinerLeMeuble({ regard: petit, densite, objets: eventail }),
      regard: petit,
    },
  ];
}

/** L'écran « Fais ta pochette », au téléphone, sur le meuble. */
export function imageDeLEcran(textes: Textes, encrier: Encrier): ImageDePlanche {
  const pochette = pochetteAuHasard(tirage(L.graines.auHasard), textes.pochette);
  return dessinerLEcran(pochette, 'dessus', textes, encrier);
}

/** Toutes les images de la planche, pour les contrôles et les tests. */
export function imagesDeLaPochette(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const choix = imagesDesChoix(textes, encrier);
  return [
    imageDeLEcran(textes, encrier),
    ...choix.tete,
    ...choix.dessus,
    ...imagesDesExpressions(textes, encrier).flat(),
    ...imagesDesMotifs(textes, encrier),
    ...imagesDuHasard(textes, encrier),
    ...imagesDesExemples(textes, encrier),
  ];
}
