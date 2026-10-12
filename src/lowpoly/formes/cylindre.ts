/**
 * Le cylindre couché : un tube vu de dessus, découpé en bandes dans sa longueur.
 * Chaque bande a sa propre orientation, donc son propre ton : c'est ce qui le fait paraître rond.
 * Il sert au tube du bras, à son contrepoids, aux cous, aux manches et aux micros.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { aireSignee, orienter } from '../polygones';
import { moins, radians, unitaire, type Vec2, type Vec3 } from '../vecteurs';

export interface Cylindre {
  /** Les deux bouts de l'axe, dans le plan. */
  readonly de: Vec2;
  readonly a: Vec2;
  /** Rayon à chaque bout : deux valeurs différentes donnent un tube qui s'affine. */
  readonly rayonDe: number;
  readonly rayonA: number;
  /** Nombre de bandes visibles de dessus : au moins 3. */
  readonly bandes: number;
  readonly teinte: NomDeTeinte;
  readonly nuance?: Nuance;
}

/** Contour du cylindre vu de dessus : pour son épaisseur et son ombre. */
export function contourDeCylindre(c: Pick<Cylindre, 'de' | 'a' | 'rayonDe' | 'rayonA'>): Vec2[] {
  const axe = unitaire(moins(c.a, c.de));
  const travers: Vec2 = [-axe[1], axe[0]];
  return orienter([
    [c.de[0] - travers[0] * c.rayonDe, c.de[1] - travers[1] * c.rayonDe],
    [c.a[0] - travers[0] * c.rayonA, c.a[1] - travers[1] * c.rayonA],
    [c.a[0] + travers[0] * c.rayonA, c.a[1] + travers[1] * c.rayonA],
    [c.de[0] + travers[0] * c.rayonDe, c.de[1] + travers[1] * c.rayonDe],
  ]);
}

export function cylindreCouche(c: Cylindre): Maille {
  const axe = unitaire(moins(c.a, c.de));
  const travers: Vec2 = [-axe[1], axe[0]];
  const facettes: Facette[] = [];
  // Le relief d'un point du tour : sa hauteur au-dessus de l'axe, dans la même unité que le plan.
  const bord = (centre: Vec2, rayon: number, angle: number): Vec3 => {
    const ecart = rayon * Math.sin(radians(angle));
    return [centre[0] + travers[0] * ecart, centre[1] + travers[1] * ecart, rayon * Math.cos(radians(angle))];
  };
  for (let bande = 0; bande < c.bandes; bande++) {
    const a0 = -90 + (180 * bande) / c.bandes;
    const a1 = -90 + (180 * (bande + 1)) / c.bandes;
    const sommets = [bord(c.de, c.rayonDe, a0), bord(c.a, c.rayonA, a0), bord(c.a, c.rayonA, a1), bord(c.de, c.rayonDe, a1)];
    const aLEndroit = aireSignee(sommets.map((s): Vec2 => [s[0], s[1]])) > 0;
    facettes.push({ sommets: aLEndroit ? sommets : sommets.reverse(), teinte: c.teinte, ...(c.nuance !== undefined ? { nuance: c.nuance } : {}) });
  }
  return facettes;
}
