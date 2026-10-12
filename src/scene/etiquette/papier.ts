/**
 * Le papier d'une étiquette de disque, sans rien d'écrit : couleur miel, son bord, sa bague de pressage, son trou.
 * Dessiné vu de dessus, autour de son centre. C'est le fond commun à tout ce qu'une étiquette peut afficher.
 */

import { anneau, cercle } from '../../lowpoly/contours';
import { tonAPlat } from '../../lowpoly/ombrage';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { ETIQUETTE } from '../../ressources/etiquette';
import { PLATINE } from '../../ressources/platine';
import { aplat, type Dessin } from '../calque';

export interface Etiquette {
  /** Rayon de l'étiquette, en px. */
  readonly rayon: number;
  /** Nombre de pans : assez pour qu'elle reste ronde à cette taille. */
  readonly pans: number;
}

/** Une étiquette est toujours dessinée autour de son propre centre : son calque la pose sur le disque. */
export const CENTRE_DE_L_ETIQUETTE: Vec2 = [0, 0];

/**
 * Ce qu'une étiquette de ce rayon est à celle du disque de la platine : son échelle.
 * L'échelle typographique vaut telle quelle sur la platine ; ailleurs, les textes la multiplient par cette échelle.
 */
export const echelleDEtiquette = (e: Etiquette): number => e.rayon / PLATINE.disque.etiquette;

/** Le trou de l'axe, au centre d'une étiquette ou de ce qui en tient lieu : on y voit le vinyle. */
export function trouDeLAxe(e: Etiquette): Dessin {
  const rayon = (PLATINE.axe.rayon + PLATINE.axe.jeu) * echelleDEtiquette(e);
  return aplat([cercle(CENTRE_DE_L_ETIQUETTE, rayon, Math.max(10, Math.round(e.pans / 4)))], 'vinyle', tonAPlat(-1));
}

export function papierDEtiquette(e: Etiquette): Dessin[] {
  const r = e.rayon;
  const { bord, bague } = ETIQUETTE;
  return [
    aplat([cercle(CENTRE_DE_L_ETIQUETTE, r, e.pans)], 'miel', tonAPlat()),
    // Le bord du papier et la bague de pressage : deux filets un ton plus sombre.
    aplat(
      [
        ...anneau(CENTRE_DE_L_ETIQUETTE, r, r * (1 - bord), e.pans),
        ...anneau(CENTRE_DE_L_ETIQUETTE, r * bague.rayon, r * (bague.rayon - bague.epaisseur), e.pans),
      ],
      'miel',
      tonAPlat(-1),
    ),
    trouDeLAxe(e),
  ];
}
