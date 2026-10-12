/**
 * Ce qui ne bougera pas, figé sur une toile : des dessins peints une fois, à leur place dans leur conteneur.
 */

import { agrandir, croiser, empriseDe, reunir, type Emprise } from '../../scene/rendu/emprise';
import { peindreSurUneToile } from '../../scene/rendu/toile';
import { figer, toileDe } from '../toile';
import { POSE, type APoser, type Lettrage } from './couche';
import type { Grille } from './grille';

/** Marge d'une toile autour de ce qu'elle porte, en px : la place du liseré et de l'anticrénelage. */
const MARGE_DE_TOILE = 1;

/**
 * Fige des dessins sur une toile, et la pose à la fin du conteneur. Rien n'est posé s'ils n'ont rien à montrer.
 * @param limite l'étendue au-delà de laquelle on ne fige rien : celle que le regard pourra parcourir.
 */
export function figerSurUneToile(
  conteneur: HTMLElement,
  figes: readonly APoser[],
  o: { readonly grille: Grille; readonly limite?: Emprise; readonly lettrage: Lettrage },
): void {
  const { grille, limite, lettrage } = o;
  const D = grille.definition;
  let boite = figes.reduce((cumul: Emprise | undefined, { dessin, sous }) => reunir(cumul, empriseDe([dessin], lettrage.mesurer, sous)), undefined);
  if (boite !== undefined) boite = agrandir(boite, MARGE_DE_TOILE);
  if (boite !== undefined && limite !== undefined) boite = croiser(boite, limite);
  if (boite === undefined) return;
  const { x, y, largeur, hauteur } = grille.couvrir(boite);
  const canvas = figer(Math.round(largeur * D), Math.round(hauteur * D), (contexte) => {
    contexte.setTransform(D, 0, 0, D, -x * D, -y * D);
    const toile = toileDe(contexte);
    for (const { dessin, sous } of figes) toile.sous(sous, () => peindreSurUneToile(toile, dessin, lettrage.tracerLeTexte));
  });
  // La toile a pour taille le nombre de ses px, et c'est sa transformation qui la pose et la ramène à l'échelle : placée par ses
  // marges ou dimensionnée en fractions de px, un navigateur l'arrondit et la rééchantillonne, et tout ce qu'elle porte devient flou.
  canvas.style.cssText = `${POSE}width:${canvas.width}px;height:${canvas.height}px;transform:translate(${x}px,${y}px) scale(${1 / D});pointer-events:none;`;
  conteneur.append(canvas);
}
