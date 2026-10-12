/**
 * Les pochettes : ce que chaque joueur pose sur le meuble. Son avatar y est imprimé,
 * son pseudo est son nom d'artiste.
 */

import type { Avatar } from './avatar';
import type { NomDeTeinte } from './palette';

/** Les motifs imprimés derrière l'avatar, dans l'ordre où l'écran « Fais ta pochette » les propose. */
export const MOTIFS_DE_POCHETTE = ['rayons', 'rayures', 'damier', 'cercles'] as const;
export type Motif = (typeof MOTIFS_DE_POCHETTE)[number];

/** Les couleurs de fond qu'une pochette peut prendre : celles des pochettes, saturées mais patinées, et le crème du papier. */
export const FONDS_DE_POCHETTE = [
  'orangeBrule',
  'rougeTomate',
  'vieuxRose',
  'bleuPetrole',
  'bleuFane',
  'olive',
  'lilasFume',
  'creme',
] as const satisfies readonly NomDeTeinte[];

/**
 * Les couleurs que le hasard ne donne jamais à une peau : les trois presque noires de la palette. Sur elles, les traits du visage
 * (les pupilles, les sourcils) ne se lisent plus, et il ne reste que des yeux et une bouche rouge : une caricature.
 * Le joueur, lui, peut tout choisir.
 */
export const PEAUX_INTERDITES = ['vinyle', 'expresso', 'laque'] as const satisfies readonly NomDeTeinte[];

/**
 * Le dessin des motifs, en parts du côté de la pochette : la largeur d'une rayure, le côté d'une case, la largeur d'un anneau,
 * et l'angle des rayures ; les cercles partent de derrière la tête, comme les rayons, avec plus de pans à mesure qu'ils grandissent.
 * Ce qu'un motif couvre autour de la tête, en parts du côté : de quoi remplir la pochette.
 */
export const DESSIN_DES_MOTIFS = {
  rayure: 0.083,
  angleDesRayures: 0,
  case: 0.125,
  anneau: 0.075,
  pansDesCercles: 48,
  pansAuMoins: 12,
  etendue: 0.7,
} as const;

export interface Pochette {
  readonly artiste: string;
  readonly album: string;
  readonly fond: NomDeTeinte;
  readonly motif: Motif;
  readonly avatar: Avatar;
}

/** Mesures d'une pochette, en px pour une pochette de 240 px de côté. */
export const MESURES_DE_POCHETTE = {
  cote: 240,
  /** Épaisseur visible de la tranche, quelle que soit la taille de la pochette. */
  tranche: 3,
  /** Arrondi des coins, et nombre de pans de chacun ; largeur du chanfrein des bords. */
  coin: 3.5,
  pansDeCoin: 2,
  chanfrein: 1.3,
  /**
   * Les coins usés, là où l'impression est partie en rond : le rayon de l'usure au plus, la part qu'elle en garde au moins,
   * le nombre de pans de ce rond, et la chance qu'un coin soit épargné.
   */
  usure: { taille: 6.5, auMoins: 0.55, pans: 16, epargne: 0.22 },
  /** Marge laissée au nom d'artiste, de chaque côté. */
  marge: 11,
  /** Centre de la tête sur la pochette entière, par rapport à son centre. */
  tete: [0, 14],
  /**
   * Sur un fond où l'encre ne se lit pas assez à la taille de la pochette, le nom et l'album sont écrits sur une étiquette de papier :
   * sa marge autour des lignes, sa distance au bord du carton, l'arrondi de ses coins.
   */
  etiquette: { retrait: 6, bord: 8, coin: 3 },
  /** Lignes de base du nom d'artiste et du titre de l'album, par rapport au centre : le titre garde ses distances avec la coiffure. */
  nom: -86,
  album: -66,
  /**
   * En dessous de cette taille, la pochette est une miniature : plus de texte,
   * et l'avatar est recadré plus serré pour que sa silhouette se lise.
   */
  miniature: { jusqua: 96, tete: [-6, -10], echelle: 1.2 },
  /**
   * Le dos d'une pochette : deux colonnes de titres en lignes fines, comme au dos d'un vrai disque. Combien de lignes, d'où elles partent
   * (sous le centre, négatif au-dessus), leur pas, leur épaisseur, leur largeur et ce dont une sur trois raccourcit, l'écart des colonnes au centre.
   */
  dos: { lignes: 9, haut: -86, pas: 20, epaisseur: 6, largeur: 82, raccourci: 18, colonne: 52 },
} as const;
