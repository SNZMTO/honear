/**
 * Le bouton moleté : un plot aux flancs striés, coiffé d'un dessus à peine bombé.
 * Ses facettes sont fixes sous la lampe : les claires restent de son côté. Ce qui tourne, c'est son index, dessiné à part.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { rayonRentre } from '../contours';
import type { Maille } from '../facette';
import type { Vec2 } from '../vecteurs';
import { contourDePlot, plot } from './plot';

export interface Bouton {
  readonly centre: Vec2;
  /** Hauteur du dessous au-dessus du bois, en px visibles. */
  readonly base: number;
  /** Épaisseur visible, en px (6 px pour les boutons de la platine), sommet du dessus compris. */
  readonly epaisseur: number;
  readonly rayon: number;
  /** Nombre de pans : au moins 16. Pair, pour que le moletage se referme. */
  readonly pans: number;
  readonly teinte: NomDeTeinte;
  readonly chanfrein: number;
}

/** Le dessus, en parts de son rayon : une lèvre plate, une couronne en pente, une gorge, un cœur plat ; et ce dont la couronne monte. */
const DESSUS = { couronne: 0.9, gorge: 0.62, coeur: 0.54, monte: 0.052 } as const;

/** Un pan du bouton fait face au joueur : son premier sommet est décalé d'un demi-pan. */
const dephasage = (b: Pick<Bouton, 'pans'>): number => 180 / b.pans;

/** Contour au sol d'un bouton : le même sert à son volume et à son ombre. */
export const contourDeBouton = (b: Pick<Bouton, 'centre' | 'rayon' | 'pans'>): Vec2[] => contourDePlot({ ...b, dephasage: dephasage(b) });

export function boutonMolete(b: Bouton): Maille {
  // Le dessus monte un peu vers son cœur : ses facettes du côté de la lampe sont plus claires.
  const monte = rayonRentre(b.rayon, b.chanfrein, b.pans) * DESSUS.monte;
  return plot({
    centre: b.centre,
    base: b.base,
    epaisseur: b.epaisseur - monte,
    rayon: b.rayon,
    pans: b.pans,
    chanfrein: b.chanfrein,
    teinte: b.teinte,
    dephasage: dephasage(b),
    moletage: true,
    dessus: (rayon) => [
      { de: rayon, a: rayon * DESSUS.couronne, teinte: b.teinte },
      { de: rayon * DESSUS.couronne, a: rayon * DESSUS.gorge, teinte: b.teinte, monte },
      // Une gorge fine, un ton plus sombre, sépare la couronne du cœur.
      { de: rayon * DESSUS.gorge, a: rayon * DESSUS.coeur, teinte: b.teinte, nuance: -1 },
      { de: rayon * DESSUS.coeur, a: 0, teinte: b.teinte },
    ],
  });
}
