/**
 * Les animations de l'étape 5, en pellicules : chaque animation de la planche (`planche/animations/`) arrêtée à ses instants marquants,
 * sur le même meuble que les écrans, dans la part du cadre où elle a lieu. La pellicule ne redessine rien : elle rejoue le geste
 * jusqu'à l'instant, puis règle la scène dessinée une fois, comme le fait la planche vivante de l'étape 7. Les gestes sont ceux du site
 * (`scene/gestes/`). Le décompte, l'extrait, la rayure et la révélation du disque sont ceux de l'atelier de l'étape 2.
 */

import type { Textes } from '../../ressources/textes';
import { regler } from '../../scene/reglage';
import type { Encrier } from '../../scene/rendu/texte';
import { lesAnimations, valeursA, type CleDAnimation } from '../animations';
import type { ImageDePlanche } from '../image';

export interface Pellicule {
  readonly cle: CleDAnimation;
  readonly titre: string;
  readonly texte: string;
  readonly images: readonly ImageDePlanche[];
  /** Ce que la page grossit ses images : une pochette de 48 px se regarde de près. */
  readonly grossissement: number;
}

export function pelliculesDesAnimations(textes: Textes, encrier: Encrier): Pellicule[] {
  return lesAnimations({ textes, encrier }).map((animation) => ({
    cle: animation.cle,
    titre: animation.titre,
    texte: animation.texte,
    grossissement: animation.grossissement,
    images: animation.images.map(({ apres, nom }, rang) => {
      const v = valeursA(animation, apres);
      return {
        fichier: `anim-${animation.cle}-${rang + 1}`,
        titre: nom,
        regard: animation.regard(v),
        scene: regler(animation.scene, animation.regler(v, apres)),
      };
    }),
  }));
}
