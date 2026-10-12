/**
 * La tige : un tronc de cône à pans, debout, qui peut pencher (une queue de citrouille). Son pied et sa tête sont dans l'espace ;
 * ses pans, horizontaux. Elle est fermée en haut. Ses facettes sont rangées du fond vers l'œil.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { duFondVersLOeil, type Facette } from '../facette';
import { normaleDeNewell, scalaire3, type Vec3 } from '../vecteurs';

export interface Tige {
  readonly pied: Vec3;
  readonly tete: Vec3;
  readonly rayonPied: number;
  readonly rayonTete: number;
  readonly pans: number;
  readonly teinte: NomDeTeinte;
}

export function tige(t: Tige): Facette[] {
  const anneau = (c: Vec3, r: number): Vec3[] =>
    Array.from({ length: t.pans }, (_, k) => {
      const angle = (2 * Math.PI * k) / t.pans;
      return [c[0] + r * Math.cos(angle), c[1] + r * Math.sin(angle), c[2]];
    });
  const [bas, haut] = [anneau(t.pied, t.rayonPied), anneau(t.tete, t.rayonTete)];
  const facettes: Facette[] = [];
  const axe = (z: number): Vec3 => {
    const part = (z - t.pied[2]) / (t.tete[2] - t.pied[2] || 1);
    return [t.pied[0] + (t.tete[0] - t.pied[0]) * part, t.pied[1] + (t.tete[1] - t.pied[1]) * part, z];
  };
  const dehors = (sommets: Vec3[]): Vec3[] => {
    const m = sommets.reduce<Vec3>((s, p) => [s[0] + p[0] / sommets.length, s[1] + p[1] / sommets.length, s[2] + p[2] / sommets.length], [0, 0, 0]);
    const a = axe(m[2]);
    return scalaire3(normaleDeNewell(sommets), [m[0] - a[0], m[1] - a[1], 0]) >= 0 ? sommets : sommets.reverse();
  };
  for (let k = 0; k < t.pans; k++) {
    const s = (k + 1) % t.pans;
    const [b0, b1, h0, h1] = [bas[k], bas[s], haut[k], haut[s]];
    if (b0 === undefined || b1 === undefined || h0 === undefined || h1 === undefined) continue;
    facettes.push({ sommets: dehors([b0, b1, h1, h0]), teinte: t.teinte });
  }
  // Le dessus regarde vers le haut.
  const dessus = normaleDeNewell(haut)[2] >= 0 ? haut : [...haut].reverse();
  facettes.push({ sommets: dessus, teinte: t.teinte });
  return duFondVersLOeil(facettes);
}
