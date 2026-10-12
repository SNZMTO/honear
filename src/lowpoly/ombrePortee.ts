/**
 * Les ombres portées : deux ou trois paliers de plus en plus légers, sans flou.
 * Chaque palier est la silhouette de l'objet, décalée vers le bas à droite. Là où les paliers
 * se recouvrent, l'ombre fonce. Plus l'objet est haut, plus les paliers s'écartent :
 * les ombres disent la hauteur.
 */

import { LAMPE } from '../ressources/lampe';
import { aireSignee, type Polygone } from './polygones';
import { retournement, surLEcran, type Matrice } from './projection';
import { radians, scalaire, unitaire, type Vec2 } from './vecteurs';

/** Sens de l'ombre dans le plan du meuble : à l'opposé de la lampe. */
const SENS_AU_SOL: Vec2 = unitaire([-LAMPE.versLaLampe[0], -LAMPE.versLaLampe[1]]);
/** Le même sens, vu à l'écran (la profondeur est écrasée). */
const SENS_A_L_ECRAN: Vec2 = unitaire(surLEcran(SENS_AU_SOL));

/**
 * Épaisseur d'une silhouette le long de l'ombre, en px : sa surface, rapportée à la place qu'elle prend en travers.
 * @param silhouette contour convexe, tel qu'on le voit à l'écran.
 */
export function epaisseurLeLongDeLOmbre(silhouette: Polygone): number {
  const enTravers = silhouette.map((p) => scalaire(p, [-SENS_A_L_ECRAN[1], SENS_A_L_ECRAN[0]]));
  const place = Math.max(...enTravers) - Math.min(...enTravers);
  return place > 0 ? Math.abs(aireSignee(silhouette)) / place : 0;
}

/**
 * Décalage de chaque palier à l'écran, en px, pour un objet dont le dessus est
 * à `hauteur` px visibles au-dessus de la surface qui reçoit l'ombre.
 * @param epaisseur épaisseur de la plus fine des silhouettes, le long de l'ombre. Les paliers ne s'écartent jamais
 *   au point de se décoller : sous un objet plus fin que son ombre n'est longue, ils se resserrent vers le plus lointain.
 */
export function decalagesDOmbre(hauteur: number, paliers: 2 | 3 = 3, epaisseur = Infinity): Vec2[] {
  const parts = paliers === 3 ? LAMPE.ombre.paliers : LAMPE.ombre.paliers.slice(1);
  const portee = Math.max(0, hauteur) * LAMPE.ombre.allongement;
  const ecart = portee * (1 - Math.min(...parts));
  const serrage = ecart > 0 ? Math.min(1, (epaisseur * (1 - LAMPE.ombre.coeur)) / ecart) : 1;
  return parts.map((part): Vec2 => {
    const distance = portee * (1 - (1 - part) * serrage);
    return [SENS_A_L_ECRAN[0] * distance, SENS_A_L_ECRAN[1] * distance];
  });
}

/**
 * Ce dont chaque palier d'une ombre s'éloigne quand l'objet monte d'un px, à l'écran : c'est ce qui dit,
 * pour une pièce qu'on penche ou qu'on retourne, de combien l'ombre de chacun de ses points se déplace avec sa hauteur.
 */
export function decalagesParPxDeHauteur(hauteur: number, paliers: 2 | 3 = 3, epaisseur = Infinity): Vec2[] {
  const ici = decalagesDOmbre(hauteur, paliers, epaisseur);
  return decalagesDOmbre(hauteur + 1, paliers, epaisseur).map((plusHaut, i): Vec2 => {
    const de = ici[i] ?? [0, 0];
    return [plusHaut[0] - de[0], plusHaut[1] - de[1]];
  });
}

/**
 * L'ombre d'un disque qu'on retourne (voir `retournement`) : la déformation à donner à sa silhouette posée à plat,
 * pour un palier qui s'éloigne de `parPx` par px de hauteur. Le bord qui se lève porte son ombre plus loin ;
 * l'ombre ne devient un trait que lorsque le disque est dans l'axe de la lampe, bien après qu'on l'a vu de profil.
 */
export function ombreDUnDisqueRetourne(angle: number, parPx: Vec2): Matrice {
  const { montee } = retournement(angle);
  return [1, 0, parPx[0] * montee, Math.cos(radians(angle)) + parPx[1] * montee];
}
