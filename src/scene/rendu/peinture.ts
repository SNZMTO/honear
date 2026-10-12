/**
 * Ce que partagent ceux qui peignent une scène, en SVG ou sur une toile : le liseré qui recouvre les joints,
 * et l'ordre dans lequel se peignent les facettes d'une peinture.
 */

import type { FacettePeinte } from '../../lowpoly/facette';
import { couleur } from '../../lowpoly/tons';

/**
 * Largeur du liseré de même couleur posé sur chaque facette : il recouvre le joint
 * entre deux tons voisins, sinon le fond transparaît en fil clair à l'anticrénelage.
 */
export const LISERE = 0.6;

/** Les facettes d'une peinture ne se recouvrent pas : on les peint par couleur, dans l'ordre où chaque couleur apparaît. */
export function parCouleur(facettes: readonly FacettePeinte[]): Map<string, FacettePeinte[]> {
  const groupes = new Map<string, FacettePeinte[]>();
  for (const f of facettes) {
    const c = couleur(f.teinte, f.ton);
    const groupe = groupes.get(c);
    if (groupe === undefined) groupes.set(c, [f]);
    else groupe.push(f);
  }
  return groupes;
}
