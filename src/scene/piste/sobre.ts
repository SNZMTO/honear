/**
 * La version sobre d'une piste, pour qui a demandé de réduire les animations : les pièces changent de place d'un coup,
 * comme des images imprimées. Le disque ne tourne pas et garde ses arcs jusqu'à la révélation ; le bras avance quand même,
 * parce que c'est le chrono. Chaque pose est celle où la version animée finit par s'arrêter ; une rayure tient en deux images.
 */

import { rayeLeDisque } from '../../regles/piste';
import { AMPLEURS, TEMPS } from '../../ressources/mouvement';
import { PLATINE } from '../../ressources/platine';
import { seulement } from '../etiquette/fondu';
import { ANGLE_DU_BRAS_AU_BORD, angleDuChrono } from './chrono';
import { chiffreDeLaPastille } from './decompte';
import { HALTES_DU_DISQUE } from './emplacements';
import type { PisteEnScene } from './etat';
import { instantsDeLaPiste } from './instants';
import { POSE_AVANT_LA_PISTE, type PoseDeLaPiste } from './pose';

export function poseSobre(scene: PisteEnScene, t: number): PoseDeLaPiste {
  const { piste } = scene;
  if (piste === undefined) return POSE_AVANT_LA_PISTE;
  const T = instantsDeLaPiste(piste);
  if (t < T.trois) return POSE_AVANT_LA_PISTE;

  const revele = t >= T.revelation;
  const attend = t >= T.un && t < T.extrait;
  const lit = t >= T.extrait && !revele;
  // Une rayure, en deux images imprimées : les arcs du disque reculent d'un coup, le temps que la main le tienne, puis reviennent.
  const raye = lit && scene.rayuresA.some((a) => rayeLeDisque(piste, a) && a <= t && t < a + TEMPS.rayure.mainLache);
  return {
    disque: {
      ...HALTES_DU_DISQUE.surLePlateau,
      retourne: revele ? 180 : 0,
      // Les arcs paraissent et repartent d'un coup : en version sobre, l'étiquette n'a pas de fondu.
      etiquette: { angle: 0, angleDesArcs: raye ? -AMPLEURS.rayure.recul : 0, ...seulement(t >= T.deux && !revele ? 'arcsLongs' : 'texte') },
    },
    reperes: 0,
    bras: attend ? { angle: ANGLE_DU_BRAS_AU_BORD, leve: AMPLEURS.brasLeve } : { angle: lit ? angleDuChrono(piste, t) : PLATINE.bras.repos, leve: 0 },
    levier: attend ? 1 : 0,
    // La pastille du décompte, collée, montre son chiffre jusqu'à ce que l'extrait parte ; elle ne file pas : elle n'est plus là.
    pastille: { ...POSE_AVANT_LA_PISTE.pastille, montre: t < T.extrait ? chiffreDeLaPastille(scene, t) : undefined, hauteur: 0, echelle: 1 },
    kraft: { entrainee: AMPLEURS.entrainementDuKraft },
    regard: revele ? AMPLEURS.regardSurLaReponse : 0,
  };
}
