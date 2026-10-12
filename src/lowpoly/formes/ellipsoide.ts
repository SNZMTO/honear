/**
 * L'ellipsoïde facetté : des couronnes de points de pôle à pôle, cousues en triangles, fermées en éventail aux deux pôles. Il peut
 * avoir des côtes, comme une citrouille, et un sommet creusé, d'où sort une queue. Arrondi, chaque couronne a d'autant moins de
 * points qu'elle est près d'un pôle, et deux couronnes se cousent en triangles presque équilatéraux : plus de facettes, aucune en
 * lame. Là où il se creuse, ses facettes se recouvrent : elles sont rangées du fond vers l'œil. Ses mesures sont dans l'espace du
 * meuble, hauteurs comprises (voir `hauteurPour`).
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { duFondVersLOeil, type Facette } from '../facette';
import { normaleDeNewell, scalaire3, type Vec2, type Vec3 } from '../vecteurs';

export interface Ellipsoide {
  /** Le milieu de son pied, dans le plan du meuble. */
  readonly centre: Vec2;
  /** La hauteur de son pied, dans l'espace du meuble. */
  readonly base: number;
  /** Ses demi-axes : en largeur, en profondeur, en hauteur. */
  readonly rayons: Vec3;
  /** Combien de points font son tour (à l'équateur, s'il est arrondi), et combien de couronnes vont d'un pôle à l'autre. */
  readonly pans: number;
  readonly couronnes: number;
  /** Vrai pour qu'il soit rond : chaque couronne a d'autant moins de points qu'elle est près d'un pôle. */
  readonly arrondi?: boolean;
  /** Ses côtes, s'il en a : leur nombre, et ce dont chaque creux entre deux côtes rentre, en part du rayon. */
  readonly cotes?: { readonly nombre: number; readonly creux: number };
  /** Ce dont son sommet est creusé, en part de sa hauteur. */
  readonly sommetCreuse?: number;
  readonly teinte: NomDeTeinte;
}

/** Une facette tournée vers le dehors : si elle regarde vers ce point du dedans, on la retourne. */
const versLeDehors = (sommets: readonly Vec3[], dedans: Vec3): Vec3[] => {
  const n = normaleDeNewell(sommets);
  const m = sommets.reduce<Vec3>((s, p) => [s[0] + p[0] / sommets.length, s[1] + p[1] / sommets.length, s[2] + p[2] / sommets.length], [0, 0, 0]);
  return scalaire3(n, [m[0] - dedans[0], m[1] - dedans[1], m[2] - dedans[2]]) >= 0 ? [...sommets] : [...sommets].reverse();
};

export function ellipsoide(e: Ellipsoide): Facette[] {
  const [cx, cy] = e.centre;
  const [rx, ry, rz] = e.rayons;
  const pied = e.base;
  const cote = (angle: number): number => (e.cotes !== undefined ? 1 - (e.cotes.creux * (1 - Math.cos(e.cotes.nombre * angle))) / 2 : 1);
  /** Combien de points a cette couronne : tous, ou, arrondi, d'autant moins qu'elle est près d'un pôle (un multiple du nombre de côtes). */
  const multiple = e.cotes?.nombre ?? 1;
  const pointsDe = (c: number): number =>
    e.arrondi === true ? Math.max(3, multiple, Math.round((e.pans * Math.sin((Math.PI * c) / e.couronnes)) / multiple) * multiple) : e.pans;
  const couronne = (c: number): Vec3[] => {
    const phi = (Math.PI * c) / e.couronnes;
    const n = pointsDe(c);
    return Array.from({ length: n }, (_, k): Vec3 => {
      const angle = (2 * Math.PI * k) / n;
      const s = Math.sin(phi) * cote(angle);
      return [cx + rx * s * Math.cos(angle), cy + ry * s * Math.sin(angle), pied + rz * (1 - Math.cos(phi))];
    });
  };
  const bas: Vec3 = [cx, cy, pied];
  const haut: Vec3 = [cx, cy, pied + 2 * rz - (e.sommetCreuse ?? 0) * 2 * rz];
  const milieu: Vec3 = [cx, cy, pied + rz];
  const facettes: Facette[] = [];
  const poser = (sommets: readonly Vec3[], dedans: Vec3 = milieu): void => {
    facettes.push({ sommets: versLeDehors(sommets, dedans), teinte: e.teinte });
  };
  const couronnes = Array.from({ length: e.couronnes - 1 }, (_, i) => couronne(i + 1));
  const point = (anneau: readonly Vec3[], k: number): Vec3 => anneau[k % anneau.length] ?? bas;
  // Les pôles, en éventail ; le sommet creusé regarde vers le haut : on l'oriente depuis le dessous de lui.
  const premiere = couronnes[0] ?? [];
  const derniere = couronnes[couronnes.length - 1] ?? [];
  for (let k = 0; k < premiere.length; k++) poser([bas, point(premiere, k), point(premiere, k + 1)]);
  for (let k = 0; k < derniere.length; k++) poser([haut, point(derniere, k + 1), point(derniere, k)], [cx, cy, haut[2] - rz]);
  // Deux couronnes voisines se cousent : on avance sur celle dont le prochain point vient le premier dans le tour.
  for (let c = 0; c + 1 < couronnes.length; c++) {
    const [a, b] = [couronnes[c] ?? [], couronnes[c + 1] ?? []];
    let [i, j] = [0, 0];
    while (i < a.length || j < b.length) {
      const avanceSurA = j >= b.length || (i < a.length && (i + 1) / a.length <= (j + 1) / b.length);
      if (avanceSurA) {
        poser([point(a, i), point(a, i + 1), point(b, j)]);
        i++;
      } else {
        poser([point(a, i), point(b, j + 1), point(b, j)]);
        j++;
      }
    }
  }
  return duFondVersLOeil(facettes);
}
