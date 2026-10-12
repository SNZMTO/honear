/**
 * Le dôme : un volume bas et bombé, fait de couronnes de petits triangles presque équilatéraux.
 * Vu de dessus, c'est un bas-relief : chaque facette a sa pente, donc son ton.
 * Il sert à tout ce qui est rond sur un personnage : tête, boule de micro, poing.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { hasard } from '../aleatoire';
import { auRang } from '../boucle';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { aireSignee } from '../polygones';
import { radians, type Vec2, type Vec3 } from '../vecteurs';

export interface Dome {
  readonly centre: Vec2;
  /** Demi-largeur et demi-hauteur du contour. */
  readonly rayons: Vec2;
  /** Hauteur du sommet du dôme au-dessus de son bord, dans la même unité que les rayons. */
  readonly relief: number;
  /** Nombre de sommets de chaque couronne, du bord vers le centre. */
  readonly couronnes: readonly number[];
  /** Rayon de chaque couronne, en part du contour : 1 pour le bord. Par défaut, des couronnes régulières. */
  readonly retraits?: readonly number[];
  /**
   * Nombre de facettes qui ferment le sommet, à l'intérieur de la dernière couronne : 1 par défaut (un seul polygone).
   * Plus d'une : elles se rejoignent au sommet, et la dernière couronne doit se partager en autant de parts égales.
   */
  readonly sommet?: number;
  /** 2 : une ellipse. Au-delà : un contour plus plein, aux joues plus rondes. */
  readonly galbe?: number;
  /** Angle du premier sommet de chaque couronne, en degrés. */
  readonly dephasage?: number;
  /**
   * Bosselage : la part dont la hauteur de chaque sommet s'écarte de celle de sa couronne, tirée une fois pour toutes
   * (le même germe redonne les mêmes bosses). Le contour reste à plat. Chaque facette y gagne sa propre pente, donc son propre
   * ton : sans lui, des facettes voisines prennent le même ton et se fondent en grands plans.
   */
  readonly bosses?: { readonly amplitude: number; readonly germe: number };
  readonly teinte: NomDeTeinte;
  readonly nuance?: Nuance;
}

interface Couronne {
  readonly sommets: readonly Vec3[];
  readonly angles: readonly number[];
}

/** @param rang rang de la couronne, 0 pour le contour. */
function couronne(d: Dome, rang: number, nombre: number, retrait: number, dephasage: number): Couronne {
  const puissance = 2 / (d.galbe ?? 2);
  const sommets: Vec3[] = [];
  const angles: number[] = [];
  const hauteur = d.relief * Math.sqrt(Math.max(0, 1 - retrait * retrait));
  // Chaque couronne tire ses bosses de son propre germe ; le contour, lui, reste à plat.
  const bosses = d.bosses !== undefined && rang > 0 ? { tirage: hasard(d.bosses.germe + rang), amplitude: d.bosses.amplitude } : undefined;
  for (let i = 0; i < nombre; i++) {
    const angle = dephasage + (360 * i) / nombre;
    const c = Math.cos(radians(angle));
    const s = Math.sin(radians(angle));
    const x = Math.sign(c) * Math.abs(c) ** puissance;
    const y = Math.sign(s) * Math.abs(s) ** puissance;
    const bosse = bosses !== undefined ? 1 + bosses.tirage.entre(-bosses.amplitude, bosses.amplitude) : 1;
    sommets.push([d.centre[0] + d.rayons[0] * retrait * x, d.centre[1] + d.rayons[1] * retrait * y, hauteur * bosse]);
    angles.push(angle);
  }
  return { sommets, angles };
}

/** Relie deux couronnes par une bande de triangles, en avançant toujours du côté qui est en retard. */
function bande(dehors: Couronne, dedans: Couronne): Vec3[][] {
  const triangles: Vec3[][] = [];
  const n = dehors.sommets.length;
  const m = dedans.sommets.length;
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    const angleDehors = i < n ? auRang(dehors.angles, i + 1) + (i + 1 >= n ? 360 : 0) : Infinity;
    const angleDedans = j < m ? auRang(dedans.angles, j + 1) + (j + 1 >= m ? 360 : 0) : Infinity;
    if (angleDehors <= angleDedans) {
      triangles.push([auRang(dehors.sommets, i), auRang(dehors.sommets, i + 1), auRang(dedans.sommets, j)]);
      i++;
    } else {
      triangles.push([auRang(dehors.sommets, i), auRang(dedans.sommets, j + 1), auRang(dedans.sommets, j)]);
      j++;
    }
  }
  return triangles;
}

/** Ferme la dernière couronne : d'un seul polygone, ou de quelques facettes qui se rejoignent au sommet. */
function sommet(d: Dome, derniere: Couronne): Vec3[][] {
  const parts = d.sommet ?? 1;
  if (parts <= 1) return [[...derniere.sommets]];
  const n = derniere.sommets.length;
  if (n % parts !== 0) throw new Error(`Un sommet à ${parts} facettes ne ferme pas une couronne de ${n} sommets.`);
  const pointe: Vec3 = [d.centre[0], d.centre[1], d.relief];
  const pas = n / parts;
  return Array.from({ length: parts }, (_, part) => [pointe, ...Array.from({ length: pas + 1 }, (_, i) => auRang(derniere.sommets, part * pas + i))]);
}

export function dome(d: Dome): Maille {
  const nombre = d.couronnes.length;
  if (nombre < 2) throw new Error('Un dôme a au moins deux couronnes : avec une seule, il serait plat.');
  const retraits = d.retraits ?? d.couronnes.map((_, rang) => 1 - (rang * 0.86) / nombre);
  const couronnes = d.couronnes.map((sommets, rang) => {
    // Une couronne sur deux est décalée d'un demi-pas : les triangles s'emboîtent.
    const demiPas = rang % 2 === 1 ? 180 / sommets : 0;
    return couronne(d, rang, sommets, retraits[rang] ?? 0.5, (d.dephasage ?? 0) + demiPas);
  });
  const commun = { teinte: d.teinte, ...(d.nuance !== undefined ? { nuance: d.nuance } : {}) };
  const aLEndroit = (sommets: Vec3[]): Vec3[] => (aireSignee(sommets.map((s): Vec2 => [s[0], s[1]])) < 0 ? [...sommets].reverse() : sommets);

  const facettes: Facette[] = [];
  for (let rang = 0; rang + 1 < couronnes.length; rang++) {
    for (const triangle of bande(auRang(couronnes, rang), auRang(couronnes, rang + 1))) facettes.push({ sommets: aLEndroit(triangle), ...commun });
  }
  for (const facette of sommet(d, auRang(couronnes, couronnes.length - 1))) facettes.push({ sommets: aLEndroit(facette), ...commun });
  return facettes;
}
