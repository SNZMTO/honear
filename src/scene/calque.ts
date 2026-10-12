/**
 * Les calques : l'arbre de ce qui est dessiné, et ce dont il est fait (facettes peintes, aplats, textes).
 * Chaque pièce qui bouge est un calque à part, et son ombre aussi : on règle leurs transformations,
 * on n'anime jamais leurs polygones un par un.
 */

import type { NomDeCalque } from '../lexique';
import type { FacettePeinte } from '../lowpoly/facette';
import type { Nuance } from '../lowpoly/ombrage';
import type { Polygone } from '../lowpoly/polygones';
import { surLEcran, type Matrice } from '../lowpoly/projection';
import { TON_DE_BASE, type IndiceDeTon } from '../lowpoly/tons';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { NomDeTeinte } from '../ressources/palette';
import type { RoleDeTexte } from '../ressources/typo';

/**
 * Les transformations d'un calque, une par groupe du SVG : le mouvement sait laquelle régler, par son rang.
 * Une pièce qui bougera porte dès l'arrêt toutes les siennes, même sans effet : on n'en ajoute jamais en route.
 */
export type Transformation =
  /** Déplacement à l'écran, en px. */
  | { readonly genre: 'glisser'; readonly de: Vec2 }
  /** Passage du plan du meuble à l'écran : la profondeur est écrasée de 12 %. */
  | { readonly genre: 'ecraser' }
  /** Rotation dans le plan du meuble, en degrés, sens horaire. */
  | { readonly genre: 'tourner'; readonly de: number }
  /** Déformation à l'écran, autour de l'origine du calque : une pièce qu'on penche, un disque qu'on retourne, une pastille qui arrive plus grande. */
  | { readonly genre: 'deformer'; readonly par: Matrice };

/** Des facettes déjà mises en ton par la fonction d'ombrage. Elles ne se recouvrent pas entre elles. */
export interface Peinture {
  readonly genre: 'peinture';
  readonly facettes: readonly FacettePeinte[];
}

/**
 * Une ou plusieurs formes d'un seul ton, que la lampe ne choisit pas facette par facette : une encre
 * (un trait imprimé, un repère gravé, le blanc d'un œil), une ombre portée, ou une surface entière
 * qui prend l'une des deux pentes toutes faites de l'ombrage (`tonAPlat`, `tonDuFlanc`).
 * Deux contours de sens opposés font un trou : c'est ainsi qu'on dessine un anneau.
 */
export interface Aplat {
  readonly genre: 'aplat';
  readonly contours: readonly Polygone[];
  readonly teinte: NomDeTeinte;
  readonly ton: IndiceDeTon;
  readonly opacite?: number;
}

/** Une encre prend la valeur de base de sa teinte, sauf si on lui en donne une autre. */
export const aplat = (contours: readonly Polygone[], teinte: NomDeTeinte, ton: IndiceDeTon = TON_DE_BASE, opacite?: number): Aplat => ({
  genre: 'aplat',
  contours,
  teinte,
  ton,
  ...(opacite !== undefined ? { opacite } : {}),
});

/** Ce sur quoi un texte est écrit : la teinte de la surface, et les nuances qu'elle prend sous lui (une seule, à plat, par défaut). */
export interface FondDeTexte {
  readonly teinte: NomDeTeinte;
  readonly nuances?: readonly Nuance[];
  /** Le ton de la surface, quand elle ne prend pas celui d'un dessus à plat : une face debout, tournée vers le joueur. */
  readonly ton?: IndiceDeTon;
}

/** Un texte posé à plat dans le plan du calque. Son approche vient de son rôle (voir ressources/typo.ts). */
export interface Texte {
  readonly genre: 'texte';
  readonly contenu: string;
  readonly role: RoleDeTexte;
  /** Corps, en px : un échelon de l'échelle typographique, à l'échelle de l'objet qui porte le texte. */
  readonly corps: number;
  /** Point d'ancrage sur la ligne de base (ignoré pour un texte en arc). */
  readonly en: Vec2;
  readonly ancrage: 'debut' | 'milieu' | 'fin';
  /**
   * Texte en arc : centre et rayon de la ligne de base, angle où tombe le milieu du texte
   * (-90 : en haut), et côté d'où on le lit. `dessus` : les lettres ont la tête vers l'extérieur
   * (arc du haut d'une étiquette). `dessous` : la tête vers le centre (arc du bas).
   */
  readonly arc?: { readonly centre: Vec2; readonly rayon: number; readonly milieu: number; readonly lecture: 'dessus' | 'dessous' };
  /** L'encre du texte, et la surface sur laquelle il est écrit : les contrôles du rendu vérifient leur contraste. */
  readonly teinte: NomDeTeinte;
  readonly ton: IndiceDeTon;
  readonly fond: FondDeTexte;
}

/** Largeur d'un texte sur sa ligne de base, en px : la scène la demande, celui qui trace les textes la donne. */
export type Mesure = (texte: Pick<Texte, 'contenu' | 'role' | 'corps'>) => number;

/**
 * Le rôle d'un calque dit comment il sera traité à l'écran :
 * - `decor` : dessiné une fois, puis figé et mis en cache avec le reste du décor (2 500 polygones au plus par scène) ;
 * - `image` : une pièce entière figée en image dès qu'elle est prête, puis déplacée d'un bloc (le vinyle, une pochette) ;
 * - `mobile` : un calque qui bouge et reste en polygones, sous 150 polygones (étiquette, repères, bras, levier, boutons) ;
 * - `ombre` : l'ombre d'une pièce, dont les paliers s'écartent quand elle monte.
 * Un calque sans rôle est un simple groupe : ce qu'il contient garde son propre rôle.
 */
export type RoleDeCalque = 'decor' | 'image' | 'mobile' | 'ombre';

export interface Calque {
  readonly genre: 'calque';
  /** Nom du calque : il commence par un mot du lexique, et c'est aussi son identifiant dans le SVG. `x/ombre` est l'ombre de `x`. */
  readonly nom: NomDeCalque;
  readonly role?: RoleDeCalque;
  readonly transformations?: readonly Transformation[];
  /**
   * Opacité du calque, de 0 à 1 ; absente, il est opaque. C'est par elle qu'on bascule d'un dessin à un autre
   * déjà fait : le texte d'une étiquette et ses arcs, les deux faces d'un disque, un voile d'ombre.
   */
  readonly opacite?: number;
  /**
   * La découpe du calque : des contours hors desquels rien de lui ne se voit. Elle est donnée dans le repère de son parent
   * et ne bouge pas avec lui : ses transformations le déplacent derrière elle, comme derrière une fenêtre. C'est le bord
   * de la surface qui reçoit une ombre : celle que le bras porte sur le plateau s'arrête au bord du plateau.
   * Un contour qui tourne à l'envers des autres y fait un trou : là non plus, rien ne se voit.
   */
  readonly decoupe?: readonly Polygone[];
  readonly contenu: readonly Dessin[];
}

/** Tout ce qui se dessine : des facettes peintes, un aplat, un texte, ou un calque qui en contient. */
export type Dessin = Peinture | Aplat | Texte | Calque;

export const calque = (
  nom: NomDeCalque,
  contenu: readonly Dessin[],
  plus: { role?: RoleDeCalque; transformations?: readonly Transformation[]; opacite?: number; decoupe?: readonly Polygone[] } = {},
): Calque => ({ genre: 'calque', nom, contenu, ...plus });

export const peinture = (facettes: readonly FacettePeinte[]): Peinture => ({ genre: 'peinture', facettes });

/** Le déplacement d'un calque qu'on soulève : droit vers le haut de l'écran, de la hauteur donnée en px visibles. */
export const soulever = (hauteur: number): Transformation => ({ genre: 'glisser', de: surLEcran([0, 0], hauteur) });

/**
 * Du contenu fixe dessiné dans le plan du meuble (textes gravés, aplats) à une hauteur donnée.
 * Ses coordonnées sont celles du meuble.
 */
export function aPlatSurLeMeuble(nom: NomDeCalque, hauteur: number, contenu: readonly Dessin[]): Calque {
  return calque(nom, contenu, { transformations: [soulever(hauteur), { genre: 'ecraser' }] });
}
