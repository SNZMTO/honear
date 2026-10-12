/**
 * La grille des px de l'appareil, pour une scène montée à une définition donnée. Une toile posée entre deux px est
 * rééchantillonnée par le navigateur, donc floue : tout ce qui porte des toiles se pose sur cette grille.
 */

import type { Emprise } from '../../scene/rendu/emprise';

export interface Grille {
  /** Px de toile par px de scène. */
  readonly definition: number;
  /** Une longueur de la scène, au plus près sur la grille. */
  auPlusPres(longueur: number): number;
  /** Le plus petit rectangle de la grille qui contient celui-ci : une toile posée ainsi ne laisse rien au navigateur à arrondir. */
  couvrir(boite: Emprise): Emprise;
}

export function grilleDe(definition: number): Grille {
  const D = definition;
  return {
    definition,
    auPlusPres: (longueur) => Math.round(longueur * D) / D,
    couvrir(boite) {
      const [x, y] = [Math.floor(boite.x * D) / D, Math.floor(boite.y * D) / D];
      return { x, y, largeur: Math.ceil((boite.x + boite.largeur - x) * D) / D, hauteur: Math.ceil((boite.y + boite.hauteur - y) * D) / D };
    },
  };
}

/** Le plus petit rectangle à coordonnées entières qui contient celui-ci : la boîte d'un SVG, dont le contenu se dessine où il faut de toute façon. */
export function aLUnite(boite: Emprise): Emprise {
  const [x, y] = [Math.floor(boite.x), Math.floor(boite.y)];
  return { x, y, largeur: Math.ceil(boite.x + boite.largeur) - x, hauteur: Math.ceil(boite.y + boite.hauteur) - y };
}
