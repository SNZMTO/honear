/**
 * Le drapé : une bande de facettes tendue entre deux lignes, et bombée.
 * Il sert aux épaules, aux mèches et aux calottes de cheveux, aux cols : tout ce qui est souple.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { auRang } from '../boucle';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { aireSignee } from '../polygones';
import { entreDeux, type Vec2, type Vec3 } from '../vecteurs';

/**
 * Profil du bombé d'un drapé, d'une ligne à l'autre :
 * - `boudin` : nul sur les deux lignes, plein à mi-chemin. Une mèche, un bourrelet.
 * - `coupole` : nul sur la première ligne, plein sur la seconde, de plus en plus plat. Le bord d'un volume rond :
 *   une calotte de cheveux, des épaules.
 */
export type Profil = 'boudin' | 'coupole';

export interface Drape {
  /** Les deux lignes entre lesquelles le drapé est tendu, avec le même nombre de points. */
  readonly haut: readonly Vec2[];
  readonly bas: readonly Vec2[];
  /** Nombre de rangées de facettes entre les deux lignes. */
  readonly rangs: number;
  /** Hauteur du bombé là où il est plein, dans la même unité que les lignes. */
  readonly relief: number;
  readonly profil: Profil;
  readonly teinte: NomDeTeinte;
  readonly nuance?: Nuance;
}

const PROFILS: Readonly<Record<Profil, (v: number) => number>> = {
  boudin: (v) => Math.sin(Math.PI * v) ** 0.7,
  coupole: (v) => Math.sin((Math.PI / 2) * v),
};

export function drape(d: Drape): Maille {
  if (d.haut.length !== d.bas.length) throw new Error('Les deux lignes d’un drapé ont le même nombre de points.');
  const point = (colonne: number, rang: number): Vec3 => {
    const v = rang / d.rangs;
    const p = entreDeux(auRang(d.haut, colonne), auRang(d.bas, colonne), v);
    return [p[0], p[1], d.relief * PROFILS[d.profil](v)];
  };
  const facettes: Facette[] = [];
  for (let rang = 0; rang < d.rangs; rang++) {
    for (let colonne = 0; colonne + 1 < d.haut.length; colonne++) {
      const sommets = [point(colonne, rang), point(colonne + 1, rang), point(colonne + 1, rang + 1), point(colonne, rang + 1)];
      const aire = aireSignee(sommets.map((s): Vec2 => [s[0], s[1]]));
      if (Math.abs(aire) < 0.01) continue;
      facettes.push({ sommets: aire < 0 ? sommets.reverse() : sommets, teinte: d.teinte, ...(d.nuance !== undefined ? { nuance: d.nuance } : {}) });
    }
  }
  return facettes;
}
