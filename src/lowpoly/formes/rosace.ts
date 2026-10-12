/**
 * La rosace : des pétales aux bouts ronds autour d'un cœur. C'est une fleur imprimée, un motif de tissu.
 * Elle est à plat : ses pétales ne se distinguent que par une nuance, de l'un à l'autre.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { cercle } from '../contours';
import { facetteAPlat, type Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { polaire, type Vec2 } from '../vecteurs';

export interface Rosace {
  readonly centre: Vec2;
  readonly rayon: number;
  readonly petales: number;
  readonly teinte: NomDeTeinte;
  readonly coeur: NomDeTeinte;
  /** Angle du premier pétale, en degrés. */
  readonly angle?: number;
}

/** Un pétale, en parts du rayon de la fleur et de l'angle qui le sépare du suivant : son pied au bord du cœur, son épaule, son bout rond. */
const PETALE = { coeur: 0.3, epaule: 0.82, demiLargeurs: { pied: 0.36, epaule: 0.305, bout: 0.125 } } as const;
/** D'un pétale au suivant, la nuance change : assez pour les séparer. */
const NUANCES: readonly Nuance[] = [0, -1, 1];

/** La nuance d'un pétale : jamais celle d'un voisin, y compris du dernier au premier. */
function nuanceDuPetale(rang: number, nombre: number): Nuance {
  const referme = rang === nombre - 1 && nombre % NUANCES.length === 1;
  return referme ? -1 : (NUANCES[rang % NUANCES.length] ?? 0);
}

export function rosace(r: Rosace): Maille {
  if (r.petales < 3) throw new Error(`Une rosace a au moins trois pétales : ${r.petales} donnés.`);
  const depart = r.angle ?? -90;
  const pas = 360 / r.petales;
  const point = (rayon: number, angle: number): Vec2 => polaire(r.centre, rayon * r.rayon, angle);
  const { pied, epaule, bout } = PETALE.demiLargeurs;
  const petales = Array.from({ length: r.petales }, (_, i) => {
    const a = depart + pas * i;
    const contour = [
      point(PETALE.coeur, a - pied * pas),
      point(PETALE.epaule, a - epaule * pas),
      point(1, a - bout * pas),
      point(1, a + bout * pas),
      point(PETALE.epaule, a + epaule * pas),
      point(PETALE.coeur, a + pied * pas),
    ];
    return facetteAPlat(contour, 0, r.teinte, nuanceDuPetale(i, r.petales));
  });
  return [...petales, facetteAPlat(cercle(r.centre, PETALE.coeur * r.rayon, 6, depart), 0, r.coeur)];
}
