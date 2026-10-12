/**
 * L'avatar : le joueur imprimé sur sa pochette, en attendant de vrais personnages. Très simple, et dans le même bois :
 * une tête taillée en quelques facettes, des oreilles, un cou, des épaules, un visage, et ce qu'on porte sur la tête.
 * Deux choix seulement (la tête, et ce qu'il y a dessus) et trois couleurs (la peau, les cheveux, la tenue).
 * Mesures en px sur une pochette de 240 px, autour du centre de la tête.
 */

import type { NomDeTeinte } from './palette';

/** Une forme de tête : sa demi-largeur et sa demi-hauteur ; au-delà de 2, le galbe la tire vers le carré. */
export interface FormeDeTete {
  readonly rayons: readonly [number, number];
  readonly galbe: number;
}

/** Les formes de tête, dans l'ordre où l'écran « Fais ta pochette » les propose. */
export const TETES = {
  ronde: { rayons: [41, 43], galbe: 2 },
  ovale: { rayons: [35, 47], galbe: 2 },
  large: { rayons: [47, 39], galbe: 2.2 },
  carree: { rayons: [40, 44], galbe: 3 },
} as const satisfies Record<string, FormeDeTete>;

export type CleDeTete = keyof typeof TETES;

/** La couleur d'une pièce : celle des cheveux du joueur, celle de sa tenue, ou une teinte de la palette. */
export type CouleurDePiece = 'cheveux' | 'tenue' | NomDeTeinte;

/**
 * Ce qu'on porte sur la tête est fait de quatre sortes de morceaux, tous posés d'après la forme de la tête, jamais à la main.
 * Les hauteurs sont en px par rapport au centre de la tête (négatives au-dessus) ; rien ne descend sur les sourcils.
 * - `calotte` : ce qui couvre le crâne, des cheveux ou un bonnet. Son bord bas passe à `frange` au milieu du front et
 *   descend à `cotes` sur les tempes ; elle déborde de la tête de `debord` px, et monte au-dessus du crâne de `rehausse` px de plus.
 * - `bord` : une bande en travers du front, un revers ou une visière, à `hauteur`, de cette épaisseur, de cette largeur en part
 *   de celle de la tête ; son bas se bombe de `bombe` px au milieu.
 * - `boule` : un pompon, un chignon : sa place (en parts des rayons de la tête) et son rayon.
 * - `casque` : un arceau de cette épaisseur par-dessus le crâne, et deux coques (leurs rayons) sur les oreilles, cerclées.
 */
export type Morceau =
  | {
      readonly genre: 'calotte';
      readonly couleur: CouleurDePiece;
      readonly frange: number;
      readonly cotes: number;
      readonly debord: number;
      readonly rehausse: number;
      readonly relief: number;
    }
  | {
      readonly genre: 'bord';
      readonly couleur: CouleurDePiece;
      readonly hauteur: number;
      readonly epaisseur: number;
      readonly largeur: number;
      readonly bombe: number;
      readonly relief: number;
    }
  | {
      readonly genre: 'boule';
      readonly couleur: CouleurDePiece;
      readonly place: readonly [number, number];
      readonly rayon: number;
      readonly relief: number;
    }
  | {
      readonly genre: 'casque';
      readonly couleur: CouleurDePiece;
      readonly arceau: number;
      readonly coques: readonly [number, number];
      readonly cerclage: NomDeTeinte;
    };

/** Ce qu'il y a sur la tête, dans l'ordre où l'écran le propose : les morceaux, du fond vers l'avant. */
export const DESSUS = {
  courts: [{ genre: 'calotte', couleur: 'cheveux', frange: -31, cotes: -8, debord: 2.5, rehausse: 2, relief: 7 }],
  chignon: [
    { genre: 'boule', couleur: 'cheveux', place: [0, -1.1], rayon: 16, relief: 9 },
    { genre: 'calotte', couleur: 'cheveux', frange: -32, cotes: -12, debord: 2, rehausse: 0, relief: 6 },
  ],
  bonnet: [
    { genre: 'boule', couleur: 'creme', place: [0, -1.27], rayon: 9, relief: 5 },
    { genre: 'calotte', couleur: 'tenue', frange: -36, cotes: -22, debord: 4, rehausse: 9, relief: 9 },
    { genre: 'bord', couleur: 'tenue', hauteur: -35, epaisseur: 10, largeur: 1.08, bombe: 1.5, relief: 4 },
  ],
  casquette: [
    { genre: 'calotte', couleur: 'tenue', frange: -36, cotes: -24, debord: 3, rehausse: 5, relief: 8 },
    { genre: 'bord', couleur: 'tenue', hauteur: -37, epaisseur: 7, largeur: 1.25, bombe: 4, relief: 5 },
  ],
  casque: [
    { genre: 'calotte', couleur: 'cheveux', frange: -31, cotes: -8, debord: 2.5, rehausse: 2, relief: 7 },
    { genre: 'casque', couleur: 'laque', arceau: 6, coques: [11, 15], cerclage: 'miel' },
  ],
  rien: [],
} as const satisfies Record<string, readonly Morceau[]>;

export type CleDeDessus = keyof typeof DESSUS;

/** Les deux choix de l'avatar, dans l'ordre de l'écran « Fais ta pochette ». */
export const CHOIX_DE_L_AVATAR = ['tete', 'dessus'] as const;
export type ChoixDeLAvatar = (typeof CHOIX_DE_L_AVATAR)[number];

/** Un avatar : deux choix, et trois couleurs de la palette. */
export interface Avatar {
  readonly tete: CleDeTete;
  readonly dessus: CleDeDessus;
  readonly peau: NomDeTeinte;
  readonly cheveux: NomDeTeinte;
  readonly tenue: NomDeTeinte;
}

/** Le dessin commun à tous les avatars. */
export const AVATAR = {
  /**
   * La tête : une couronne de `pans` sommets, et un sommet un peu au-dessus du centre (en parts des rayons) d'où partent
   * autant de facettes. Sa hauteur, en part de la demi-largeur : la lampe donne à chaque facette son ton.
   */
  tete: { pans: 11, sommet: [0, -0.16], relief: 0.62 },
  /** L'oreille : un ovale qui fuit vers l'arrière, rentré dans la tête de `retrait` px. */
  oreille: { rayons: [6.5, 9.5], hauteur: 1, pans: 8, fuite: 0.55, retrait: 3 },
  /** Le cou : de sa hauteur sous le centre jusque sous les épaules, et sa demi-largeur ; à l'ombre de la tête. */
  cou: { haut: 26, bas: 66, demiLargeur: 15 },
  /** Les épaules : un drapé d'une seule rangée, de la ligne des épaules au bas de la pochette. */
  torse: {
    epaules: [
      [-94, 95],
      [-82, 76],
      [-56, 65],
      [-22, 59],
      [22, 59],
      [56, 65],
      [82, 76],
      [94, 95],
    ],
    bas: [
      [-102, 112],
      [-80, 112],
      [-52, 112],
      [-20, 112],
      [20, 112],
      [52, 112],
      [80, 112],
      [102, 112],
    ],
    relief: 16,
  },
  /** Le nez : un petit ovale, d'un ton sous la peau. */
  nez: { centre: [0, 10], rayons: [5.2, 4.2], pans: 7 },
  oeil: {
    /** Centre de l'œil droit du personnage ; le gauche est en miroir. */
    centre: [15.5, -4],
    blanc: { rayons: [9.4, 10.4], pans: 12, teinte: 'creme', ton: 3 },
    pupille: { rayons: [5.8, 6.4], pans: 9, teinte: 'expresso', ton: 1 },
    /** Le reflet de la lampe : son rayon, et sa distance au centre de la pupille, du côté de la lampe. */
    reflet: { rayon: 2, ecart: 3.1, pans: 6, teinte: 'creme', ton: 4 },
    /** La paupière : la part couverte à partir de laquelle l'œil est fermé, l'épaisseur du trait qui reste alors. */
    paupiere: { fermee: 0.95, trait: 2.6 },
    /** La joue qui remonte sous l'œil quand on sourit : son rayon, en part de la demi-largeur de l'œil. */
    pommette: { rayon: 1.7, pans: 14 },
  },
  /** Le sourcil : un trait gras, à la hauteur donnée, de cette longueur et cette épaisseur. */
  sourcil: { hauteur: -19.5, longueur: 16, epaisseur: 5 },
  /** Le rose aux joues : une encre posée sur la peau, qui la laisse voir. */
  joue: { centre: [27, 15], rayon: 7, pans: 8, teinte: 'rougeTomate', ton: 3, opacite: 0.22 },
  /** Hauteur du milieu de la bouche sous le centre de la tête. */
  bouche: 25,
} as const;

/** Un morceau de bouche : des contours pleins, un trait, ou une pastille ; de l'encre lisible sur la peau, ou une teinte. */
export type MorceauDeBouche =
  | {
      readonly genre: 'contours';
      readonly couleur: 'encre' | NomDeTeinte;
      readonly ton: number;
      readonly contours: readonly (readonly (readonly [number, number])[])[];
    }
  | {
      readonly genre: 'trait';
      readonly couleur: 'encre';
      readonly ton: number;
      readonly points: readonly (readonly [number, number])[];
      readonly epaisseur: number;
    }
  | {
      readonly genre: 'pastille';
      readonly couleur: 'encre';
      readonly ton: number;
      readonly centre: readonly [number, number];
      readonly rayons: readonly [number, number];
      readonly pans: number;
    };

/** Les bouches, une par humeur : des formes pleines, lisibles à 48 px, autour du milieu de la bouche. */
export const BOUCHES = {
  sourire: [
    {
      genre: 'contours',
      couleur: 'encre',
      ton: 1,
      contours: [
        [
          [-12, -2],
          [-6, -0.7],
          [6, -0.7],
          [12, -2],
          [12.9, -0.8],
          [12.2, 0.8],
          [8.8, 6],
          [4.4, 9.4],
          [0, 10.4],
          [-4.4, 9.4],
          [-8.8, 6],
          [-12.2, 0.8],
          [-12.9, -0.8],
        ],
      ],
    },
    {
      genre: 'contours',
      couleur: 'creme',
      ton: 3,
      contours: [
        [
          [-10, -0.4],
          [-6, 0.2],
          [6, 0.2],
          [10, -0.4],
          [10.6, 0.5],
          [8.8, 3.1],
          [-8.8, 3.1],
          [-10.6, 0.5],
        ],
      ],
    },
    {
      genre: 'contours',
      couleur: 'rougeTomate',
      ton: 3,
      contours: [
        [
          [-5.4, 7],
          [0, 5.7],
          [5.4, 7],
          [3.8, 9.7],
          [0, 10.4],
          [-3.8, 9.7],
        ],
      ],
    },
  ],
  pincee: [
    {
      genre: 'trait',
      couleur: 'encre',
      ton: 1,
      points: [
        [-2.6, 3.5],
        [6.6, 2.5],
      ],
      epaisseur: 3.8,
    },
  ],
  moue: [
    {
      genre: 'trait',
      couleur: 'encre',
      ton: 1,
      points: [
        [-8.4, 7.2],
        [-5.4, 4.3],
        [-2, 3],
        [2, 3],
        [5.4, 4.3],
        [8.4, 7.2],
      ],
      epaisseur: 3.5,
    },
  ],
  baillement: [{ genre: 'pastille', couleur: 'encre', ton: 1, centre: [0, 4.5], rayons: [4.6, 5.6], pans: 10 }],
} as const satisfies Record<string, readonly MorceauDeBouche[]>;

export type Bouche = keyof typeof BOUCHES;

export interface Expression {
  /** Sourcils : décalage en hauteur (négatif : levés), pente en degrés (positif : froncés), cambrure en px. */
  readonly sourcils: { readonly hauteur: number; readonly pente: number; readonly arc: number };
  /** Part de l'œil couverte par la paupière du haut, et par la joue qui remonte en bas. */
  readonly paupieres: { readonly haut: number; readonly bas: number };
  /** Décalage des pupilles, en px. */
  readonly regard: readonly [number, number];
  readonly bouche: Bouche;
}

/**
 * Les quatre expressions, qui changent toutes seules pendant la partie, d'un coup.
 * Elles se lisent d'abord sur les sourcils et la bouche.
 */
export const EXPRESSIONS = {
  /** Pendant l'extrait. */
  concentre: { sourcils: { hauteur: 2.5, pente: 14, arc: 0.4 }, paupieres: { haut: 0.3, bas: 0 }, regard: [0, 0.8], bouche: 'pincee' },
  /** À l'arrivée, et à chaque bonne réponse. */
  content: { sourcils: { hauteur: -3, pente: -4, arc: 2.4 }, paupieres: { haut: 0, bas: 0.34 }, regard: [0, -0.6], bouche: 'sourire' },
  /** À chaque mauvaise réponse, quand on se fait doubler, quand personne n'a trouvé. */
  depite: { sourcils: { hauteur: -0.5, pente: -19, arc: 0.8 }, paupieres: { haut: 0.2, bas: 0 }, regard: [0, 1.8], bouche: 'moue' },
  /** Après une piste entière sans répondre. */
  endormi: { sourcils: { hauteur: 1.5, pente: -5, arc: 1.6 }, paupieres: { haut: 1, bas: 0 }, regard: [0, 0], bouche: 'baillement' },
} as const satisfies Record<string, Expression>;

export type NomDExpression = keyof typeof EXPRESSIONS;
