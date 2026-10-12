/**
 * Les pièces d'une piste dans une pose donnée : ce que chaque objet doit savoir pour se dessiner, ou pour se régler.
 * Le dessin et le réglage lisent la pose ici, tous les deux : ils ne peuvent pas la comprendre différemment.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import { PASTILLES } from '../../ressources/pastilles';
import { PLATINE } from '../../ressources/platine';
import { DEROULE } from '../../ressources/reglages';
import type { PoseDeDisque } from '../disque';
import { estPrisDansLaPochette, type Kraft } from '../kraft';
import type { PoseDePastille } from '../pastille';
import type { PoseDeLaPlatine } from '../platine';
import { PLACE_DE_LA_PASTILLE, PLACE_DU_KRAFT, pointeAuDessusDuDisque, supportSousLaPastille, supportSousLeDisque } from './emplacements';
import type { PoseDeLaPiste } from './pose';

/** Les chiffres que la pastille du décompte peut montrer : une face par chiffre. */
export const CHIFFRES_DU_DECOMPTE: readonly string[] = Array.from({ length: DEROULE.decompte.de }, (_, i) => String(i + 1));

/** Le disque mystère : son ombre tombe sur ce qu'il survole, jamais plus haut que lui. */
export const disqueDeLaPiste = (pose: PoseDeLaPiste): PoseDeDisque => ({
  en: pose.disque.en,
  hauteur: pose.disque.hauteur,
  support: Math.min(pose.disque.hauteur, supportSousLeDisque(pose.disque.en)),
  retourne: pose.disque.retourne,
  etiquette: pose.disque.etiquette,
});

/** La pastille du décompte, sur le socle près du bras ; décollée, elle file vers la droite, passe le bord du socle, et son ombre tombe sur le bois. */
export function pastilleDuDecompte(pose: PoseDeLaPiste): PoseDePastille {
  const en: Vec2 = [PLACE_DE_LA_PASTILLE.en[0] + pose.pastille.glisse, PLACE_DE_LA_PASTILLE.en[1]];
  return {
    nom: 'pastille-decompte',
    en,
    support: PLACE_DE_LA_PASTILLE.support,
    survole: supportSousLaPastille(en),
    rayon: PASTILLES.decompte.rayon,
    montre: pose.pastille.montre,
    enLAir: { hauteur: pose.pastille.hauteur, echelle: pose.pastille.echelle },
  };
}

export const platineDeLaPiste = (pose: PoseDeLaPiste): PoseDeLaPlatine => ({
  reperes: pose.reperes,
  bras: pose.bras,
  levier: pose.levier,
  pointeDeLAxe: pointeAuDessusDuDisque(pose.disque.en, pose.disque.hauteur),
});

/** La pochette kraft, à sa place devant la platine : ce dont le disque l'a entraînée, et s'il est encore pris dedans. */
export const kraftDeLaPiste = (pose: PoseDeLaPiste): Pick<Kraft, 'centre' | 'angle' | 'entrainee' | 'disqueDedans'> => ({
  ...PLACE_DU_KRAFT,
  entrainee: pose.kraft.entrainee,
  disqueDedans: estPrisDansLaPochette(PLACE_DU_KRAFT, { en: pose.disque.en, rayon: PLATINE.disque.rayon, hauteur: pose.disque.hauteur }),
});
