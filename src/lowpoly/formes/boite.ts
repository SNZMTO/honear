/**
 * La boîte chanfreinée : un contour posé à plat, monté droit, dont l'arête du haut est adoucie
 * par un chanfrein, une fine rangée de facettes qui accroche la lumière.
 * `prisme` monte n'importe quel contour convexe ; `boiteChanfreinee` est son cas rectangulaire,
 * et le plot (plot.ts) son cas rond.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { auRang } from '../boucle';
import { rectangleArrondi } from '../contours';
import type { Facette, Maille } from '../facette';
import type { Nuance } from '../ombrage';
import { orienter, placer, rentrer, type Polygone } from '../polygones';
import { hauteurPour } from '../projection';
import type { Vec2, Vec3 } from '../vecteurs';

export interface Prisme {
  /** Contour au sol, convexe, dans le plan du meuble. */
  readonly contour: Polygone;
  /** Hauteur du dessous au-dessus du bois, en px visibles. */
  readonly base: number;
  /** Épaisseur visible, en px. */
  readonly epaisseur: number;
  /** Largeur du chanfrein, en px dans le plan. 0 : arête vive (à réserver aux pièces minuscules). */
  readonly chanfrein: number;
  readonly teinte: NomDeTeinte;
  /** Vrai : pas de dessus, une autre forme le dessine. */
  readonly ouvert?: boolean;
  /** Nuance de chaque pan, flanc et chanfrein ensemble : c'est ce qui fait un moletage. */
  readonly nuanceDuPan?: (pan: number) => Nuance;
}

/** Un pan de chanfrein vu de dessus : les deux bouts de l'arête du dehors, puis ceux de l'arête rentrée, dans le sens du tour. */
export type BandeDeChanfrein = readonly [Vec2, Vec2, Vec2, Vec2];

/** Les pans du chanfrein d'un contour convexe, un par arête : c'est la bande que le biseau occupe, vue de dessus. */
export function bandesDeChanfrein(contour: Polygone, largeur: number): BandeDeChanfrein[] {
  const dehors = orienter(contour);
  const dedans = rentrer(dehors, largeur);
  return dehors.map((p0, pan): BandeDeChanfrein => [p0, auRang(dehors, pan + 1), auRang(dedans, pan + 1), auRang(dedans, pan)]);
}

/** Monte un contour en volume. Les faces tournées vers l'œil seront gardées au moment de peindre. */
export function prisme(p: Prisme): Maille {
  const bas = hauteurPour(p.base);
  const haut = hauteurPour(p.base + p.epaisseur);
  const chanfrein = Math.max(0, p.chanfrein);
  const epaule = Math.max(bas, haut - chanfrein);
  const leve = (point: Vec2, z: number): Vec3 => [point[0], point[1], z];
  const facettes: Facette[] = [];

  const bandes = bandesDeChanfrein(p.contour, chanfrein);
  bandes.forEach(([p0, p1, q1, q0], pan) => {
    const nuance = p.nuanceDuPan?.(pan);
    const commun = { teinte: p.teinte, ...(nuance !== undefined ? { nuance } : {}) };
    facettes.push({ sommets: [leve(p0, bas), leve(p1, bas), leve(p1, epaule), leve(p0, epaule)], ...commun });
    if (chanfrein > 0) facettes.push({ sommets: [leve(p0, epaule), leve(p1, epaule), leve(q1, haut), leve(q0, haut)], ...commun });
  });
  if (p.ouvert !== true) facettes.push({ sommets: bandes.map(([, , , dedans]) => leve(dedans, haut)), teinte: p.teinte });
  return facettes;
}

export interface Boite {
  /** Coin haut-gauche avant rotation, dans le plan du meuble. */
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly profondeur: number;
  /** Hauteur du dessous au-dessus du bois, en px visibles. */
  readonly base: number;
  /** Épaisseur visible, en px. */
  readonly epaisseur: number;
  readonly rayon?: number;
  readonly pansParCoin?: number;
  readonly chanfrein: number;
  readonly teinte: NomDeTeinte;
  /** Rotation autour du centre de la boîte, en degrés. */
  readonly angle?: number;
}

/** Contour au sol d'une boîte : le même sert à son volume et à son ombre. */
export function contourDeBoite(b: Pick<Boite, 'x' | 'y' | 'largeur' | 'profondeur' | 'rayon' | 'pansParCoin' | 'angle'>): Vec2[] {
  const centre: Vec2 = [b.x + b.largeur / 2, b.y + b.profondeur / 2];
  const local = rectangleArrondi(-b.largeur / 2, -b.profondeur / 2, b.largeur, b.profondeur, b.rayon ?? 0, b.pansParCoin ?? 3);
  return placer(local, { en: centre, angle: b.angle ?? 0 });
}

export function boiteChanfreinee(b: Boite): Maille {
  return prisme({ contour: contourDeBoite(b), base: b.base, epaisseur: b.epaisseur, chanfrein: b.chanfrein, teinte: b.teinte });
}
