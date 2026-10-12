/**
 * La veine : une longue facette couchée, dont les deux bouts sont coupés court, jamais en pointe.
 * C'est le veinage du noyer, et tout ce qui est un long trait posé à plat sur le meuble.
 */

import type { Vec2 } from '../vecteurs';

/** Contour d'une veine couchée le long de l'axe des x, autour de son milieu. */
export function veine(longueur: number, epaisseur: number): Vec2[] {
  const biseau = Math.min(longueur / 4, epaisseur * 1.3);
  const plat = epaisseur * 0.22;
  const l = longueur / 2;
  const e = epaisseur / 2;
  return [
    [-l + biseau, -e],
    [l - biseau, -e],
    [l, -plat],
    [l, plat],
    [l - biseau, e],
    [-l + biseau, e],
    [-l, plat],
    [-l, -plat],
  ];
}
