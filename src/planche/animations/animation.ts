/**
 * Une animation de la planche : une part du meuble dessinée une fois, un geste qui la fait bouger, et ce qu'il règle sur elle.
 * Rien n'y est redessiné : on ne règle que des transformations et des opacités. La planche vivante de l'étape 7 la suit image après
 * image, au ralenti s'il le faut, en version sobre, et l'interrompt en route : elle reprend alors d'où elle est, avec sa vitesse.
 * La lecture qui la suit est la même pour la page et pour les tests.
 */

import { creerLeMoteur, type Moteur, type Partition } from '../../mouvement/moteur';
import { GESTES, TOLERANCES } from '../../ressources/mouvement';
import type { Calque } from '../../scene/calque';
import { enSobre, partitionDuGeste, type Geste } from '../../scene/gestes/geste';
import type { Regard } from '../../scene/meuble';
import type { Reglage } from '../../scene/reglage';
import { empriseDe } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import type { LEGENDES_DES_ECRANS } from '../etape5/legendes.fr';

export type CleDAnimation = keyof typeof LEGENDES_DES_ECRANS.animations;
export type Valeurs = Readonly<Record<string, number>>;

export interface Animation<N extends string = string> {
  readonly cle: CleDAnimation;
  readonly titre: string;
  readonly texte: string;
  /** Toute la part du meuble que son regard parcourra : la scène est dessinée sur elle. */
  readonly etendue: Regard;
  /** La scène, dessinée une fois, chaque pièce qui bouge à une place d'où le mouvement la mène. */
  readonly scene: Calque;
  readonly geste: Geste<N>;
  /**
   * Ce que le mouvement règle sur la scène, d'après où en est chaque grandeur, à l'instant t. Toujours les mêmes calques, quel que soit
   * l'instant : la scène est montée une fois pour eux.
   */
  regler(valeurs: Readonly<Record<N, number>>, t: number): Reglage[];
  /** Ce qu'on voit à cet instant : un regard fixe, ou qui glisse avec le geste. */
  regard(valeurs: Readonly<Record<N, number>>): Regard;
  /**
   * L'état qui change en route : à l'instant a, le geste qui reprend d'où en est chaque grandeur, et ce qui a changé, dit en une phrase.
   * Il a les grandeurs du geste d'origine, pas une de plus : le moteur les suit déjà, chacune repart avec sa vitesse.
   */
  readonly interruption: { readonly a: number; readonly ceQuiChange: string };
  interrompre(a: number, valeurs: Readonly<Record<N, number>>): Geste<N>;
  /** Ses instants marquants, pour une pellicule : en secondes depuis son départ, et leurs noms. */
  readonly images: readonly { readonly apres: number; readonly nom: string }[];
  /** Ce que la planche grossit ses images : une pochette de 48 px se regarde de près. */
  readonly grossissement: number;
}

/** Une part d'un regard : depuis son coin haut-gauche, en px, sa largeur et sa hauteur. */
export const partDe = (regard: Regard, x: number, y: number, largeur: number, hauteur: number): Regard => ({
  origine: [regard.origine[0] + x, regard.origine[1] + y],
  largeur,
  hauteur,
});

/** Une part du cadre autour d'un point du regard. */
export const autourDe = (regard: Regard, en: readonly [number, number], largeur: number, hauteur: number): Regard =>
  partDe(regard, en[0] - largeur / 2, en[1] - hauteur / 2, largeur, hauteur);

/** La marge autour d'un objet qu'on regarde de près, en px. */
const MARGE = 10;

/** Le cadre qui tient un objet entier, avec une marge : l'ampli, de près. */
export function autourDeLObjet(objet: Calque, encrier: Encrier): Regard {
  const e = empriseDe([objet], encrier.largeur);
  if (e === undefined) throw new Error(`Le calque « ${objet.nom} » ne dessine rien.`);
  return { origine: [e.x - MARGE, e.y - MARGE], largeur: e.largeur + 2 * MARGE, hauteur: e.hauteur + 2 * MARGE };
}

/** Une animation suivie depuis son départ : où en est chaque grandeur, et le geste qu'elle suit, l'original ou l'interrompu. */
export interface Lecture {
  /** Avance jusqu'à l'instant t, en secondes depuis le départ, et dit où en est chaque grandeur. */
  avancer(t: number): Valeurs;
  /** L'état change à l'instant où elle en est : le geste n'est plus le même, chaque grandeur repart d'où elle est. */
  interrompre(): void;
  readonly geste: Geste<string>;
  readonly interrompue: boolean;
}

/** Ce qu'on rejoue avant le départ, au repos : de quoi poser chaque grandeur. */
const AVANT = GESTES.rejeu.avant;

const lireLeMoteur = (moteur: Moteur<string>, geste: Geste<string>): Valeurs =>
  Object.fromEntries(Object.keys(geste.roles).map((nom) => [nom, moteur.valeur(nom)]));

/**
 * Suit une animation depuis son départ, avec le moteur du site : c'est ce que fait un écran. En version sobre, chaque grandeur est
 * d'un coup à l'arrivée de son dernier pas parti.
 */
export function lireUneAnimation(animation: Animation, sobre: boolean): Lecture {
  let geste: Geste<string> = animation.geste;
  let partition: Partition<string> = partitionDuGeste(geste);
  let interrompue = false;
  let instant = -AVANT;
  const moteur = creerLeMoteur<string>(TOLERANCES);
  moteur.poser(partition, instant);
  const valeurs = (): Valeurs => (sobre ? enSobre(geste, instant) : lireLeMoteur(moteur, geste));
  return {
    avancer(t) {
      if (!sobre && t > instant) moteur.avancer(partition, t);
      instant = Math.max(instant, t);
      return valeurs();
    },
    interrompre() {
      if (interrompue) return;
      interrompue = true;
      geste = animation.interrompre(instant, valeurs());
      partition = partitionDuGeste(geste);
      // Le moteur prend tout de suite le nouveau geste, là où il en est : les grandeurs qu'il ajoute s'y posent.
      if (!sobre) moteur.avancer(partition, instant);
    },
    get geste() {
      return geste;
    },
    get interrompue() {
      return interrompue;
    },
  };
}

/** Où en est chaque grandeur à l'instant t, l'animation suivie depuis son départ par pas fins ; interrompue en route si on le demande. */
export function valeursA(animation: Animation, t: number, o: { readonly sobre?: boolean; readonly interrompue?: boolean } = {}): Valeurs {
  const lecture = lireUneAnimation(animation, o.sobre === true);
  const { pas } = GESTES.rejeu;
  const interruption = o.interrompue === true ? animation.interruption.a : Infinity;
  let v = lecture.avancer(-AVANT);
  for (let instant = -AVANT; instant < t;) {
    const suivant = Math.min(t, instant + pas);
    // L'interruption tombe à son instant, pas au pas d'après.
    if (instant < interruption && suivant >= interruption) {
      lecture.avancer(interruption);
      lecture.interrompre();
    }
    instant = suivant;
    v = lecture.avancer(instant);
  }
  return v;
}
