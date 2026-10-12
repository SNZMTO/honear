/**
 * Une image d'une planche : une scène, et le regard par lequel on la voit.
 */

import type { Calque } from '../scene/calque';
import type { Regard } from '../scene/meuble';

export interface ImageDePlanche {
  readonly fichier: string;
  readonly titre: string;
  readonly scene: Calque;
  readonly regard: Regard;
  /** Grossissement à l'affichage : absent, l'image est à sa taille. */
  readonly echelle?: number;
}
