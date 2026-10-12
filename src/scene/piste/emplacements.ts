/**
 * Les emplacements d'une piste sur le meuble : où est la pochette kraft, où passe le disque qui en sort,
 * sur quoi tombe son ombre, où se colle la pastille du décompte.
 */

import { distance, type Vec2 } from '../../lowpoly/vecteurs';
import { KRAFT } from '../../ressources/kraft';
import { PASTILLES } from '../../ressources/pastilles';
import { PLATINE } from '../../ressources/platine';
import { surLaPochetteKraft } from '../kraft';
import { CENTRE_DU_PLATEAU, HAUTEURS, pointeQuiDepasse, surLeSocle } from '../platine';

/** La pochette kraft, posée de travers devant la platine. */
export const PLACE_DU_KRAFT = { centre: surLeSocle(KRAFT.place.centre), angle: KRAFT.place.angle } as const;

/** Les trois endroits où le disque s'arrête : dans sa pochette, sorti d'elle par son côté ouvert, et sur le plateau. */
export const HALTES_DU_DISQUE = {
  dansLaPochette: { en: PLACE_DU_KRAFT.centre, hauteur: KRAFT.dos },
  sorti: { en: surLaPochetteKraft(PLACE_DU_KRAFT, [-KRAFT.sortie, 0]), hauteur: KRAFT.dos },
  surLePlateau: { en: CENTRE_DU_PLATEAU, hauteur: HAUTEURS.feutrine },
} as const;

/** La pastille du décompte, collée sur le socle près du bras. */
export const PLACE_DE_LA_PASTILLE = { en: surLeSocle(PASTILLES.decompte.en), support: HAUTEURS.socle } as const;

const borner = (x: number): number => Math.min(1, Math.max(0, x));

/** La part d'un rond de ce rayon, centré à cet endroit du meuble, qui est au-dessus du socle : celle de son étendue qui tombe dedans, en largeur puis en profondeur. */
function partAuDessusDuSocle(en: Vec2, rayon: number): number {
  const [x0, y0] = PLATINE.position;
  const { largeur, profondeur } = PLATINE.socle;
  const dedans = (centre: number, de: number, a: number): number =>
    borner((Math.min(a, centre + rayon) - Math.max(de, centre - rayon)) / (2 * rayon));
  return dedans(en[0], x0, x0 + largeur) * dedans(en[1], y0, y0 + profondeur);
}

/**
 * La hauteur de ce qui reçoit l'ombre du disque, au-dessus du bois, quand son centre est à cet endroit du meuble.
 * À cheval sur le bord du socle ou du plateau, son ombre tombe un peu sur chacun : on prend la moyenne, selon la part
 * du disque qui est au-dessus de chaque surface. L'ombre ne saute donc jamais en passant un bord.
 */
export function supportSousLeDisque(en: Vec2): number {
  const rayon = PLATINE.disque.rayon;
  // La part qui est au-dessus du plateau : entière quand il est centré, nulle quand il en est sorti.
  const auDessusDuPlateau = borner(1 - (distance(en, CENTRE_DU_PLATEAU) - (PLATINE.plateau.rayon - rayon)) / (2 * rayon));
  return HAUTEURS.socle * partAuDessusDuSocle(en, rayon) + (HAUTEURS.feutrine - HAUTEURS.socle) * auDessusDuPlateau;
}

/**
 * La hauteur de ce qui reçoit l'ombre de la pastille du décompte, de la même façon : collée, c'est le socle ; quand elle file
 * et passe son bord, c'est peu à peu le bois, plus bas, et son ombre s'en écarte d'autant.
 */
export const supportSousLaPastille = (en: Vec2): number => HAUTEURS.socle * partAuDessusDuSocle(en, PASTILLES.decompte.rayon);

/** Ce dont la pointe de l'axe dépasse du disque : rien tant qu'il n'est pas centré sur elle, ou qu'il passe plus haut qu'elle. */
export const pointeAuDessusDuDisque = (en: Vec2, hauteur: number): number =>
  distance(en, CENTRE_DU_PLATEAU) < PLATINE.axe.centrage ? pointeQuiDepasse(hauteur - HAUTEURS.feutrine) : 0;
