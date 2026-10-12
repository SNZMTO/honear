/**
 * Les emplacements de la platine sur le meuble : où tombe chaque pièce, à quelle hauteur,
 * et la course du bras. Les modules de la platine les lisent ici plutôt que de les recalculer chacun de leur côté.
 */

import { degres, direction, fois, longueur, moins, plus, unitaire, type Vec2 } from '../../lowpoly/vecteurs';
import { PLATINE } from '../../ressources/platine';

/** Un point donné par rapport au coin du socle, replacé dans le plan du meuble. */
export const surLeSocle = (p: readonly [number, number]): Vec2 => plus(PLATINE.position, p);

/** Hauteurs au-dessus du bois, en px visibles. */
export const HAUTEURS = {
  socle: PLATINE.socle.epaisseur,
  plateau: PLATINE.socle.epaisseur + PLATINE.plateau.epaisseur,
  feutrine: PLATINE.socle.epaisseur + PLATINE.plateau.epaisseur + PLATINE.feutrine.epaisseur,
  disque: PLATINE.socle.epaisseur + PLATINE.plateau.epaisseur + PLATINE.feutrine.epaisseur + PLATINE.disque.epaisseur,
  /** L'axe du tube du bras. */
  bras: PLATINE.socle.epaisseur + PLATINE.bras.hauteur,
} as const;

export const CENTRE_DU_PLATEAU: Vec2 = surLeSocle(PLATINE.plateau.centre);

/**
 * Où se pose une commande (un bouton à crans, un interrupteur) : son centre sur le meuble, la hauteur de la laque qui la porte,
 * et l'objet du meuble qui la porte, qui préfixe le nom de ce qui en est figé. La platine et l'ampli ont les mêmes commandes.
 */
export interface PlaceDeCommande {
  readonly centre: Vec2;
  readonly support: number;
  readonly porteur: 'platine' | 'ampli';
}

/** La place d'une commande sur le bandeau avant de la platine. */
export const surLeBandeau = (x: number): PlaceDeCommande => ({
  centre: surLeSocle([x, PLATINE.commandes.ligne]),
  support: HAUTEURS.socle,
  porteur: 'platine',
});
export const PIVOT_DU_BRAS: Vec2 = surLeSocle(PLATINE.bras.pivot);

const B = PLATINE.bras;

/**
 * Le bras est décrit couché le long de l'axe des x, son pivot à l'origine et sa pointe au bout :
 * les points qui suivent sont dans ce repère, avant que le bras ne tourne.
 */
const POINTE: Vec2 = [B.longueur, 0];
/** Axe de la tête de lecture : tourné vers le plateau, pour que la pointe suive le sillon. */
const AXE_DE_LA_TETE: Vec2 = direction(B.deport);
const TRAVERS_DE_LA_TETE: Vec2 = [-AXE_DE_LA_TETE[1], AXE_DE_LA_TETE[0]];

/** Point de la tête, donné le long de son axe (depuis la pointe) et en travers. */
export const surLaTete = (long: number, travers: number): Vec2 => plus(POINTE, plus(fois(AXE_DE_LA_TETE, long), fois(TRAVERS_DE_LA_TETE, travers)));

/** Là où le tube rejoint la tête. */
const JOINT_DE_LA_TETE: Vec2 = surLaTete(-B.tete.pointe, 0);
const AXE_DU_TUBE: Vec2 = unitaire(JOINT_DE_LA_TETE);

/** Point de l'axe du tube à cette distance du pivot, et la distance à laquelle il rejoint la tête. */
export const surLeTube = (distance: number): Vec2 => fois(AXE_DU_TUBE, distance);
export const LONGUEUR_DU_TUBE: number = longueur(JOINT_DE_LA_TETE);

/**
 * Angle du bras quand la pointe est à ce rayon sur le disque : c'est la course du chrono,
 * du bord du disque (début de l'extrait) à l'étiquette (fin).
 */
export function angleDuBrasAuRayon(rayon: number): number {
  const versLePlateau = moins(CENTRE_DU_PLATEAU, PIVOT_DU_BRAS);
  const entraxe = Math.hypot(versLePlateau[0], versLePlateau[1]);
  const cosinus = (entraxe ** 2 + B.longueur ** 2 - rayon ** 2) / (2 * entraxe * B.longueur);
  return degres(Math.atan2(versLePlateau[1], versLePlateau[0])) - degres(Math.acos(Math.min(1, Math.max(-1, cosinus))));
}

/**
 * L'angle sous lequel le bras prend sa lumière : à mi-chemin entre son repos et le bout de sa course.
 * Ses facettes sont mises en ton une fois pour toutes à cet angle, puis le bras tourne d'un bloc :
 * il garde la même image quel que soit l'instant où on recharge la page.
 */
export const ANGLE_DE_LUMIERE_DU_BRAS: number = (B.repos + angleDuBrasAuRayon(PLATINE.disque.etiquette)) / 2;
