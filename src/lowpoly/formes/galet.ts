/**
 * Le galet : un contour à plat, et un sommet un peu plus haut d'où partent autant de facettes que le contour a de côtés.
 * C'est la forme taillée la plus simple qui prenne la lumière : chaque facette a sa pente, donc son ton.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { auRang } from '../boucle';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { aireSignee, type Polygone } from '../polygones';
import type { Vec2, Vec3 } from '../vecteurs';

export interface Galet {
  readonly contour: Polygone;
  /** Le sommet, vu de dessus : à l'intérieur du contour. */
  readonly sommet: Vec2;
  /** Sa hauteur au-dessus du contour, dans la même unité. */
  readonly relief: number;
  readonly teinte: NomDeTeinte;
  readonly nuance?: Nuance;
}

export function galet(g: Galet): Maille {
  if (g.contour.length < 3) throw new Error(`Un galet a au moins trois côtés : ${g.contour.length}.`);
  const pointe: Vec3 = [g.sommet[0], g.sommet[1], g.relief];
  const facettes: Facette[] = [];
  for (let i = 0; i < g.contour.length; i++) {
    const a = auRang(g.contour, i);
    const b = auRang(g.contour, i + 1);
    const sommets: Vec3[] = [pointe, [a[0], a[1], 0], [b[0], b[1], 0]];
    const aire = aireSignee(sommets.map((s): Vec2 => [s[0], s[1]]));
    if (Math.abs(aire) < 0.01) continue;
    facettes.push({ sommets: aire < 0 ? sommets.reverse() : sommets, teinte: g.teinte, ...(g.nuance !== undefined ? { nuance: g.nuance } : {}) });
  }
  return facettes;
}
