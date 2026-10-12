/**
 * La projection, en gestes : poser un point du meuble à l'écran, le reprendre, dire si une face se voit.
 * Les objets sont extrudés droit vers le bas de l'écran. Son seul réglage, l'écrasement, est dans les ressources.
 */

import { PROJECTION } from '../ressources/projection';
import { radians, scalaire3, type Vec2, type Vec3 } from './vecteurs';

/** Écrasement vertical : ce que devient 1 px de profondeur du meuble à l'écran. */
export const ECRASEMENT: number = PROJECTION.ecrasement;

/** Ce que devient 1 unité de hauteur à l'écran, pour la même vue (regard incliné d'environ 28°). */
const REDRESSEMENT = Math.sqrt(1 - ECRASEMENT * ECRASEMENT);

/** Direction du regard, de la scène vers l'œil. */
const VERS_L_OEIL: Vec3 = [0, REDRESSEMENT, ECRASEMENT];

/** Un point du plan du meuble, à une hauteur donnée en px visibles au-dessus du bois, tel qu'on le voit à l'écran. */
export const surLEcran = (p: Vec2, hauteurVisible = 0): Vec2 => [p[0], ECRASEMENT * p[1] - hauteurVisible];

/** L'inverse : le point du plan du meuble qu'on voit à cet endroit de l'écran, pour une hauteur donnée. */
export const depuisLEcran = (p: Vec2, hauteurVisible = 0): Vec2 => [p[0], (p[1] + hauteurVisible) / ECRASEMENT];

/** Du meuble à l'écran, pour un point dans l'espace (hauteur en unités du meuble). */
export const projeter = (p: Vec3): Vec2 => surLEcran([p[0], p[1]], REDRESSEMENT * p[2]);

/**
 * Hauteur à donner à un objet pour que son épaisseur visible fasse ce nombre de px à l'écran
 * (socle de la platine 16 px, boutons 6 px, tranche des pochettes 3 px).
 */
export const hauteurPour = (pxVisibles: number): number => pxVisibles / REDRESSEMENT;

/** Vrai si une facette de cette normale est tournée vers l'œil. */
export const estVisible = (normale: Vec3): boolean => scalaire3(normale, VERS_L_OEIL) > 1e-6;

/** Une déformation à l'écran, sans déplacement : x′ = a·x + c·y, y′ = b·x + d·y. L'ordre est celui d'une matrice SVG ou CSS. */
export type Matrice = readonly [a: number, b: number, c: number, d: number];

/** La même forme, plus grande ou plus petite, autour de son origine. */
export const grossissement = (de: number): Matrice => [de, 0, 0, de];

/** Une pièce couchée qui tourne de tant de degrés dans le plan du meuble, vue à l'écran : la rotation, sous l'écrasement. */
export function tourneeSurLeMeuble(angle: number): Matrice {
  const [c, s] = [Math.cos(radians(angle)), Math.sin(radians(angle))];
  return [c, ECRASEMENT * s, -s / ECRASEMENT, c];
}

/**
 * Une pièce couchée qu'on penche : chacun de ses points se déplace à l'écran de `de` px par px de distance au pivot,
 * la distance étant comptée dans le plan du meuble le long de la direction `axe` (en degrés). Un bras dont la tête se lève,
 * et son ombre, qui s'éloigne d'autant plus que la tête est haute. Elle s'applique aux points déjà écrasés, autour du pivot.
 */
export function penchement(axe: number, de: Vec2): Matrice {
  const [gx, gy] = [Math.cos(radians(axe)), Math.sin(radians(axe)) / ECRASEMENT];
  return [1 + de[0] * gx, de[1] * gx, de[0] * gy, 1 + de[1] * gy];
}

/**
 * Ce que devient à l'écran un disque à plat qu'on retourne autour de son axe gauche-droite, son bord le plus proche
 * du joueur se levant d'abord. `angle` va de 0 (à l'endroit) à 180 degrés (retourné). On rend :
 * - `aplatissement` : la part qui reste de sa profondeur à l'écran, par rapport au disque à plat (négative quand on voit l'autre face) ;
 * - `montee` : ce dont monte un de ses points, en px visibles, par px de profondeur telle qu'on la voit quand il est à plat.
 * Le disque passe par la tranche avant le quart de tour, parce qu'on le regarde de biais ; et sa seconde face
 * paraît un instant toute ronde, quand elle est tournée droit vers l'œil.
 */
export function retournement(angle: number): { readonly aplatissement: number; readonly montee: number } {
  const a = radians(angle);
  const biais = REDRESSEMENT / ECRASEMENT;
  return { aplatissement: Math.cos(a) - biais * Math.sin(a), montee: biais * Math.sin(a) };
}
