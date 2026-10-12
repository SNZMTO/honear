/**
 * L'os : un fût à pans entre deux points de l'espace, ses couronnes perpendiculaires à son axe, aussi espacées qu'elles ont de
 * largeur entre deux pans (aucune facette en lame), plus mince en son milieu qu'à ses bouts, fermé à chaque bout par une pointe
 * courte (une articulation la couvre, en général). Ses facettes se recouvrent avec celles des os voisins : on range tout un
 * squelette ensemble (`duFondVersLOeil`).
 */

import type { NomDeTeinte } from '../../ressources/palette';
import type { Facette } from '../facette';
import { normaleDeNewell, scalaire3, unitaire3, type Vec3 } from '../vecteurs';

export interface Os {
  readonly de: Vec3;
  readonly a: Vec3;
  /** Son rayon à ses bouts ; en son milieu, il est plus mince d'autant (une part de ce rayon). */
  readonly rayon: number;
  readonly amincit: number;
  readonly pans: number;
  /** Le plus de couronnes qu'il peut avoir le long de son axe, si long soit-il. */
  readonly couronnesAuPlus: number;
  readonly teinte: NomDeTeinte;
}

/** Le produit vectoriel. */
const croise = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];

/** Les facettes d'un os, chacune tournée vers le dehors de son axe. */
export function os(o: Os): Facette[] {
  const axe: Vec3 = [o.a[0] - o.de[0], o.a[1] - o.de[1], o.a[2] - o.de[2]];
  const u = unitaire3(axe);
  // Deux directions perpendiculaires à l'axe, pour tracer ses couronnes.
  const v = unitaire3(croise(u, Math.abs(u[2]) < 1 - 1e-3 ? [0, 0, 1] : [1, 0, 0]));
  const w = croise(u, v);
  const sur = (part: number): Vec3 => [o.de[0] + axe[0] * part, o.de[1] + axe[1] * part, o.de[2] + axe[2] * part];
  const couronne = (part: number, rayon: number): Vec3[] =>
    Array.from({ length: o.pans }, (_, k): Vec3 => {
      const angle = (2 * Math.PI * k) / o.pans;
      const c = sur(part);
      const [cos, sin] = [Math.cos(angle) * rayon, Math.sin(angle) * rayon];
      return [c[0] + v[0] * cos + w[0] * sin, c[1] + v[1] * cos + w[1] * sin, c[2] + v[2] * cos + w[2] * sin];
    });
  const longueur = Math.hypot(...axe);
  // Ses couronnes, espacées comme ses pans le sont autour de lui ; plus minces vers son milieu.
  const troncons = Math.min(o.couronnesAuPlus, Math.max(2, Math.round(longueur / ((2 * Math.PI * o.rayon) / o.pans))));
  const anneaux = Array.from({ length: troncons + 1 }, (_, i) =>
    couronne(i / troncons, o.rayon * (1 - o.amincit * Math.sin((Math.PI * i) / troncons))),
  );
  const bouts: readonly [Vec3, Vec3] = [sur(-o.rayon / 2 / longueur), sur(1 + o.rayon / 2 / longueur)];
  const facettes: Facette[] = [];
  const dehors = (sommets: Vec3[], depuis: Vec3): Facette => {
    const m = sommets.reduce<Vec3>((s, p) => [s[0] + p[0] / sommets.length, s[1] + p[1] / sommets.length, s[2] + p[2] / sommets.length], [0, 0, 0]);
    const n = normaleDeNewell(sommets);
    return { sommets: scalaire3(n, [m[0] - depuis[0], m[1] - depuis[1], m[2] - depuis[2]]) >= 0 ? sommets : sommets.reverse(), teinte: o.teinte };
  };
  for (let r = 0; r + 1 < anneaux.length; r++) {
    const [a, b] = [anneaux[r] ?? [], anneaux[r + 1] ?? []];
    const milieu = sur((r + 1 / 2) / (anneaux.length - 1));
    for (let k = 0; k < o.pans; k++) {
      const s = (k + 1) % o.pans;
      const [a0, a1, b0, b1] = [a[k], a[s], b[k], b[s]];
      if (a0 === undefined || a1 === undefined || b0 === undefined || b1 === undefined) continue;
      facettes.push(dehors([a0, a1, b1], milieu), dehors([a0, b1, b0], milieu));
    }
  }
  // Les bouts : une pointe courte, de chaque côté.
  for (const [anneau, bout, depuis] of [
    [anneaux[0] ?? [], bouts[0], sur(1 / 2)],
    [anneaux[anneaux.length - 1] ?? [], bouts[1], sur(1 / 2)],
  ] as const) {
    for (let k = 0; k < o.pans; k++) {
      const [p, q] = [anneau[k], anneau[(k + 1) % o.pans]];
      if (p !== undefined && q !== undefined) facettes.push(dehors([p, q, bout], depuis));
    }
  }
  return facettes;
}
