/**
 * La tête facettée : un dôme aux joues pleines, au contour assez découpé pour paraître rond,
 * fermé au sommet par trois facettes plutôt qu'un grand polygone. Rien d'anguleux.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import type { Maille } from '../facette';
import type { Vec2 } from '../vecteurs';
import { dome } from './dome';

export interface Tete {
  readonly centre: Vec2;
  /** Demi-largeur et demi-hauteur du visage. */
  readonly rayons: Vec2;
  /** Sommets de chaque couronne, du contour vers le milieu du visage, et leur rayon en part du contour. */
  readonly couronnes: readonly number[];
  readonly retraits: readonly number[];
  /** Au-delà de 2, les joues sont plus pleines qu'une ellipse. */
  readonly galbe: number;
  /** Saillie du milieu du visage, en part de sa demi-largeur. */
  readonly relief: number;
  /** Le bosselage qui donne à chaque petite facette son propre ton (voir dome.ts). */
  readonly bosses: { readonly amplitude: number; readonly germe: number };
  readonly teinte: NomDeTeinte;
}

export function teteFacettee(t: Tete): Maille {
  return dome({
    centre: t.centre,
    rayons: t.rayons,
    relief: t.rayons[0] * t.relief,
    couronnes: t.couronnes,
    retraits: t.retraits,
    sommet: 3,
    galbe: t.galbe,
    bosses: t.bosses,
    dephasage: -90,
    teinte: t.teinte,
  });
}
