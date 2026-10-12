/**
 * Le chrono : l'angle du bras qui lit l'extrait. Le diamant va du bord du disque à l'étiquette, à vitesse constante ;
 * quand il y arrive, c'est fini.
 */

import { avancementDeLExtrait, type Piste } from '../../regles/piste';
import { AMPLEURS } from '../../ressources/mouvement';
import { angleDuBrasAuRayon } from '../platine';

/** L'angle du bras posé au bord du disque : là où il attend, levé, puis où le diamant se pose. */
export const ANGLE_DU_BRAS_AU_BORD: number = angleDuBrasAuRayon(AMPLEURS.course.de);

/** L'angle du bras à l'instant t de l'extrait. Il s'arrête où il en est à la révélation. */
export function angleDuChrono(piste: Piste, t: number): number {
  const { de, a } = AMPLEURS.course;
  return angleDuBrasAuRayon(de + (a - de) * avancementDeLExtrait(piste, t));
}
