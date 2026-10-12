/**
 * La plaque debout : un carton ou une planche tenus droits sur le meuble, face au joueur, un peu penchés en arrière.
 * Son contour est donné dans le plan de sa face, en px : x le long du meuble, h en px visibles au-dessus de sa base.
 * Ses arêtes sont adoucies d'un chanfrein, qui accroche la lumière ; son épaisseur se voit sur son dessus.
 * Une pochette dans le bac, un intercalaire et son onglet en sortent.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { auRang } from '../boucle';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { orienter, rentrer, type Polygone } from '../polygones';
import { hauteurPour } from '../projection';
import { normaleDeNewell, radians, type Vec2, type Vec3 } from '../vecteurs';

export interface Plaque {
  /** Contour de sa face : (x, hauteur visible au-dessus de la base). Il peut avoir des creux, pas de pointes. */
  readonly contour: Polygone;
  /** Où se tient le pied de sa face, dans la profondeur du meuble, en px. */
  readonly y: number;
  /** Hauteur de son pied au-dessus du bois, en px visibles. */
  readonly base: number;
  /** Épaisseur, en px dans la profondeur : 3 px pour une pochette. */
  readonly epaisseur: number;
  readonly chanfrein: number;
  /** De combien elle penche en arrière, en degrés : son haut s'éloigne du joueur. */
  readonly penche: number;
  readonly teinte: NomDeTeinte;
  readonly nuance?: Nuance;
}

/** Les sommets d'une plaque : un point de sa face, au recul donné vers le fond (en px de profondeur). */
function poserDebout(p: Plaque, point: Vec2, recul: number): Vec3 {
  const z = hauteurPour(p.base + point[1]);
  const penche = Math.tan(radians(p.penche)) * (z - hauteurPour(p.base));
  return [point[0], p.y - recul - penche, z];
}

/** Une facette dont les sommets sont mis dans l'ordre qui la fait regarder dans ce sens : elle sera gardée si ce sens est vers l'œil. */
function regardant(sommets: Vec3[], vers: Vec3): Vec3[] {
  const n = normaleDeNewell(sommets);
  return n[0] * vers[0] + n[1] * vers[1] + n[2] * vers[2] >= 0 ? sommets : [...sommets].reverse();
}

export function plaqueDebout(p: Plaque): Maille {
  const dehors = [...p.contour];
  const dedans = rentrer(orienter(dehors), p.chanfrein);
  const bord = orienter(dehors);
  const commun = { teinte: p.teinte, ...(p.nuance !== undefined ? { nuance: p.nuance } : {}) };
  // Le centre de la face : chaque chant regarde à l'opposé de lui, et vers le joueur pour le chanfrein.
  const [cx, ch] = bord.reduce((s, q) => [s[0] + q[0] / bord.length, s[1] + q[1] / bord.length], [0, 0]);
  const facettes: Facette[] = [
    {
      sommets: regardant(
        dedans.map((point) => poserDebout(p, point, 0)),
        [0, 1, 0],
      ),
      ...commun,
    },
  ];
  bord.forEach((p0, rang) => {
    const p1 = auRang(bord, rang + 1);
    const [q0, q1] = [auRang(dedans, rang), auRang(dedans, rang + 1)];
    const dehorsDuChant: Vec3 = [(p0[0] + p1[0]) / 2 - cx, 0, (p0[1] + p1[1]) / 2 - ch];
    // Le chanfrein, entre la face et le bord ; puis le chant, du bord jusqu'au dos.
    const chanfrein = [poserDebout(p, q0, 0), poserDebout(p, p0, p.chanfrein), poserDebout(p, p1, p.chanfrein), poserDebout(p, q1, 0)];
    const chant = [
      poserDebout(p, p0, p.chanfrein),
      poserDebout(p, p0, p.epaisseur),
      poserDebout(p, p1, p.epaisseur),
      poserDebout(p, p1, p.chanfrein),
    ];
    facettes.push({ sommets: regardant(chanfrein, dehorsDuChant), ...commun });
    facettes.push({ sommets: regardant(chant, dehorsDuChant), ...commun });
  });
  return facettes;
}
