/**
 * Où poser une babiole de saison : à la place libre la plus proche de celle qu'elle vise, dans le regard, sans rien chevaucher
 * de ce que l'écran montre (une touche, un papier, une pochette, un meuble). Le regard est une grille de cases ; une case est prise
 * dès que quelque chose la touche. On cherche de proche en proche, en carrés de cases de plus en plus grands autour de la place
 * visée ; le premier carré qui a de la place donne la plus proche des siennes.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Emprise } from '../rendu/emprise';

/** Ce qu'occupe une babiole autour du point où on la pose (son ombre comprise) : un rectangle, depuis ce point. */
export type Boite = Emprise;

/** Vrai si deux rectangles se chevauchent. */
export const seChevauchent = (a: Emprise, b: Emprise): boolean =>
  a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;

/** Le rectangle d'une boîte posée en ce point, élargi de cette marge. */
export const poseeEn = (boite: Boite, en: Vec2, marge = 0): Emprise => ({
  x: en[0] + boite.x - marge,
  y: en[1] + boite.y - marge,
  largeur: boite.largeur + 2 * marge,
  hauteur: boite.hauteur + 2 * marge,
});

/** Le plus petit rectangle qui contient ces deux-là. */
export function reunir(a: Emprise, b: Emprise): Emprise {
  const [x, y] = [Math.min(a.x, b.x), Math.min(a.y, b.y)];
  return { x, y, largeur: Math.max(a.x + a.largeur, b.x + b.largeur) - x, hauteur: Math.max(a.y + a.hauteur, b.y + b.hauteur) - y };
}

/**
 * Le plan d'un cadre : ses cases de tant de px, et celles qui sont prises. On y demande d'un coup si un bloc de cases est libre,
 * par la somme des cases prises au-dessus et à gauche de chacune, quel que soit le nombre de choses posées ; une babiole qu'on
 * pose y prend ses cases à son tour.
 */
export interface PlanDuCadre {
  readonly cadre: Emprise;
  readonly pas: number;
  readonly colonnes: number;
  readonly rangees: number;
  /** Vrai si ce bloc de cases, depuis celle-ci, est tout entier libre. */
  libre(colonne: number, rangee: number, colonnes: number, rangees: number): boolean;
  occuper(r: Emprise): void;
}

export function unPlan(cadre: Emprise, pas: number, obstacles: readonly Emprise[]): PlanDuCadre {
  const colonnes = Math.max(1, Math.ceil(cadre.largeur / pas));
  const rangees = Math.max(1, Math.ceil(cadre.hauteur / pas));
  const prises = new Uint8Array(colonnes * rangees);
  let sommes: Int32Array | undefined;
  const occuper = (r: Emprise): void => {
    const c0 = Math.max(0, Math.floor((r.x - cadre.x) / pas));
    const c1 = Math.min(colonnes - 1, Math.ceil((r.x + r.largeur - cadre.x) / pas) - 1);
    const r0 = Math.max(0, Math.floor((r.y - cadre.y) / pas));
    const r1 = Math.min(rangees - 1, Math.ceil((r.y + r.hauteur - cadre.y) / pas) - 1);
    for (let y = r0; y <= r1; y++) if (c0 <= c1) prises.fill(1, y * colonnes + c0, y * colonnes + c1 + 1);
    sommes = undefined;
  };
  for (const o of obstacles) occuper(o);
  const large = colonnes + 1;
  const sommer = (): Int32Array => {
    const s = new Int32Array(large * (rangees + 1));
    for (let y = 0; y < rangees; y++) {
      let ligne = 0;
      for (let x = 0; x < colonnes; x++) {
        ligne += prises[y * colonnes + x] ?? 0;
        s[(y + 1) * large + x + 1] = (s[y * large + x + 1] ?? 0) + ligne;
      }
    }
    return s;
  };
  return {
    cadre,
    pas,
    colonnes,
    rangees,
    occuper,
    libre(c, r, nc, nr) {
      sommes ??= sommer();
      const s = sommes;
      const [c1, r1] = [c + nc, r + nr];
      return (s[r1 * large + c1] ?? 0) - (s[r1 * large + c] ?? 0) - (s[r * large + c1] ?? 0) + (s[r * large + c] ?? 0) === 0;
    },
  };
}

/** La place libre la plus proche de celle qu'on vise, dans le plan, marge comprise ; ou rien s'il n'y en a pas. */
export function placeLibre(boite: Boite, vise: Vec2, plan: PlanDuCadre, marge: number): Vec2 | undefined {
  const { cadre, pas } = plan;
  // La boîte, marge comprise, en cases ; et les cases d'où elle peut partir sans sortir du cadre.
  const [nc, nr] = [Math.ceil((boite.largeur + 2 * marge) / pas), Math.ceil((boite.hauteur + 2 * marge) / pas)];
  const [cMax, rMax] = [plan.colonnes - nc, plan.rangees - nr];
  if (cMax < 0 || rMax < 0) return undefined;
  /** Le point où se pose la babiole dont la boîte part de cette case. */
  const en = (c: number, r: number): Vec2 => [cadre.x + c * pas - boite.x + marge, cadre.y + r * pas - boite.y + marge];
  const borne = (v: number, a: number): number => Math.min(a, Math.max(0, Math.round(v)));
  const [c0, r0] = [borne((vise[0] + boite.x - marge - cadre.x) / pas, cMax), borne((vise[1] + boite.y - marge - cadre.y) / pas, rMax)];
  const loin = Math.max(cMax, rMax);
  for (let rang = 0; rang <= loin; rang++) {
    let meilleure: { readonly en: Vec2; readonly distance: number } | undefined;
    const essayer = (c: number, r: number): void => {
      if (c < 0 || r < 0 || c > cMax || r > rMax || !plan.libre(c, r, nc, nr)) return;
      const ici = en(c, r);
      const distance = (ici[0] - vise[0]) ** 2 + (ici[1] - vise[1]) ** 2;
      if (meilleure === undefined || distance < meilleure.distance) meilleure = { en: ici, distance };
    };
    // Le carré de ce rang autour du départ : ses deux rangées, puis ses deux colonnes.
    if (rang === 0) essayer(c0, r0);
    for (let i = -rang; i <= rang && rang > 0; i++) {
      essayer(c0 + i, r0 - rang);
      essayer(c0 + i, r0 + rang);
      if (Math.abs(i) < rang) {
        essayer(c0 - rang, r0 + i);
        essayer(c0 + rang, r0 + i);
      }
    }
    if (meilleure !== undefined) return meilleure.en;
  }
  return undefined;
}
