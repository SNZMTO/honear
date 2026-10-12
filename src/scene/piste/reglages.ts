/**
 * Le réglage d'une piste : ce que le mouvement change, d'une image à la suivante, à une piste déjà dessinée.
 * Chaque objet dit lui-même ce qui se règle chez lui ; ce module les réunit, comme le dessin les assemble.
 */

import type { Densite } from '../../ressources/densites';
import type { Calque } from '../calque';
import { reglerLeDisque } from '../disque';
import { reglerLaPochetteKraft } from '../kraft';
import { reglerUnePastille } from '../pastille';
import { reglerLaPlatine } from '../platine';
import { calquesParNom, type Reglage } from '../reglage';
import { CHIFFRES_DU_DECOMPTE, disqueDeLaPiste, kraftDeLaPiste, pastilleDuDecompte, platineDeLaPiste } from './pieces';
import { POSE_AVANT_LA_PISTE, type PoseDeLaPiste } from './pose';

/**
 * La pose dans laquelle dessiner une piste qu'on réglera ensuite. Si ses ombres ne s'animent pas, leurs paliers gardent
 * l'écart qu'on leur dessine : on la dessine donc avec chaque pièce posée sur ce qui la porte, la pastille du décompte
 * collée, alors qu'elle arrive d'un peu plus haut.
 * @param ombresFigees vrai quand l'appareil peine. Voir `regleurDeLaPiste`.
 */
export const poseDeDepart = (ombresFigees: boolean): PoseDeLaPiste =>
  ombresFigees ? { ...POSE_AVANT_LA_PISTE, pastille: { ...POSE_AVANT_LA_PISTE.pastille, hauteur: 0, echelle: 1 } } : POSE_AVANT_LA_PISTE;

/**
 * @param dessinee la scène où la piste est dessinée : dans n'importe quelle pose, ou dans sa pose de départ si ses ombres sont figées.
 * @param ombresFigees vrai quand l'appareil peine : les ombres suivent encore leurs pièces et s'en éloignent quand elles montent,
 * mais d'un bloc ; leurs paliers ne s'écartent plus les uns des autres.
 * @returns de quoi la régler : pour une pose, tous les réglages qui l'y amènent.
 */
export function regleurDeLaPiste(dessinee: Calque, densite: Densite, ombresFigees = false): (pose: PoseDeLaPiste) => Reglage[] {
  const bras = calquesParNom(dessinee).get('bras');
  if (bras === undefined) throw new Error('La scène à régler n’a pas de bras : ce n’est pas une piste.');
  const tous = (pose: PoseDeLaPiste): Reglage[] => [
    ...reglerLaPochetteKraft(kraftDeLaPiste(pose)),
    ...reglerLeDisque(disqueDeLaPiste(pose), densite),
    ...reglerLaPlatine(platineDeLaPiste(pose), densite, bras),
    ...reglerUnePastille(pastilleDuDecompte(pose), CHIFFRES_DU_DECOMPTE),
  ];
  return ombresFigees ? (pose) => tous(pose).filter((reglage) => !('ecarteLesPaliers' in reglage)) : tous;
}
