/**
 * Toutes les animations de la planche, dans l'ordre où elle les montre : la tablée, puis le meuble. Chacune se fait à la demande.
 * Le décompte, l'extrait, la rayure et la révélation du disque sont ceux de l'atelier de l'étape 2 : ils ne sont pas ici.
 */

import type { Ecritoire } from '../../scene/telephone/pieces';
import type { Animation, CleDAnimation } from './animation';
import { ANIMATIONS_DU_MEUBLE } from './meuble';
import { ANIMATIONS_DE_LA_TABLEE } from './tablee';

export type { Animation, CleDAnimation, Lecture, Valeurs } from './animation';
export { lireUneAnimation, valeursA } from './animation';

const FABRIQUES: Readonly<Record<CleDAnimation, (a: Ecritoire) => Animation>> = { ...ANIMATIONS_DE_LA_TABLEE, ...ANIMATIONS_DU_MEUBLE };

/** Les clés des animations, dans l'ordre de la planche. */
export const CLES_DES_ANIMATIONS = Object.keys(FABRIQUES) as CleDAnimation[];

export const uneAnimation = (a: Ecritoire, cle: CleDAnimation): Animation => FABRIQUES[cle](a);

export const lesAnimations = (a: Ecritoire): Animation[] => CLES_DES_ANIMATIONS.map((cle) => uneAnimation(a, cle));
