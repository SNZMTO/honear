/**
 * Le vocabulaire des gestes d'une piste : les grandeurs qui bougent, les gestes qu'on voit partir, ce qui les porte,
 * et ce qu'une pièce rend quand elle écrit les siens.
 */

import type { Etape, Role } from '../../../mouvement/choregraphie';
import type { Amortisseur } from '../../../mouvement/chute';
import type { Coup } from '../../../mouvement/moteur';
import type { Ressort } from '../../../mouvement/ressort';
import type { Volant } from '../../../mouvement/volant';
import type { Signal } from '../instants';

/**
 * Les grandeurs qui bougent pendant une piste. Le disque : sa place, sa hauteur, de combien il est retourné, et l'angle dont il a
 * tourné sur lui-même (`disque.angle`). Son étiquette tourne avec lui ; `etiquette.recalage` est ce dont elle se décale en cachette,
 * sous ses arcs, pour qu'il s'arrête à l'endroit.
 */
export const GRANDEURS = [
  'disque.x',
  'disque.y',
  'disque.hauteur',
  'disque.retourne',
  'disque.angle',
  'etiquette.recalage',
  'reperes',
  'bras.angle',
  'bras.leve',
  'levier',
  'pastille.hauteur',
  'pastille.echelle',
  'pastille.glisse',
  'kraft.entrainee',
  'regard',
] as const;
export type Grandeur = (typeof GRANDEURS)[number];

/** Les gestes qu'on voit partir : chacun a sa ligne dans la liste des temps. */
export type NomDeGeste =
  | 'pastilleClaque'
  | 'disqueSort'
  | 'kraftEntrainee'
  | 'disqueSeSouleve'
  | 'disqueTraverse'
  | 'disqueSePose'
  | 'plateauPart'
  | 'levierMonte'
  | 'brasSeLeve'
  | 'brasPivote'
  | 'levierDescend'
  | 'brasDescend'
  | 'diamantTouche'
  | 'pastilleSeDecolle'
  | 'pastilleFile'
  | 'mainRecule'
  | 'brasTressaute'
  | 'reperesAccusent'
  | 'mainRend'
  | 'disqueReprend'
  | 'reperesSeReprennent'
  | 'levierReleve'
  | 'brasReleve'
  | 'moteurCoupe'
  | 'brasRetourne'
  | 'regardGlisse'
  | 'brasSeRepose'
  | 'disqueSEleve'
  | 'disqueSeRetourne'
  | 'disqueSeTasse';

/**
 * Ce qui porte un geste, quand ce n'est pas le ressort de sa consigne : le volant du plateau, lancé ou laissé à son frottement ;
 * une chute freinée, de tant de px, que ce qui la reçoit arrête net ; la main qui mène le disque, et le ressort par lequel il la suit ;
 * la même main qui le retourne, jusqu'à ce qu'il retombe à plat, au bout de `duree`.
 */
export type Porteur =
  | { readonly genre: 'lancement' | 'frottement'; readonly volant: Volant }
  | { readonly genre: 'chute'; readonly amortisseur: Amortisseur; readonly hauteur: number }
  | { readonly genre: 'main'; readonly main: Ressort; readonly suit: Ressort }
  | { readonly genre: 'retournement'; readonly main: Ressort; readonly suit: Ressort; readonly duree: number };

/** Quand un geste part : tant de secondes après un signal, ou avant lui si c'est négatif. */
export interface Depart {
  readonly signal: Signal;
  readonly apres: number;
  /** Son nom dans la liste des temps. Sans nom, c'est une suite qu'on ne voit pas partir : le bras arrivé au bout de sa descente. */
  readonly nom?: NomDeGeste;
  readonly porte?: Porteur;
}

/** Un geste : ce qu'une grandeur fait à partir d'un instant. */
export interface Geste extends Etape, Depart {}

/** Un coup donné à une grandeur de la piste : il ne change pas sa consigne, seulement sa vitesse. */
export interface CoupDeLaPiste extends Coup<Grandeur>, Depart {}

export interface GestesDeLaPiste {
  readonly roles: Readonly<Record<Grandeur, Role<Geste>>>;
  readonly coups: readonly CoupDeLaPiste[];
}

/**
 * Ce qu'on peut retirer aux gestes quand l'appareil peine : les réactions passagères des pièces voisines (le tassement du disque,
 * le rebond du diamant, le tressaut du bras, son ondulation, les repères qui accusent le coup). L'action principale ne change pas
 * d'un instant, et aucune pièce ne finit ailleurs : alléger la scène en route ne déplace rien. La pochette kraft, que le disque
 * entraîne pour de bon, l'est donc toujours.
 */
export interface OptionsDeGestes {
  readonly reactions: boolean;
}

export const AVEC_TOUT: OptionsDeGestes = { reactions: true };

/** Les gestes d'une ou plusieurs grandeurs : ce qu'une pièce écrit pour elles, et les coups qu'elle leur donne. */
export interface GestesDe<G extends Grandeur> {
  readonly etapes: Readonly<Record<G, readonly Geste[]>>;
  readonly coups?: readonly CoupDeLaPiste[];
}
