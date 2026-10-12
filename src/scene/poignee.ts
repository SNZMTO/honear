/**
 * La poignée : un calque qui prend un objet dessiné une fois et le déplace d'un bloc, sans rien redessiner. Elle le glisse à l'écran,
 * et le déforme autour d'un pivot : une étiquette qui tourne dans le plan du meuble, une pochette qui se retourne et ne montre plus,
 * vue d'en haut, qu'une part de sa largeur. Le mouvement ne règle que ses transformations.
 */

import type { NomDeCalque } from '../lexique';
import type { Matrice } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import { calque, type Calque, type Dessin, type RoleDeCalque } from './calque';
import { deformation, glissement, type Reglage } from './reglage';

/** Ce qui ne déforme rien. */
export const SANS_DEFORMATION: Matrice = [1, 0, 0, 1];

/** Une poignée autour d'un objet, au repos : ni glissé, ni déformé. Le pivot est à l'écran, en px de la scène. */
export function poignee(nom: NomDeCalque, contenu: readonly Dessin[], pivot: Vec2, role?: RoleDeCalque): Calque {
  return calque(nom, contenu, {
    ...(role !== undefined ? { role } : {}),
    transformations: [
      { genre: 'glisser', de: pivot },
      { genre: 'deformer', par: SANS_DEFORMATION },
      { genre: 'glisser', de: [-pivot[0], -pivot[1]] },
    ],
  });
}

/** Ce que le mouvement règle sur une poignée : de combien elle glisse à l'écran, et comment elle déforme autour de son pivot. */
export const reglerLaPoignee = (nom: NomDeCalque, pivot: Vec2, decalage: Vec2, par: Matrice = SANS_DEFORMATION): Reglage[] => [
  glissement(nom, 0, [pivot[0] + decalage[0], pivot[1] + decalage[1]]),
  deformation(nom, 1, par),
  glissement(nom, 2, [-pivot[0], -pivot[1]]),
];
