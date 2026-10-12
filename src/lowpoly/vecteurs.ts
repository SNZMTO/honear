/**
 * Les vecteurs du meuble, à deux et trois dimensions.
 *
 * Repère du meuble, le même partout :
 *   x va vers la droite, y vient vers le joueur (le bas de l'écran), z monte.
 * Les angles sont en degrés : 0° vers la droite, 90° vers le joueur, sens des aiguilles d'une montre à l'écran.
 */

import { auRang } from './boucle';

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

export const radians = (degres: number): number => degres * DEG;
export const degres = (rad: number): number => rad / DEG;

export const plus = (p: Vec2, q: Vec2): Vec2 => [p[0] + q[0], p[1] + q[1]];
export const moins = (p: Vec2, q: Vec2): Vec2 => [p[0] - q[0], p[1] - q[1]];
export const fois = (p: Vec2, k: number): Vec2 => [p[0] * k, p[1] * k];
export const scalaire = (p: Vec2, q: Vec2): number => p[0] * q[0] + p[1] * q[1];
export const longueur = (p: Vec2): number => Math.hypot(p[0], p[1]);
export const distance = (p: Vec2, q: Vec2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
/** Le point du segment qui va de p à q, à la part t du chemin. */
export const entreDeux = (p: Vec2, q: Vec2, t: number): Vec2 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

export function unitaire(p: Vec2): Vec2 {
  const l = longueur(p);
  return l === 0 ? [0, 0] : [p[0] / l, p[1] / l];
}

/** Tourne un point autour de l'origine. Angle positif : sens des aiguilles d'une montre à l'écran. */
export function tourner(p: Vec2, angleDegres: number): Vec2 {
  const c = Math.cos(radians(angleDegres));
  const s = Math.sin(radians(angleDegres));
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}

/** Point du cercle unité à cet angle (0° vers la droite, 90° vers le joueur). */
export const direction = (angleDegres: number): Vec2 => [Math.cos(radians(angleDegres)), Math.sin(radians(angleDegres))];
/** Point à une distance et dans une direction données autour d'un centre. */
export const polaire = (centre: Vec2, rayon: number, angleDegres: number): Vec2 => plus(centre, fois(direction(angleDegres), rayon));

export const scalaire3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

export function unitaire3(p: Vec3): Vec3 {
  const l = Math.hypot(p[0], p[1], p[2]);
  return l === 0 ? [0, 0, 1] : [p[0] / l, p[1] / l, p[2] / l];
}

/** Normale d'une facette plane ou presque (méthode de Newell), unitaire. */
export function normaleDeNewell(sommets: readonly Vec3[]): Vec3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < sommets.length; i++) {
    const p = auRang(sommets, i);
    const q = auRang(sommets, i + 1);
    nx += (p[1] - q[1]) * (p[2] + q[2]);
    ny += (p[2] - q[2]) * (p[0] + q[0]);
    nz += (p[0] - q[0]) * (p[1] + q[1]);
  }
  return unitaire3([nx, ny, nz]);
}

/** Plus petit angle d'une facette dans l'espace, en degrés : la forme telle qu'elle est modelée, pas telle qu'on la voit. */
export function plusPetitAngleDansLEspace(sommets: readonly Vec3[]): number {
  let minimum = 180;
  for (let i = 0; i < sommets.length; i++) {
    const s = auRang(sommets, i);
    const avant = auRang(sommets, i - 1);
    const apres = auRang(sommets, i + 1);
    const u: Vec3 = [avant[0] - s[0], avant[1] - s[1], avant[2] - s[2]];
    const v: Vec3 = [apres[0] - s[0], apres[1] - s[1], apres[2] - s[2]];
    const produit = Math.hypot(u[0], u[1], u[2]) * Math.hypot(v[0], v[1], v[2]);
    if (produit < 1e-12) return 0;
    minimum = Math.min(minimum, degres(Math.acos(Math.min(1, Math.max(-1, scalaire3(u, v) / produit)))));
  }
  return minimum;
}
