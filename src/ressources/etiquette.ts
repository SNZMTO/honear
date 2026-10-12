/**
 * Les mesures de l'étiquette d'un disque. Elles sont en parts de son rayon : la même étiquette
 * se dessine sur le disque de la platine et, en grand, comme logo.
 */

export const ETIQUETTE = {
  /** Hauteur du papier au-dessus du vinyle, en px visibles : juste de quoi le recouvrir. La seule mesure qui ne suit pas le rayon. */
  colle: 0.1,

  /** Le vinyle lisse de la plage de sortie s'arrête juste sous le bord du papier : à cette part de son rayon. */
  recouvrement: 0.99,

  /** Deux filets un ton plus sombre : le bord du papier (épaisseur), et la bague de pressage (rayon, épaisseur). */
  bord: 0.014,
  bague: { rayon: 0.5, epaisseur: 0.011 },

  /**
   * Ce qu'une étiquette écrit, toujours aux mêmes places : une ligne en arc en haut ; au centre, de part et d'autre du trou,
   * les deux mentions d'un vrai disque ; en bas, à l'envers de l'arc, une dernière ligne. Rayons de ligne de base ;
   * ouvertures d'arc en degrés, mesurées sur la ligne de base. Les deux mentions du centre se tiennent à la même distance
   * du trou, chacune de son côté : `ecart` va du centre au bord le plus proche de leurs lettres. Il laisse à l'axe la place
   * de dépasser sans les toucher, et l'étiquette reste la même, bien centrée, quand le disque quitte la platine.
   */
  lignes: {
    haut: { rayon: 0.72, ouverture: 146 },
    mentions: { ecart: 0.2 },
    bas: { rayon: 0.885, ouverture: 130 },
  },

  /**
   * L'étiquette d'une réponse, quand c'est elle qui la dit : le titre au-dessus du trou, sur une ou deux lignes droites,
   * l'artiste au-dessous, chacun à la distance `lignes.mentions.ecart` du trou. La largeur qu'une ligne peut prendre,
   * en parts du rayon ; le plus de lignes du titre, et son interligne en parts du corps.
   */
  reponse: { titre: { place: 1.46, lignes: 2, interligne: 1.08 }, artiste: { place: 1.7 } },

  /**
   * Les arcs qui remplacent le texte tant que le disque tourne, comme une inscription emportée par la vitesse.
   * Chaque ligne devient quelques arcs concentriques : leurs places dans la hauteur de ses lettres, leur épaisseur
   * (en part de cette hauteur, et au moins tant de px), la hauteur des minuscules d'un titre en part de son corps,
   * et de combien chaque arc s'allonge de chaque côté, en degrés : courts à bas régime, longs à pleine vitesse.
   * Aucun arc ne fait le tour : il lui manque toujours au moins `jour` degrés.
   */
  arcs: {
    places: [0.14, 0.5, 0.86],
    /** Les rayons des arcs sont pris sur une grille de ce pas, en px : deux arcs voisins ne se touchent jamais. */
    grille: 4.4,
    epaisseur: { part: 0.2, auMoins: 1.5 },
    minuscules: 0.56,
    courts: [4, 12],
    longs: [16, 58],
    jour: 130,
    germe: 7,
  },
} as const;
