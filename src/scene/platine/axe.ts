/**
 * L'axe du plateau, en deux morceaux. L'axe entier sort de la feutrine : on le voit quand le plateau est vide,
 * et un disque qui passe au-dessus le cache. Sa pointe est ce qui dépasse d'un disque enfilé sur lui : elle se dessine
 * par-dessus l'étiquette, et sort du trou à mesure que le disque descend. Son dessus ne bouge pas ; son flanc s'allonge
 * vers le bas, jusqu'au disque, et son ombre s'allonge avec lui.
 */

import { cercle } from '../../lowpoly/contours';
import { peindre, type FacettePeinte } from '../../lowpoly/facette';
import { prisme } from '../../lowpoly/formes/boite';
import { plusPetitAngle } from '../../lowpoly/polygones';
import { hauteurPour, surLEcran, type Matrice } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { calque, peinture, type Calque } from '../calque';
import { ombre, ombreAuPied, reglerUneOmbre, type OmbreMobile } from '../ombre';
import { deformation, glissement, visibilite, type Reglage } from '../reglage';
import { CENTRE_DU_PLATEAU, HAUTEURS } from './emplacements';

const A = PLATINE.axe;
/** Le sommet de l'axe, au-dessus du bois, en px visibles : il dépasse d'un disque posé. */
const SOMMET = HAUTEURS.disque + A.depassement;
/** Ce que son chanfrein prend de sa hauteur, en px visibles ; le reste est son flanc, droit. */
const CHANFREIN = A.chanfrein / hauteurPour(1);
const FLANC = A.depassement - CHANFREIN;
/** Ce dont le pied du flanc passe sous lui, en px : les deux se recouvrent, et aucun jour ne passe entre eux. */
const RECOUVREMENT = 0.75;

export interface AxeDessine {
  /** L'axe entier, depuis la feutrine : il se dessine sous le disque. */
  readonly axe: Calque;
  /** Sa pointe, depuis le dessus d'un disque enfilé : elle se dessine sur le disque. */
  readonly pointe: Calque;
}

const contourDeLAxe = (densite: Densite): Vec2[] => cercle(CENTRE_DU_PLATEAU, A.rayon, densite.pansDePetitRond);

/** L'axe entier, de la feutrine à son sommet, avec son ombre au pied : du décor. */
function axeEntier(densite: Densite): Calque {
  const contour = contourDeLAxe(densite);
  const hauteur = SOMMET - HAUTEURS.feutrine;
  return calque(
    'axe',
    [
      ombreAuPied('axe/ombre', { silhouettes: [contour], hauteur, support: HAUTEURS.feutrine, paliers: 2 }),
      peinture(peindre(prisme({ contour, base: HAUTEURS.feutrine, epaisseur: hauteur, chanfrein: A.chanfrein, teinte: 'alu' }))),
    ],
    { role: 'decor' },
  );
}

/**
 * Ce dont la pointe de l'axe dépasse d'un disque centré sur lui, en px visibles : tout son dépassement quand le disque est posé,
 * un rien de plus quand il tasse la feutrine, de moins en moins à mesure qu'il se soulève, plus rien quand son dessus passe
 * le sommet de l'axe.
 * @param hauteurAuDessusDuPlateau la hauteur du dessous du disque au-dessus de la feutrine.
 */
export const pointeQuiDepasse = (hauteurAuDessusDuPlateau: number): number => Math.max(0, A.depassement - hauteurAuDessusDuPlateau);

/**
 * Où en est le flanc de la pointe : la part de sa longueur qui est sortie du disque. 0 : seul son dessus dépasse, il sort le premier ;
 * 1 : le disque est posé ; un rien de plus : le disque tasse la feutrine, et le flanc descend avec lui.
 */
const partDuFlanc = (depasse: number): number => Math.max(0, (depasse - CHANFREIN) / FLANC);

/** Le centre de l'axe à l'écran, à la hauteur où finit son flanc et où commence son chanfrein. */
const EPAULE: Vec2 = surLEcran(CENTRE_DU_PLATEAU, SOMMET - CHANFREIN);

const allongement = (part: number): Matrice => [1, 0, 0, part];
const piedDuFlanc = (part: number): Vec2 => [EPAULE[0], EPAULE[1] + part * FLANC];

/** L'ombre que la pointe porte sur le disque : celle de ce qui en dépasse, et pas plus. */
function ombreDeLaPointe(depasse: number, densite: Densite): OmbreMobile {
  return {
    en: CENTRE_DU_PLATEAU,
    silhouettes: [cercle([0, 0], A.rayon, densite.pansDePetitRond)],
    hauteur: depasse,
    support: SOMMET - depasse,
    paliers: 2,
  };
}

/**
 * La pointe. Son flanc est fait, pan par pan, d'une bande droite qu'on allonge et d'un pied arrondi qu'on descend d'autant :
 * ensemble, ils dessinent le flanc du même axe coupé à n'importe quelle hauteur, sans redessiner un polygone.
 */
function pointe(densite: Densite, depasse: number): Calque {
  const contour = contourDeLAxe(densite);
  const dessus = peindre(prisme({ contour, base: SOMMET - CHANFREIN, epaisseur: CHANFREIN, chanfrein: A.chanfrein, teinte: 'alu' }));
  const flanc = peindre(prisme({ contour, base: HAUTEURS.disque, epaisseur: FLANC, chanfrein: 0, teinte: 'alu', ouvert: true }));
  const bandes: FacettePeinte[] = [];
  const pieds: FacettePeinte[] = [];
  for (const pan of flanc) {
    // Un pan du flanc, à l'écran : deux arêtes droites, l'une à gauche, l'autre à droite, qui montent de sa longueur.
    const [gauche, droite] = [Math.min(...pan.contour.map((p) => p[0])) - EPAULE[0], Math.max(...pan.contour.map((p) => p[0])) - EPAULE[0]];
    const hautDe = (x: number): number => Math.min(...pan.contour.filter((p) => Math.abs(p[0] - EPAULE[0] - x) < 1e-6).map((p) => p[1])) - EPAULE[1];
    const bande: Vec2[] = [
      [gauche, 0],
      [droite, 0],
      [droite, FLANC],
      [gauche, FLANC],
    ];
    const pied: Vec2[] = [
      [gauche, -RECOUVREMENT],
      [droite, -RECOUVREMENT],
      [droite, hautDe(droite)],
      [gauche, hautDe(gauche)],
    ];
    bandes.push({ ...pan, contour: bande, angle: plusPetitAngle(bande) });
    pieds.push({ ...pan, contour: pied, angle: plusPetitAngle(pied) });
  }
  const part = partDuFlanc(depasse);
  return calque(
    'axe/pointe',
    [
      ombre('axe/pointe/ombre', ombreDeLaPointe(depasse, densite)),
      calque('axe/pointe/pied', [peinture(pieds)], { transformations: [{ genre: 'glisser', de: piedDuFlanc(part) }] }),
      calque('axe/pointe/flanc', [peinture(bandes)], {
        transformations: [
          { genre: 'glisser', de: EPAULE },
          { genre: 'deformer', par: allongement(part) },
        ],
      }),
      peinture(dessus),
    ],
    { role: 'mobile', opacite: depasse > 0 ? 1 : 0 },
  );
}

/** @param depasse ce dont la pointe dépasse du disque enfilé sur l'axe (voir `pointeQuiDepasse`) : rien si le plateau est vide. */
export function dessinerLAxe(densite: Densite, depasse: number): AxeDessine {
  return { axe: axeEntier(densite), pointe: pointe(densite, depasse) };
}

/** Ce que le mouvement règle sur l'axe déjà dessiné : sa pointe se montre dès qu'elle dépasse, son flanc et son ombre s'allongent. */
export function reglerLAxe(depasse: number, densite: Densite): Reglage[] {
  const part = partDuFlanc(depasse);
  return [
    visibilite('axe/pointe', depasse > 0),
    ...reglerUneOmbre('axe/pointe/ombre', ombreDeLaPointe(depasse, densite)),
    glissement('axe/pointe/pied', 0, piedDuFlanc(part)),
    deformation('axe/pointe/flanc', 1, allongement(part)),
  ];
}
