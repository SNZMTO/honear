/**
 * Le montage : une scène posée dans une page de navigateur. Ce qui n'y bougera pas est peint une fois sur des toiles,
 * comme un décor ; une pièce qu'on déplace d'un bloc devient un conteneur à elle, avec ses toiles ; ce qui bouge en restant
 * en polygones (une étiquette, le bras, une ombre) reste en SVG. Après quoi on ne règle plus que des transformations
 * et des opacités : aucun polygone n'est redessiné.
 */

import type { NomDeCalque } from '../lexique';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Calque, Dessin, Mesure, Texte } from '../scene/calque';
import type { Regard } from '../scene/meuble';
import type { Reglage } from '../scene/reglage';
import { ouvrirLeChantier } from './montage/chantier';
import { POSE } from './montage/couche';
import { grilleDe } from './montage/grille';
import { lacherLesToiles, retirer } from './montage/lacher';
import { marqueSuivante } from './montage/marque';
import { reglerLesPoignees } from './montage/poignees';

export interface OptionsDeMontage {
  /** Toute la portion du meuble que le regard pourra parcourir : le décor est figé sur cette étendue. */
  readonly etendue: Regard;
  /** Les calques que le mouvement réglera, par leur nom. Tout le reste est figé une fois pour toutes. */
  readonly reglables: ReadonlySet<NomDeCalque>;
  /** Les calques dont on changera le contenu en cours de route : un verso qu'on ne connaît qu'à la révélation. Chacun est un bloc. */
  readonly remplacables?: ReadonlySet<NomDeCalque>;
  /** Px de toile par px de scène : la densité de l'écran, fois l'échelle à laquelle la scène est montrée. */
  readonly definition: number;
  /** Largeur et tracé des textes. */
  readonly mesurer: Mesure;
  readonly tracerLeTexte: (texte: Texte) => string;
}

/** Ce qu'un montage a fabriqué : ses toiles et ce qu'elles pèsent, ses SVG, et les calques qu'on peut y régler. */
export interface BilanDeMontage {
  readonly toiles: number;
  readonly pxDeToile: number;
  readonly svg: number;
  readonly reglables: number;
}

export interface Montage {
  /** La scène montée : à poser dans un cadre de la taille du regard, qui la rogne. */
  readonly element: HTMLElement;
  regler(reglages: readonly Reglage[]): void;
  /** Pose le regard : le coin haut-gauche de ce qu'on voit, en px de la scène. */
  regarder(origine: Vec2): void;
  /**
   * Remplace ce que contient un calque remplaçable : sur des toiles, ou en SVG s'il est de ceux qui restent en polygones.
   * @throws si le nouveau contenu ne peut pas être posé : le calque garde alors ce qu'il portait.
   */
  remplir(calque: NomDeCalque, contenu: readonly Dessin[]): void;
  bilan(): BilanDeMontage;
  /** Retire la scène de la page et lâche ses toiles. */
  demonter(): void;
}

/** @throws si un calque à régler ou à remplir n'est pas dans la scène, ou si le navigateur ne donne pas de toile. */
export function monter(scene: Calque, o: OptionsDeMontage): Montage {
  const grille = grilleDe(o.definition);
  const remplacables: ReadonlySet<NomDeCalque> = o.remplacables ?? new Set();
  const chantier = ouvrirLeChantier({
    etendue: { x: o.etendue.origine[0], y: o.etendue.origine[1], largeur: o.etendue.largeur, hauteur: o.etendue.hauteur },
    reglables: o.reglables,
    remplacables,
    grille,
    marque: marqueSuivante(),
    lettrage: { mesurer: o.mesurer, tracerLeTexte: o.tracerLeTexte },
  });
  const racine = document.createElement('div');
  racine.style.cssText = POSE;
  const { poignees } = chantier;
  try {
    chantier.poserLaScene(scene, racine);
    const manquants = [...o.reglables, ...remplacables].filter((nom) => !poignees.has(nom));
    if (manquants.length > 0) throw new Error(`Calques à régler ou à remplir qui ne sont pas dans la scène : ${manquants.join(', ')}.`);
  } catch (erreur) {
    // Un montage qui s'arrête en route ne garde rien : les toiles déjà peintes sont lâchées.
    lacherLesToiles([racine]);
    throw erreur;
  }

  let regarde = '';
  function regarder(origine: Vec2): void {
    const ecrit = `translate(${-grille.auPlusPres(origine[0])}px,${-grille.auPlusPres(origine[1])}px)`;
    if (ecrit === regarde) return;
    regarde = ecrit;
    racine.style.transform = ecrit;
  }
  regarder(o.etendue.origine);

  return {
    element: racine,
    regler: (reglages) => reglerLesPoignees(poignees, reglages, grille),
    regarder,
    remplir(calque, contenu) {
      const bloc = poignees.get(calque);
      if (bloc === undefined || bloc.genre !== 'bloc' || !remplacables.has(calque))
        throw new Error(`Le calque « ${calque} » n'a pas été monté pour qu'on en change le contenu.`);
      // Le nouveau contenu d'abord, posé à la suite de l'ancien, tout ou rien : l'ancien ne s'en va que si le nouveau a pu être fait.
      const anciens = Array.from(bloc.element.children);
      chantier.garnir(bloc, contenu);
      retirer(anciens);
    },
    bilan() {
      const toiles = Array.from(racine.querySelectorAll('canvas'));
      return {
        toiles: toiles.length,
        pxDeToile: toiles.reduce((somme, toile) => somme + toile.width * toile.height, 0),
        svg: racine.querySelectorAll('svg').length,
        reglables: poignees.size,
      };
    },
    demonter() {
      retirer([racine]);
    },
  };
}
