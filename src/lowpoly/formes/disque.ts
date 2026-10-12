/**
 * Le disque : des anneaux découpés en pans, dont les facettes rayonnent depuis le centre.
 * Jamais d'éventail de triangles pointus : le cœur est un seul polygone.
 * C'est le dessus de tout ce qui est rond : seul pour une tête de vis, sur un flanc pour un plot (plot.ts).
 */

import type { NomDeFini } from '../../ressources/finis';
import type { NomDeTeinte } from '../../ressources/palette';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { hauteurPour } from '../projection';
import { direction, fois, plus, type Vec2, type Vec3 } from '../vecteurs';

export interface Anneau {
  /** Rayon extérieur puis rayon intérieur, en px. Un rayon intérieur nul donne un cœur plein. */
  readonly de: number;
  readonly a: number;
  readonly teinte: NomDeTeinte;
  readonly fini?: NomDeFini;
  readonly nuance?: Nuance;
  /** Ce dont l'anneau monte de son bord extérieur à son bord intérieur, en px visibles : un cône très doux. */
  readonly monte?: number;
}

export interface Disque {
  readonly centre: Vec2;
  /** Hauteur au-dessus du bois, en px visibles. */
  readonly hauteur: number;
  /** Nombre de pans : au moins 48 pour un disque, 16 pour un bouton. */
  readonly pans: number;
  readonly anneaux: readonly Anneau[];
  /** Angle du premier pan, en degrés. */
  readonly dephasage?: number;
}

export function disque(d: Disque): Maille {
  const facettes: Facette[] = [];
  const depart = d.dephasage ?? 0;
  const point = (rayon: number, angle: number, z: number): Vec3 => {
    const p = plus(d.centre, fois(direction(angle), rayon));
    return [p[0], p[1], z];
  };

  // Chaque anneau repart de la hauteur où le précédent s'est arrêté.
  let niveau = d.hauteur;
  for (const anneau of d.anneaux) {
    const zDehors = hauteurPour(niveau);
    niveau += anneau.monte ?? 0;
    const zDedans = hauteurPour(niveau);
    const commun = {
      teinte: anneau.teinte,
      ...(anneau.fini !== undefined ? { fini: anneau.fini } : {}),
      ...(anneau.nuance !== undefined ? { nuance: anneau.nuance } : {}),
    };
    const pas = 360 / d.pans;

    if (anneau.a <= 0) {
      const sommets: Vec3[] = [];
      for (let pan = 0; pan < d.pans; pan++) sommets.push(point(anneau.de, depart + pan * pas, zDehors));
      facettes.push({ sommets, ...commun });
      continue;
    }

    for (let pan = 0; pan < d.pans; pan++) {
      const a0 = depart + pan * pas;
      const a1 = a0 + pas;
      // Les sillons suivent le cercle : leur sens est la tangente au milieu du pan.
      const fil = direction((a0 + a1) / 2 + 90);
      facettes.push({
        sommets: [point(anneau.de, a0, zDehors), point(anneau.de, a1, zDehors), point(anneau.a, a1, zDedans), point(anneau.a, a0, zDedans)],
        ...commun,
        fil,
      });
    }
  }
  return facettes;
}
