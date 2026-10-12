/**
 * Les toiles d'un navigateur : c'est sur elles qu'on fige le décor et les pièces qu'on déplacera d'un bloc.
 * Une image figée n'est pas laissée dans une toile où l'on peut encore peindre : un navigateur la recopie à chaque image
 * qu'il compose, et le décor, qui ne bouge jamais, coûterait alors plus cher que tout ce qui bouge. On la confie
 * à une toile qui ne sait que montrer une image.
 */

import type { Polygone } from '../lowpoly/polygones';
import type { Toile } from '../scene/rendu/toile';

/** Le contexte où l'on peint : celui d'une toile de la page, ou d'une toile qu'on tient hors de la page. */
type Contexte = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** @param contexte le contexte 2D d'une toile, déjà réglé à la définition voulue. */
export function toileDe(contexte: Contexte): Toile {
  const tracer = (contours: readonly Polygone[]): void => {
    contexte.beginPath();
    for (const contour of contours) {
      contour.forEach((p, i) => (i === 0 ? contexte.moveTo(p[0], p[1]) : contexte.lineTo(p[0], p[1])));
      contexte.closePath();
    }
  };
  return {
    sous(m, peindre) {
      contexte.save();
      contexte.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      peindre();
      contexte.restore();
    },
    remplir(contours, couleur, plus = {}) {
      tracer(contours);
      contexte.globalAlpha = plus.opacite ?? 1;
      contexte.fillStyle = couleur;
      contexte.fill();
      if (plus.lisere !== undefined) {
        contexte.strokeStyle = couleur;
        contexte.lineWidth = plus.lisere;
        contexte.lineJoin = 'round';
        contexte.stroke();
      }
      contexte.globalAlpha = 1;
    },
    remplirUnTrace(trace, couleur) {
      contexte.fillStyle = couleur;
      contexte.fill(new Path2D(trace));
    },
    decouper(contours, peindre) {
      contexte.save();
      tracer(contours);
      contexte.clip();
      peindre();
      contexte.restore();
    },
  };
}

/** Vrai si ce navigateur sait peindre hors de la page et en tirer une image d'un seul geste. */
const saitPeindreHorsDeLaPage = (): boolean =>
  typeof OffscreenCanvas === 'function' && typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';

/**
 * Peint une image de cette taille, en px, et la fige : l'élément rendu ne fait plus que la montrer.
 * Si le navigateur ne sait pas peindre hors de la page, l'élément est d'abord la toile où l'on a peint ; il se remplace
 * de lui-même, dans la page, par l'image figée dès qu'elle est prête. Faute de mieux, il reste cette toile.
 */
export function figer(largeur: number, hauteur: number, peindre: (contexte: Contexte) => void): HTMLCanvasElement {
  const montre = document.createElement('canvas');
  montre.width = largeur;
  montre.height = hauteur;
  if (saitPeindreHorsDeLaPage()) {
    const horsPage = new OffscreenCanvas(largeur, hauteur);
    const contexte = horsPage.getContext('2d');
    // Une toile n'a jamais qu'un contexte : on ne demande son afficheur à celle qu'on montre que si l'autre a de quoi peindre.
    const afficheur = contexte === null ? null : montre.getContext('bitmaprenderer');
    if (contexte !== null && afficheur !== null) {
      peindre(contexte);
      afficheur.transferFromImageBitmap(horsPage.transferToImageBitmap());
      return montre;
    }
  }
  const contexte = montre.getContext('2d');
  if (contexte === null) throw new Error('Ce navigateur ne donne pas de toile où figer le décor.');
  peindre(contexte);
  if (typeof createImageBitmap === 'function') {
    createImageBitmap(montre).then(
      (image) => {
        // Une toile retirée de la page entre-temps n'a plus à être remplacée : l'image tirée pour elle est rendue.
        if (!montre.isConnected) return image.close();
        const figee = document.createElement('canvas');
        figee.width = largeur;
        figee.height = hauteur;
        const afficheur = figee.getContext('bitmaprenderer');
        if (afficheur === null) return image.close();
        figee.style.cssText = montre.style.cssText;
        afficheur.transferFromImageBitmap(image);
        montre.replaceWith(figee);
        montre.width = montre.height = 0;
      },
      // Ce navigateur ne sait pas tirer une image d'une toile : la toile peinte reste en place.
      () => undefined,
    );
  }
  return montre;
}
