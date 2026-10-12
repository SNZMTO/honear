/**
 * Le disque qu'une main retourne, à la révélation : l'angle dont il a tourné depuis qu'elle l'a pris, la hauteur dont elle le tient
 * au-dessus du plateau pendant ce temps, et l'élan qu'il a encore quand il retombe à plat.
 */

import { retournement, surLEcran } from '../../../lowpoly/projection';
import { porter, tempsDArriveeDuPortage } from '../../../mouvement/portage';
import { AMPLEURS, MATIERES } from '../../../ressources/mouvement';
import { PLATINE } from '../../../ressources/platine';

const M = MATIERES;

/** Ce dont le bord du disque monte ou descend quand il est retourné de cet angle, en px visibles. */
const debattementDuBord = (angle: number): number => retournement(angle).montee * surLEcran([0, PLATINE.disque.rayon])[1];

/** La garde avec laquelle le disque passe au-dessus de la pointe de l'axe quand il commence à se retourner, en px visibles. */
const GARDE = PLATINE.axe.depassement + AMPLEURS.retournement.garde;

/**
 * Ce dont le disque retourné de cet angle est tenu au-dessus du plateau, en px visibles : juste ce qu'il faut pour que son bord
 * passe, et sa garde au-dessus de l'axe, que la main rend à mesure qu'il tourne. Sa hauteur suit son angle : à plat, il est posé.
 */
export const envolDuDisque = (angle: number): number => GARDE * (1 - angle / 180) + Math.abs(debattementDuBord(angle));

/** L'écart d'angle, en degrés, de part et d'autre duquel on mesure une pente. */
const PAS_DE_PENTE = 0.01;
/** Ce dont cette hauteur change par degré : on la mesure de part et d'autre de l'angle, sans sortir de sa course. */
export function penteDeLEnvol(angle: number): number {
  const [avant, apres] = [Math.max(0, angle - PAS_DE_PENTE), Math.min(180, angle + PAS_DE_PENTE)];
  return (envolDuDisque(apres) - envolDuDisque(avant)) / (apres - avant);
}

/** L'angle que vise la main, en degrés : un peu au-delà du plat. */
const VISEE = 180 + AMPLEURS.retournement.audela;
/**
 * Le disque qu'une main retourne, compté depuis l'instant où elle le prend. Il la suit avec son inertie, part donc sans à-coup,
 * et arrive à plat avec de l'élan : c'est le plateau qui l'arrête, net.
 */
export const DISQUE_RETOURNE = porter(0, [{ a: 0, de: VISEE, main: M.main.retourne }], M.vinyle.suit);
/** Le temps qu'il met à retomber à plat, retourné ; la vitesse à laquelle il tourne encore, et celle à laquelle il descend, à cet instant. */
export const A_PLAT: number = tempsDArriveeDuPortage(M.main.retourne, M.vinyle.suit, AMPLEURS.retournement.audela / VISEE);
export const ELAN_A_PLAT = { tourne: DISQUE_RETOURNE.vitesse(A_PLAT), descend: -penteDeLEnvol(180) * DISQUE_RETOURNE.vitesse(A_PLAT) } as const;
/** Son angle, tant que le plateau ne l'a pas arrêté, depuis qu'il a commencé à se retourner. */
export const angleDuDisqueRetourne = (depuis: number): number => Math.min(180, DISQUE_RETOURNE.position(depuis));
