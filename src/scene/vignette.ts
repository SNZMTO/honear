/**
 * La vignette : ce qui tient lieu de vraie pochette dans les maquettes et le prototype. Une couleur et un motif,
 * imprimés à plat et rognés à la forme qu'on lui donne : un rond sur un disque, un carré ailleurs.
 */

import { peindre, VUE_DE_DESSUS } from '../lowpoly/facette';
import { tonAPlat } from '../lowpoly/ombrage';
import type { Polygone } from '../lowpoly/polygones';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Vignette } from '../ressources/vignettes';
import { aplat, peinture, type Dessin } from './calque';
import { MOTIFS } from './pochette/motifs';
import { rogner } from './retouche';

/**
 * @param contour la forme de la vignette, convexe, dans le plan où elle est imprimée.
 * @param origine d'où part son motif.
 * @param cote la taille qu'elle doit couvrir : le motif est dessiné assez large pour elle.
 */
export function dessinerUneVignette(vignette: Vignette, contour: Polygone, origine: Vec2, cote: number): Dessin[] {
  const motif = peinture(peindre(MOTIFS[vignette.motif].dessiner(vignette.fond, origine, cote), VUE_DE_DESSUS));
  return [aplat([contour], vignette.fond, tonAPlat()), ...rogner([motif], contour)];
}
