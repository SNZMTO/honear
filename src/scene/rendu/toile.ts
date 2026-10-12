/**
 * Peint un arbre de calques sur une toile : c'est ainsi qu'un écran fige le décor, ou une pièce entière, en image.
 * Les mêmes polygones à plat que le SVG, dans le même ordre, avec le même liseré : les deux écritures donnent la même image.
 */

import type { Polygone } from '../../lowpoly/polygones';
import { couleur } from '../../lowpoly/tons';
import type { Dessin, Texte } from '../calque';
import { LISERE, parCouleur } from './peinture';
import { affineDeToutes, type Affine } from './transformation';

/** Ce qu'il faut savoir faire pour qu'on peigne sur vous : le peu d'une toile de navigateur dont on se sert. */
export interface Toile {
  /** Tout ce que `peindre` peint l'est sous cette transformation. */
  sous(m: Affine, peindre: () => void): void;
  /** Remplit des polygones d'une couleur, avec un liseré de la même couleur si on en donne la largeur. */
  remplir(contours: readonly Polygone[], couleur: string, plus?: { readonly opacite?: number; readonly lisere?: number }): void;
  /** Remplit un tracé écrit comme dans un SVG : les lettres d'un texte. */
  remplirUnTrace(trace: string, couleur: string): void;
  /** Tout ce que `peindre` peint ne se voit que dans ces contours. */
  decouper(contours: readonly Polygone[], peindre: () => void): void;
}

/** @param tracerLeTexte tracé d'un texte, dans le repère de son calque. Voir rendu/texte.ts. */
export function peindreSurUneToile(toile: Toile, dessin: Dessin, tracerLeTexte: (texte: Texte) => string): void {
  switch (dessin.genre) {
    case 'peinture':
      for (const [c, groupe] of parCouleur(dessin.facettes))
        toile.remplir(
          groupe.map((f) => f.contour),
          c,
          { lisere: LISERE },
        );
      break;
    case 'aplat':
      toile.remplir(dessin.contours, couleur(dessin.teinte, dessin.ton), dessin.opacite !== undefined ? { opacite: dessin.opacite } : {});
      break;
    case 'texte':
      toile.remplirUnTrace(tracerLeTexte(dessin), couleur(dessin.teinte, dessin.ton));
      break;
    case 'calque': {
      const opacite = dessin.opacite ?? 1;
      // Un calque caché ne laisse rien sur la toile : s'il doit se montrer un jour, il n'est pas figé.
      if (opacite <= 0) return;
      if (opacite < 1) throw new Error(`Le calque « ${dessin.nom} » est à demi transparent : une toile ne sait figer que ce qui est tout à fait là.`);
      const peindre = (): void =>
        toile.sous(affineDeToutes(dessin.transformations ?? []), () => {
          for (const d of dessin.contenu) peindreSurUneToile(toile, d, tracerLeTexte);
        });
      // La découpe est donnée hors des transformations du calque : elle se pose avant elles.
      if (dessin.decoupe !== undefined) toile.decouper(dessin.decoupe, peindre);
      else peindre();
      break;
    }
  }
}
