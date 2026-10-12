/**
 * Les saisons : un thème de quelques jours, posé par-dessus le jeu. `SAISON` dit laquelle est en cours ; sans elle, le jeu est tel
 * qu'en tout temps. Pour Halloween, quelques grosses pièces en low-poly, éclairées par la lampe comme le reste du meuble : une
 * citrouille taillée où luit une bougie, une grande toile d'araignée dans un coin et son araignée ; sur un grand écran, en plus,
 * une main de squelette agrippée au meuble et une chauve-souris qui vole au-dessus de la platine.
 * Les mesures sont dans le repère du meuble (x à droite, y vers le joueur, z vers le haut), à la taille 1, autour du pied de chaque
 * pièce ; les longueurs à l'écran, en px de la scène.
 */

import type { NomDeTeinte } from './palette';

export type Saison = 'halloween';

/** La saison en cours, s'il y en a une. Halloween ne dure que quelques jours : on l'enlève ensuite. */
export const SAISON: Saison | undefined = 'halloween';

/** Un point de l'espace. */
type Point = readonly [number, number, number];

export const HALLOWEEN = {
  /**
   * Où se posent les pièces : à la place libre la plus proche de celle qu'elles visent, cherchée de tant de px en tant (au moins ;
   * sur un grand regard, on en essaie autant en largeur), avec cette marge autour d'elles.
   */
  placement: { pas: 6, pointsEnLargeur: 60, marge: 4 },
  /** Un regard plus étroit que ça est celui d'un téléphone. */
  petitRegard: 600,

  /**
   * La citrouille. Sur un grand regard : la plus grosse qui tient sans rien couvrir, de `auPlus` à `auMoins` (son rayon), de `pas`
   * en `pas`, au plus près de là où elle vise (en parts du regard) ; elle peut en sortir, par le côté de cette part de sa largeur,
   * par le bas de cette part de sa hauteur. Sur un petit regard (un téléphone) : toujours là, grosse, dans un coin du bas, posée
   * sous ce que l'écran montre, et qui sort du regard ; de ses places (les parts de sa largeur et de sa hauteur hors du regard,
   * dans l'ordre où on les préfère), celle où l'on voit le mieux son visage, jugé en tant de points. Ses demi-axes, en parts du
   * rayon ; ses côtes ; ronde : tant de points à son équateur, tant de couronnes ; son sommet creusé ; sa queue, penchée ; son
   * visage, taillé dans sa face avant.
   */
  citrouille: {
    grand: { auPlus: 150, auMoins: 70, pas: 4, vers: [0.07, 0.9], deborde: [0.2, 0.14] },
    petit: { rayon: 84, sort: { cote: [0.3, 0.2, 0.4], bas: [0.3, 0.2, 0.4, 0.1, 0.5] }, points: [7, 5] },
    axes: [1, 0.92, 0.74],
    cotes: { nombre: 8, creux: 0.1 },
    pans: 32,
    couronnes: 10,
    sommetCreuse: 0.08,
    teinte: 'orangeBrule',
    queue: { penche: [0.1, -0.05], hauteur: 0.34, pied: 0.13, tete: 0.08, pans: 6, teinte: 'olive' },
    /**
     * Le visage, sur une citrouille de rayon 40, autour du point de sa face qui regarde l'œil (en parts de ses demi-axes : devant,
     * et en hauteur) :
     * deux yeux, un nez, une bouche à dents. Le bord de la taille, sombre, se voit au-dessus de chaque trou ; la bougie luit
     * au fond, et sa flamme, plus claire et plus petite, vacille.
     */
    visage: {
      face: [0.6, 1.55],
      surUnRayonDe: 40,
      trous: [
        [
          [-15, -2],
          [-5, -2],
          [-10, -11],
        ],
        [
          [5, -2],
          [15, -2],
          [10, -11],
        ],
        [
          [-3, 3],
          [3, 3],
          [0, -2],
        ],
        [
          [-16, 7],
          [-11, 7],
          [-8, 11],
          [-4, 7],
          [4, 7],
          [8, 11],
          [11, 7],
          [16, 7],
          [12, 15],
          [4, 18],
          [-4, 18],
          [-12, 15],
        ],
      ],
      bord: 1.6,
      flamme: 0.62,
      lueur: 'miel',
    },
  },

  /**
   * La toile, dans un coin du haut du regard : sa portée (la plus grande qui ne touche ni un texte ni une touche, jusqu'à cette part
   * d'elle, de tant de px en tant), ses fils qui rayonnent du coin (en degrés depuis le bord du haut), ses cercles (en part de la portée), ce dont chaque
   * cercle ploie vers le coin entre deux fils ; l'épaisseur des fils, à la taille 1.
   */
  toile: {
    portee: { petit: 150, grand: 250 },
    auMoins: 0.6,
    pas: 10,
    rayons: [3, 18, 33, 48, 63, 78, 88],
    cercles: [0.2, 0.37, 0.54, 0.71, 0.87, 1],
    ploie: 0.16,
    fils: { rayon: 1.5, cercle: 1.1 },
    taille: { petit: 1, grand: 1.4 },
  },

  /**
   * L'araignée, pendue à un fil de la toile : le cercle et l'angle d'où elle descend, la longueur de son fil (en part de la portée
   * de la toile) ; son abdomen et sa tête ; ses pattes de gauche, à l'écran (celles de droite en miroir) ; ses yeux.
   */
  araignee: {
    cercle: 3,
    angle: 78,
    fil: 0.35,
    abdomen: { rayons: [9, 9, 8], pans: 9, couronnes: 5 },
    tete: { en: [0, 3], base: -9, rayons: [5, 5, 4.5], pans: 8, couronnes: 5 },
    pattes: [
      [
        [-4, -6],
        [-13, -13],
        [-18, -7],
      ],
      [
        [-5, -3],
        [-15, -6],
        [-21, 1],
      ],
      [
        [-5, 0],
        [-14, 3],
        [-18, 11],
      ],
      [
        [-4, 2],
        [-10, 8],
        [-11, 16],
      ],
    ],
    patte: 1.4,
    yeux: { en: [2, 6.5, -5], rayon: 1.1 },
  },

  /**
   * La chauve-souris, sur un grand regard, qui vole au-dessus de la platine, ailes grandes ouvertes, face à nous : au-dessus de quel
   * point du socle (en part de sa largeur, et en px depuis son bord du fond), à quelle hauteur au-dessus de lui (en px visibles) ; sa
   * taille ; de combien de degrés elle se penche vers nous (sa tête se lève, son ventre et ses yeux se tournent vers l'œil) ; son
   * corps, sa tête, ses oreilles (celle de gauche, un triangle : sa base, puis sa pointe), ses yeux de miel. Son aile
   * droite (la gauche en miroir) : l'épaule, le coude, le poignet, le bout de ses quatre doigts, leur milieu, les creux de la membrane
   * entre eux, la hanche ; ses triangles, assez ronds pour qu'aucun ne fasse une lame, et pliés le long des doigts ; ses os (le bras,
   * puis chaque doigt), plus sombres. Ses teintes : le corps sombre, la membrane d'un violet passé.
   */
  volante: {
    auDessusDeLaPlatine: [0.5, 60],
    vol: 60,
    taille: 3.4,
    penche: 55,
    corps: { rayons: [5, 7, 4.5], pans: 8, couronnes: 5 },
    tete: { en: [0, 7.5], base: 3, rayons: [4, 3.6, 3.6], pans: 8, couronnes: 5 },
    oreille: [
      [-3.4, 6.6, 9.2],
      [-1.2, 7.6, 9.8],
      [-3.4, 6.4, 14.5],
    ] satisfies readonly Point[],
    yeux: { en: [1.6, 10.8, 7.2], rayon: 0.9 },
    aile: {
      points: [
        [4, 0, 4],
        [13, 5, 10],
        [21, 3, 14],
        [38, 2, 24],
        [39, -10, 17],
        [31, -19, 9],
        [18, -19, 4],
        [30, 2.5, 19],
        [30, -4, 14],
        [26, -9, 10],
        [19, -10, 7],
        [33, -2.5, 17],
        [32, -14, 10],
        [24, -16, 5],
        [11, -13, 1.5],
        [4, -7, 1],
      ] satisfies readonly Point[],
      triangles: [
        [2, 7, 8],
        [7, 3, 11],
        [7, 11, 8],
        [8, 11, 4],
        [2, 8, 9],
        [8, 4, 12],
        [8, 12, 9],
        [9, 12, 5],
        [2, 9, 10],
        [9, 5, 13],
        [9, 13, 10],
        [10, 13, 6],
        [10, 6, 14],
        [2, 10, 14],
        [1, 2, 14],
        [0, 1, 14],
        [0, 14, 15],
      ],
      os: [
        [0, 1],
        [1, 2],
        [2, 7],
        [7, 3],
        [2, 8],
        [8, 4],
        [2, 9],
        [9, 5],
        [2, 10],
        [10, 6],
      ],
    },
    os: 0.9,
    teintes: { corps: 'vinyle', ailes: 'lilasFume', os: 'vinyle' },
  },

  /**
   * La main de squelette, sur un grand regard, qui s'agrippe au meuble en haut à gauche, venue de plus loin que le regard : la plus
   * grande qui tient sans couvrir un texte ni une touche, de `auPlus` à `auMoins`, de `pas` en `pas`, à la première de ses places qui
   * le permet. Chaque place : le point du bord du regard d'où elle vient (en parts de sa largeur et de sa hauteur), l'angle dont la
   * main penche vers la droite, et où se pose son origine (la ligne de ses jointures) depuis ce point, à la taille 1. Dans son
   * repère, ses doigts vont vers le joueur.
   * Les os de l'avant-bras, ceux du carpe (des billes), et chaque doigt : le pied de son métacarpe, sa jointure, sa direction dans le
   * plan, ses phalanges (leur longueur, et leur pente en degrés au-dessus de l'horizontale : le doigt monte, puis plonge vers le bois,
   * où sa pointe s'appuie), son rayon. Le rayon de chaque os, en part de celui du doigt (le métacarpe, puis chaque phalange) ; les
   * articulations, plus grosses ; ce dont un os s'amincit en son milieu ; ses pans, et le plus de couronnes qu'il a.
   */
  main: {
    taille: { auPlus: 3.4, auMoins: 1.8, pas: 0.1 },
    places: [
      { depuisLeBord: [0, 0], angle: -38, depuis: [26, 34] },
      { depuisLeBord: [0, 0.2], angle: -72, depuis: [34, 0] },
      { depuisLeBord: [0, 0.4], angle: -80, depuis: [34, 0] },
    ],
    avantBras: [
      { de: [3, -56, 27], a: [2, -24, 21], rayon: 3.4 },
      { de: [-7, -56, 25], a: [-6, -24, 20], rayon: 2.8 },
    ],
    carpe: {
      billes: [
        [-5, -21, 18],
        [0, -22, 19],
        [4, -20, 18],
        [-2, -16.5, 17],
        [3, -16, 17],
      ] satisfies readonly Point[],
      rayon: 2.7,
    },
    doigts: [
      {
        pied: [-7, -17, 16],
        jointure: [-13, -9, 13],
        direction: [-0.55, 1],
        phalanges: [
          [9, -10],
          [7, -60],
        ],
        rayon: 2.1,
      },
      {
        pied: [-5, -14, 17],
        jointure: [-8, 0, 14],
        direction: [-0.22, 1],
        phalanges: [
          [12, 8],
          [8, -42],
          [6, -75],
        ],
        rayon: 2,
      },
      {
        pied: [-1, -14, 17.5],
        jointure: [-2, 1.5, 14.5],
        direction: [-0.04, 1],
        phalanges: [
          [13, 8],
          [9, -42],
          [6.5, -75],
        ],
        rayon: 2.1,
      },
      {
        pied: [3, -14, 17],
        jointure: [4, 0, 14],
        direction: [0.14, 1],
        phalanges: [
          [12, 8],
          [8, -42],
          [6, -75],
        ],
        rayon: 2,
      },
      {
        pied: [6.5, -15, 16],
        jointure: [9, -3, 13],
        direction: [0.32, 1],
        phalanges: [
          [9, 6],
          [6, -42],
          [5, -72],
        ],
        rayon: 1.7,
      },
    ],
    finesse: [1, 0.92, 0.8, 0.68],
    articulation: { grosseur: 1.3, pans: 6, couronnes: 3 },
    amincit: 0.25,
    pans: 6,
    couronnesAuPlus: 5,
    teinte: 'creme',
  },

  /**
   * Ce qui bouge : la flamme vacille ; la chauve-souris bat des ailes (son envergure se resserre jusqu'à cette part d'elle), et
   * monte et descend ; l'araignée monte et descend.
   */
  mouvement: {
    flamme: { de: 0.45, periodes: [0.37, 0.61] },
    ailes: { de: 0.6, periode: 0.9 },
    vol: { hauteur: 5, periode: 2.4 },
    araignee: { hauteur: 4, periode: 2.3 },
  },

  teintes: { toile: 'creme', araignee: 'vinyle', yeux: 'miel' } satisfies Readonly<Record<string, NomDeTeinte>>,
} as const;
