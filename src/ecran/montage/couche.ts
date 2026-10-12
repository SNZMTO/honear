/**
 * Une couche d'une scène montée : une toile, un SVG ou un bloc, posé dans le coin haut-gauche de son conteneur.
 * Seule sa transformation le déplace : le navigateur le compose sans rien remettre en page.
 */

import type { Dessin, Mesure, Texte } from '../../scene/calque';
import type { Affine } from '../../scene/rendu/transformation';

/** Le style qui pose une couche. */
export const POSE = 'position:absolute;left:0;top:0;transform-origin:0 0;';

/** Un dessin à mettre dans une couche, et la transformation que ses parents figés lui imposent. */
export interface APoser {
  readonly dessin: Dessin;
  readonly sous: Affine;
}

/** Le lettrage d'une couche : de quoi mesurer ses textes, et les tracer. */
export interface Lettrage {
  readonly mesurer: Mesure;
  readonly tracerLeTexte: (texte: Texte) => string;
}
