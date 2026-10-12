/**
 * Les mesures de la platine, en px dans le plan du meuble.
 * Les positions sont données par rapport au coin haut-gauche du socle.
 * Les épaisseurs et les hauteurs sont en px visibles à l'écran.
 */

export const PLATINE = {
  /** Coin haut-gauche du socle sur le meuble. */
  position: [470, 86],

  socle: { largeur: 500, profondeur: 492, epaisseur: 16, rayon: 18, chanfrein: 3 },

  plateau: {
    centre: [222, 210],
    rayon: 186,
    epaisseur: 10,
    chanfrein: 2.5,
    /** Lèvre plate entre le chanfrein et la jante. */
    levre: 1.3,
    /** Bord intérieur de la jante, qui porte les repères. */
    jante: 175,
    /** Ce dont la jante monte vers le centre : ses facettes du côté de la lampe en sont plus claires. */
    monte: 1.2,
    /** Bord intérieur de la gorge sombre qui sépare la jante de la feutrine : c'est aussi le rayon de la feutrine. */
    gorge: 173.4,
  },

  /** Repères stroboscopiques, au milieu de la jante. */
  reperes: { rayon: 179.3, longueur: 4.4, largeur: 2.6 },

  feutrine: {
    epaisseur: 1,
    /** Deux rainures concentriques, un ton plus sombre : rayon de chacune, et leur largeur. */
    rainures: [140, 86],
    largeurDeRainure: 1.4,
  },

  disque: {
    rayon: 166,
    epaisseur: 1.5,
    chanfrein: 0.9,
    /** Du bord vers le centre : bourrelet, plage d'entrée, plages gravées, plage de sortie, étiquette. */
    bourrelet: 163.2,
    entree: 158,
    sortie: 91,
    etiquette: 78,
    /** Largeurs relatives des plages gravées, du bord vers le centre : des morceaux de durées inégales. La densité dit combien on en grave. */
    plages: [1.25, 0.8, 1.1, 0.7, 1],
    /** Largeur d'un entre-plages, et d'un passage de sillons plus serrés à l'intérieur d'une plage, en px. */
    entrePlages: 1.6,
    passageSerre: 1.1,
    /** Entre deux passages serrés, les anneaux de sillons sont tour à tour larges et étroits : leurs largeurs relatives. */
    sillons: [1.35, 0.65],
  },

  axe: {
    rayon: 3.4,
    depassement: 4.5,
    chanfrein: 1.1,
    /** Jeu du trou de l'étiquette autour de l'axe. */
    jeu: 0.3,
    /** Un disque ne s'enfile sur l'axe que centré sur lui à moins de tant de px. */
    centrage: 1,
  },

  bras: {
    pivot: [436, 144],
    /** Du pivot à la pointe de lecture. */
    longueur: 240,
    /** Angle du bras posé sur son repos (0° vers la droite, 90° vers le joueur). */
    repos: 100,
    /** Angle de la tête par rapport au bras, pour que la pointe suive le sillon. */
    deport: 22,
    /** Hauteur de l'axe du tube au-dessus du socle. */
    hauteur: 24,
    /** L'embase : ce dont son dessus monte vers le pivot, et la part de son rayon qui reste plate au milieu. */
    embase: { rayon: 22, epaisseur: 2.5, chanfrein: 1, monte: 0.9, plat: 0.6 },
    /** La colonne du pivot s'arrête un peu sous le cardan. */
    colonne: { rayon: 9.5, retrait: 2, chanfrein: 1 },
    /**
     * Le cardan : un tambour sombre qui dépasse au-dessus et au-dessous du tube, coiffé d'un chapeau d'aluminium.
     * Ses pans (seize, comme un bouton : il est rond) ; ce dont son dessus monte ; le chapeau et son cœur plat,
     * en parts du rayon ; la fente de sa vis, en px.
     */
    cardan: { rayon: 12.5, pans: 16, dessus: 4.5, dessous: 1.5, monte: 0.6, chapeau: 0.7, coeur: 0.34, fente: { longueur: 6.4, largeur: 1.4 } },
    /**
     * Le tube part du cardan et s'affine vers la tête : parts de son rayon à chaque bout. `epaisseur` est ce qu'on voit
     * de son flanc, `retrait` ce qui lui manque pour atteindre le joint de la tête.
     */
    tube: { rayon: 2.9, depart: 10, epaisseur: 1.8, affinement: [1.14, 0.86], retrait: 4 },
    /**
     * Le contrepoids, derrière le pivot : son cadran gradué, le col qui le tient (longueur, et rayon en part du sien),
     * la tige qui rejoint le cardan.
     */
    contrepoids: {
      debut: -64,
      fin: -30,
      rayon: 13,
      cadran: 7,
      epaisseur: 6,
      col: 4.5,
      rayonDuCol: 0.6,
      tige: 2.6,
      /**
       * Les graduations du cadran : leurs angles autour du cylindre, leur début et leur fin en parts du cadran,
       * leur largeur, et la part qui en reste à celles qu'on voit au bord.
       */
      graduations: { angles: [-62, -38, -14, 14, 38, 62], de: 0.2, a: 0.8, largeur: 1.1, auBord: 0.35 },
    },
    /** La tête : la coquille qui porte la cellule. Longueur, largeur, distance de son joint à la pointe. */
    tete: {
      longueur: 36,
      largeur: 15,
      pointe: 25,
      epaisseur: 1,
      chanfrein: 1.5,
      /** Le col, par où la coquille tient au tube : où il commence après le joint, où la coquille prend sa pleine largeur, et sa largeur en part de celle-ci. */
      col: { depart: 2, fin: 11, largeur: 0.5 },
      /** Le nez, en demi-rond : sa longueur, et le nombre de ses pans. */
      nez: { longueur: 5.5, pans: 6 },
      /** La bague qui serre le tube contre la tête : son rayon, où elle commence et où elle finit par rapport au joint. */
      bague: { rayon: 4.3, de: -6.5, a: 1.5 },
      /** Les deux fentes de réglage de la cellule : d'où à où le long de la tête, depuis la pointe ; leur écart à l'axe ; leur largeur. */
      fentes: { de: -9, a: 3, ecart: 4, largeur: 1.6 },
      /**
       * Le doigt de levage, une petite patte du côté opposé au plateau. Son contour : pour chaque point, sa distance
       * le long de la tête depuis la pointe, et ce dont il dépasse du flanc (négatif : il rentre sous la coquille).
       */
      doigt: [
        [0, -1],
        [4.6, -1],
        [7.4, 8.2],
        [6.6, 10.4],
        [3.4, 10.4],
        [2.2, 8.6],
      ],
    },
    /** La cellule, sous la tête : elle avance un peu devant la pointe, et son dessus est en retrait sous l'axe du tube. */
    cellule: { longueur: 19, largeur: 11.5, epaisseur: 8, rayon: 2.6, avance: 7, retrait: 1.5 },
    /** Position du repose-bras le long du tube, depuis le pivot ; son poteau, son berceau, et le jeu entre le berceau et le tube. */
    reposeBras: 150,
    repose: { poteau: 3.6, jeu: 0.3, berceau: { largeur: 15, profondeur: 7.2, epaisseur: 3.4, rayon: 2, chanfrein: 1 } },
  },

  levier: {
    position: [467, 272],
    embase: { largeur: 24, profondeur: 42, epaisseur: 4, rayon: 5, chanfrein: 1.4 },
    manette: { largeur: 15, profondeur: 10, epaisseur: 8, rayon: 3.2, chanfrein: 1.6 },
    /** La glissière : une fente le long de l'embase, qui dépasse la course de chaque côté. */
    glissiere: { largeur: 4.4, depassement: 5 },
    /** Distance entre la position levée (vers le fond) et la position baissée (vers le joueur). */
    course: 12,
  },

  /** Les quatre commandes, alignées sur le bandeau avant : trois boutons à crans et un interrupteur. */
  commandes: {
    ligne: 448,
    /**
     * Les boutons, de gauche à droite. Les crans sont des angles, 0° vers le fond du meuble.
     * Le bouton de mode a cinq crans gravés : les modes inscrits occupent les premiers, les autres restent libres pour les modes à venir.
     * Ses inscriptions, des mots et non des chiffres, prennent de la place à sa gauche : il se tient plus loin de son voisin.
     * À sa droite, il laisse au cadre la place de s'arrêter quand le regard se pose sur la réponse (voir `AMPLEURS.regardSurLaReponse`).
     */
    boutons: {
      pistes: { x: 168, rayon: 14.5, crans: [-45, 0, 45] },
      extrait: { x: 244, rayon: 14.5, crans: [-45, 0, 45] },
      mode: { x: 344, rayon: 18, crans: [-60, -40, -20, 0, 20, 40, 60] },
    },
    /** Ce que les boutons ont en commun : épaisseur, chanfrein, et leur index (de son pied à son bout, en parts du rayon ; largeur en px). */
    bouton: { epaisseur: 6, chanfrein: 1.7, index: { de: 0.26, a: 0.82, largeur: 2.6 } },
    /** Traits de cran autour d'un bouton : début et fin, à partir de son bord, et largeur. */
    trait: { de: 3.5, a: 8, largeur: 1.6 },
    /** Distance entre le bord d'un bouton et le bord le plus proche des inscriptions de ses crans. */
    inscription: 13,
    /** En deçà de cet angle, un cran pointe vers le fond du meuble : son inscription se pose au-dessus de lui, centrée. */
    cranDuFond: 20,

    interrupteurs: {
      son: { x: 440 },
    },
    /** Un interrupteur à bascule : un écrou moleté sur sa rondelle, et une bascule couchée vers la position choisie. */
    interrupteur: {
      /** La rondelle, posée sur la laque : son rayon, son épaisseur. */
      rondelle: { rayon: 10.5, epaisseur: 0.2 },
      /** L'écrou, et le puits d'où sort la bascule, en part de son rayon. */
      ecrou: { rayon: 7.6, epaisseur: 2.4, chanfrein: 1.2, puits: 0.5 },
      /**
       * La bascule : une tige qui finit en boule. Longueur depuis l'axe, largeurs au pied et au col, épaisseur de la tige,
       * hauteur du sommet de la boule au-dessus de l'écrou. La boule : la part de sa hauteur prise par son flanc, et la part
       * de son rayon qui reste plate au sommet.
       */
      bascule: {
        longueur: 17,
        pied: 4,
        col: 3,
        epaisseur: 3,
        chanfrein: 0.9,
        hauteur: 5.4,
        boule: { rayon: 4.2, chanfrein: 1, flanc: 0.45, plat: 0.5 },
      },
      /** Distance entre l'axe et le bord le plus proche des inscriptions de ses deux positions. */
      inscription: 23,
    },

    /** Distance entre la ligne des commandes et la ligne de base de leurs titres. */
    titre: 32,
    /** Plaque de marque, à l'avant gauche du socle. */
    marque: [20, 454],
  },

  /**
   * Vis du socle : leur retrait par rapport à chaque coin ; ce dont leur tête monte, et la part de son rayon qui reste plate ;
   * leur fente (longueur en parts du rayon, largeur en px). Chaque fente est tournée au hasard, toujours le même : son germe.
   */
  vis: { retrait: 14, rayon: 4, monte: 0.9, plat: 0.55, fente: { longueur: 1.56, largeur: 1.5 }, germe: 45 },
  /** Les charnières du capot, au fond du socle : une platine sombre, et l'axe d'aluminium qui la traverse dans sa longueur. */
  charnieres: {
    x: [84, 384],
    y: 5,
    largeur: 32,
    profondeur: 9,
    epaisseur: 4,
    rayon: 2.2,
    chanfrein: 1.2,
    axe: { longueur: 24, profondeur: 3.4, epaisseur: 1.5, rayon: 1.7, chanfrein: 0.7 },
  },
} as const;
