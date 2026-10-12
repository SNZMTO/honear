/**
 * Les retouches d'un dessin déjà fait : n'en garder que ce qui tombe dans une fenêtre, ou déplacer ses tons.
 * C'est ainsi qu'une image imprimée s'arrête au bord de son carton, et change de ton là où le carton est biseauté.
 */

import { nuancer } from '../lowpoly/ombrage';
import { decouper, plusPetitAngle, type Polygone } from '../lowpoly/polygones';
import { peinture, type Dessin } from './calque';

/**
 * Ne garde des facettes et des aplats que ce qui tombe dans une fenêtre convexe.
 * Les textes et les calques passent tels quels : on ne coupe pas une lettre en deux.
 */
export function rogner(dessins: readonly Dessin[], fenetre: Polygone): Dessin[] {
  return dessins.flatMap((dessin): Dessin[] => {
    switch (dessin.genre) {
      case 'peinture': {
        const facettes = dessin.facettes.flatMap((f) => {
          const contour = decouper(f.contour, fenetre);
          // Une facette rognée n'a plus les angles qu'elle avait : on les mesure sur ce qu'il en reste.
          return contour.length >= 3 ? [{ ...f, contour, angle: plusPetitAngle(contour) }] : [];
        });
        return facettes.length > 0 ? [peinture(facettes)] : [];
      }
      case 'aplat': {
        const contours = dessin.contours.map((c) => decouper(c, fenetre)).filter((c) => c.length >= 3);
        return contours.length > 0 ? [{ ...dessin, contours }] : [];
      }
      default:
        return [dessin];
    }
  });
}

/** Déplace d'un nombre de crans le ton des facettes et des aplats, sans sortir des 5 tons. Les textes et les calques n'en sont pas. */
export function deplacerLesTons(dessins: readonly Dessin[], crans: number): Dessin[] {
  return dessins.flatMap((dessin): Dessin[] => {
    switch (dessin.genre) {
      case 'peinture':
        return [peinture(dessin.facettes.map((f) => ({ ...f, ton: nuancer(f.ton, crans) })))];
      case 'aplat':
        return [{ ...dessin, ton: nuancer(dessin.ton, crans) }];
      default:
        return [];
    }
  });
}
