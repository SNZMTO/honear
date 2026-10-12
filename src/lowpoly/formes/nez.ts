/**
 * Le nez : une arête, deux flancs et un dessous. Quatre petites facettes en relief, la lampe fait le reste.
 * Chaque flanc s'écarte dès le haut de l'arête : il part d'un pan coupé, pas d'une pointe.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import type { Maille } from '../facette';
import type { Vec2, Vec3 } from '../vecteurs';

export interface Nez {
  /** Milieu du haut de l'arête. Le nez descend de là. */
  readonly haut: Vec2;
  readonly longueur: number;
  /** Demi-largeur de l'arête, et de la base. */
  readonly arete: number;
  readonly base: number;
  /** Hauteur de la pointe au-dessus du visage. */
  readonly saillie: number;
  readonly teinte: NomDeTeinte;
}

/**
 * Les proportions du nez, en parts de sa longueur : ce que le dessous en prend au bout ; l'épaule où chaque flanc s'écarte
 * de l'arête (de combien, et à quelle hauteur) ; la narine, un peu sous la pointe. Et la part de la base que garde le dessous.
 */
const PROPORTIONS = { dessous: 0.2875, epaule: { ecart: 0.14375, hauteur: 0.1625 }, narine: 0.1, bout: 0.55 } as const;

export function nez(n: Nez): Maille {
  const [x, y] = n.haut;
  const p = (dx: number, dy: number, z = 0): Vec3 => [x + dx, y + dy, z];
  const bas = n.longueur;
  const pointe = bas * (1 - PROPORTIONS.dessous);
  const epaule = { x: n.arete + bas * PROPORTIONS.epaule.ecart, y: bas * PROPORTIONS.epaule.hauteur };
  const narine = pointe + bas * PROPORTIONS.narine;
  const bout = n.base * PROPORTIONS.bout;
  const z = n.saillie;
  return [
    { sommets: [p(-n.arete, 0), p(n.arete, 0), p(n.arete, pointe, z), p(-n.arete, pointe, z)], teinte: n.teinte },
    { sommets: [p(-n.arete, 0), p(-n.arete, pointe, z), p(-bout, bas), p(-n.base, narine), p(-epaule.x, epaule.y)], teinte: n.teinte },
    { sommets: [p(n.arete, 0), p(epaule.x, epaule.y), p(n.base, narine), p(bout, bas), p(n.arete, pointe, z)], teinte: n.teinte },
    { sommets: [p(-n.arete, pointe, z), p(n.arete, pointe, z), p(bout, bas), p(-bout, bas)], teinte: n.teinte },
  ];
}
