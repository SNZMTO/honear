/**
 * Les transformations d'un calque, écrites pour chacun de ceux qui les lisent : le SVG, le CSS d'un navigateur,
 * et, en matrice, la toile où l'on fige une pièce. C'est ici, et seulement ici, que l'écrasement de la projection
 * devient une écriture.
 */

import { ECRASEMENT } from '../../lowpoly/projection';
import { radians, type Vec2 } from '../../lowpoly/vecteurs';
import type { Transformation } from '../calque';
import { nombre, nombreFin } from './nombre';

/** Une transformation affine du plan : x′ = a·x + c·y + e, y′ = b·x + d·y + f. L'ordre est celui d'une matrice SVG, CSS ou de toile. */
export type Affine = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const SANS_EFFET: Affine = [1, 0, 0, 1, 0, 0];

export function affineDe(t: Transformation): Affine {
  switch (t.genre) {
    case 'glisser':
      return [1, 0, 0, 1, t.de[0], t.de[1]];
    case 'ecraser':
      return [1, 0, 0, ECRASEMENT, 0, 0];
    case 'tourner': {
      const [c, s] = [Math.cos(radians(t.de)), Math.sin(radians(t.de))];
      return [c, s, -s, c, 0, 0];
    }
    case 'deformer':
      return [...t.par, 0, 0];
  }
}

/** Deux transformations à la suite : `dedans` s'applique d'abord aux points, puis `dehors`, comme deux groupes emboîtés. */
export const composer = (dehors: Affine, dedans: Affine): Affine => [
  dehors[0] * dedans[0] + dehors[2] * dedans[1],
  dehors[1] * dedans[0] + dehors[3] * dedans[1],
  dehors[0] * dedans[2] + dehors[2] * dedans[3],
  dehors[1] * dedans[2] + dehors[3] * dedans[3],
  dehors[0] * dedans[4] + dehors[2] * dedans[5] + dehors[4],
  dehors[1] * dedans[4] + dehors[3] * dedans[5] + dehors[5],
];

/** Toutes les transformations d'un calque, de la première (la plus en dehors) à la dernière, en une seule. */
export const affineDeToutes = (transformations: readonly Transformation[]): Affine =>
  transformations.reduce((cumul: Affine, t) => composer(cumul, affineDe(t)), SANS_EFFET);

export const appliquer = (m: Affine, p: Vec2): Vec2 => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

/** Pour l'attribut `transform` d'un groupe SVG. */
export function enSvg(t: Transformation): string {
  switch (t.genre) {
    case 'glisser':
      return `translate(${nombre(t.de[0])} ${nombre(t.de[1])})`;
    case 'ecraser':
      return `scale(1 ${ECRASEMENT})`;
    case 'tourner':
      return `rotate(${nombre(t.de)})`;
    case 'deformer':
      return `matrix(${t.par.map(nombreFin).join(' ')} 0 0)`;
  }
}

/** Pour la propriété `transform` d'un élément : les mêmes, avec leurs unités. */
export function enCss(t: Transformation): string {
  switch (t.genre) {
    case 'glisser':
      return `translate(${nombre(t.de[0])}px,${nombre(t.de[1])}px)`;
    case 'ecraser':
      return `scale(1,${ECRASEMENT})`;
    case 'tourner':
      return `rotate(${nombre(t.de)}deg)`;
    case 'deformer':
      return `matrix(${t.par.map(nombreFin).join(',')},0,0)`;
  }
}

/** Une transformation affine quelconque, pour le CSS. */
export const affineEnCss = (m: Affine): string => `matrix(${m.slice(0, 4).map(nombreFin).join(',')},${nombre(m[4])},${nombre(m[5])})`;
