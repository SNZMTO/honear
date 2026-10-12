/**
 * Le carton d'une pochette : un carré aux coins arrondis, dont les bords biseautés accrochent la lampe
 * et dont les coins sont un peu usés. Tout est dessiné autour du centre de la pochette.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { cercle, rectangleArrondi } from '../../lowpoly/contours';
import { facetteAPlat, peindre, VUE_DE_DESSUS } from '../../lowpoly/facette';
import { bandesDeChanfrein } from '../../lowpoly/formes/boite';
import { cransDeLaPente } from '../../lowpoly/ombrage';
import { decouper, type Polygone } from '../../lowpoly/polygones';
import { normaleDeNewell, type Vec2 } from '../../lowpoly/vecteurs';
import { MESURES_DE_POCHETTE as M } from '../../ressources/pochettes';
import { peinture, type Dessin } from '../calque';
import { deplacerLesTons, rogner } from '../retouche';

/** Le contour du carton d'une pochette de ce côté. */
export const contourDuCarton = (cote: number): Vec2[] => rectangleArrondi(-cote / 2, -cote / 2, cote, cote, (M.coin * cote) / M.cote, M.pansDeCoin);

/**
 * Le chanfrein : sur chaque bord, une fine bande où l'image imprimée prend le ton que la lampe donne à cette pente.
 * Plus claire en haut et à gauche, plus sombre en bas et à droite, quelle que soit la couleur imprimée dessous.
 */
export function chanfreinDuCarton(imprime: readonly Dessin[], carton: Polygone, largeur: number): Dessin[] {
  return bandesDeChanfrein(carton, largeur).flatMap((bande) => {
    const [p0, p1, q1, q0] = bande;
    // Le biseau descend du dedans vers le bord, à 45°.
    const normale = normaleDeNewell([
      [p0[0], p0[1], 0],
      [p1[0], p1[1], 0],
      [q1[0], q1[1], largeur],
      [q0[0], q0[1], largeur],
    ]);
    return deplacerLesTons(rogner(imprime, bande), cransDeLaPente(normale));
  });
}

/**
 * Les coins usés : à un coin, l'impression est partie en rond, comme sous un pouce, et laisse voir le carton,
 * un ton plus sombre que le papier neuf. Un rond centré sur le coin rejoint les deux bords à angle droit : aucune pointe.
 * @param germe ce qui distingue une pochette d'une autre (son nom d'artiste) : la même pochette a toujours la même usure.
 */
export function coinsUses(germe: string, cote: number, carton: Polygone): Dessin {
  // Le nom, réduit à un nombre : chaque signe y compte, à son rang.
  let graine = 0;
  for (const signe of germe) graine = (graine * 31 + (signe.codePointAt(0) ?? 0)) >>> 0;
  const tirage = hasard(graine);
  const demi = cote / 2;
  const taille = (M.usure.taille * cote) / M.cote;
  const coins: readonly Vec2[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const usures = coins.flatMap(([sx, sy]) => {
    if (tirage.suivant() < M.usure.epargne) return [];
    const rayon = taille * tirage.entre(M.usure.auMoins, 1);
    const usure = decouper(cercle([sx * demi, sy * demi], rayon, M.usure.pans), carton);
    return usure.length >= 3 ? [usure] : [];
  });
  return peinture(
    peindre(
      usures.map((usure) => facetteAPlat(usure, 0, 'creme', -1)),
      VUE_DE_DESSUS,
    ),
  );
}
