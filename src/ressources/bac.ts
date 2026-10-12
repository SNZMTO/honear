/**
 * Les mesures du bac à disques, à gauche de la platine : ce sont les playlists. Une caisse de lattes de noyer clair,
 * où les pochettes des playlists se tiennent debout, un peu penchées en arrière, rangées derrière des intercalaires de couleur,
 * un par thème. En px dans le plan du meuble ; les positions sont données par rapport au coin haut-gauche de la caisse,
 * les hauteurs en px visibles.
 */

import type { NomDeTeinte } from './palette';

export const BAC = {
  /** Coin haut-gauche de la caisse sur le meuble. */
  position: [40, 176],

  /**
   * La caisse : quatre parois de lattes, leur épaisseur, leur hauteur ; le fond, un peu au-dessus du bois.
   * Sur la paroi avant, les joints entre ses trois lattes, à ces hauteurs, et sa poignée : une fente aux bouts ronds. Elle est
   * peinte en crème, pour se détacher du noyer de la table ; ses joints et sa fente restent sombres.
   */
  caisse: {
    teinte: 'creme',
    teinteDesJoints: 'noyerSombre',
    largeur: 352,
    profondeur: 236,
    paroi: 9,
    hauteur: 62,
    chanfrein: 2,
    rayon: 3,
    fond: 4,
    joints: [21, 42],
    joint: 1.6,
    poignee: { largeur: 74, bas: 45, haut: 57 },
  },

  /**
   * Ce qui se tient debout dans la caisse, de l'avant vers le fond : le premier se tient à `avant` de la paroi avant,
   * chacun à `pas` du précédent. Une pochette : sa largeur, sa hauteur, son épaisseur (3 px), ses coins un peu usés.
   * Tous penchent en arrière de tant de degrés.
   */
  rangement: { avant: 7, pas: 10.5, penche: 12 },
  pochette: { largeur: 312, hauteur: 92, epaisseur: 3, chanfrein: 1.1, coin: 3 },

  /**
   * Un intercalaire : un carton un peu plus haut qu'une pochette, avec un onglet sur son bord du haut. Les onglets de trois
   * intercalaires qui se suivent ne tombent jamais au même endroit : leurs places, de gauche à droite, tour à tour.
   * L'onglet porte une étiquette de papier crème, en retrait de son bord, où s'écrit le titre du thème, sur deux lignes au plus.
   */
  intercalaire: {
    largeur: 318,
    hauteur: 98,
    epaisseur: 2,
    chanfrein: 1,
    coin: 3,
    onglet: { largeur: 100, hauteur: 32, coin: 5, places: [8, 110, 212] },
    etiquette: { retrait: 4, lignes: 2, interligne: 3 },
  },
} as const;

/** La couleur de l'intercalaire de chaque thème : une par thème, prise dans la palette des pochettes. */
export const COULEURS_DES_THEMES = {
  annees80: 'lilasFume',
  annees2000: 'bleuFane',
  rapFrancais: 'olive',
  variete: 'vieuxRose',
  tubesDeLEte: 'orangeBrule',
  rock: 'rougeTomate',
  generiques: 'bleuPetrole',
  hitsDuMoment: 'laque',
} as const satisfies Readonly<Record<string, NomDeTeinte>>;

export type CleDeTheme = keyof typeof COULEURS_DES_THEMES;

/**
 * Les playlists « Prêtes à jouer », une douzaine, rangées dans le bac derrière l'intercalaire de leur thème : combien chaque thème en a.
 * Chacune n'est qu'une vignette : sa couleur.
 */
export const PLAYLISTS_PAR_THEME: Readonly<Record<CleDeTheme, number>> = {
  annees80: 2,
  annees2000: 2,
  rapFrancais: 1,
  variete: 2,
  tubesDeLEte: 1,
  rock: 1,
  generiques: 2,
  hitsDuMoment: 1,
};

/** La playlist que le bac donne en attendant Deezer : la source d'essai du serveur la connaît sous ce nom. */
export const PLAYLIST_D_ESSAI = 'essai';
