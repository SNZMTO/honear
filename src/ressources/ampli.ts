/**
 * Les mesures de l'ampli, à droite de la platine : c'est le son. En px dans le plan du meuble ; les positions sont données
 * par rapport au coin haut-gauche de son coffre, les épaisseurs et les hauteurs en px visibles à l'écran.
 * Il est de la même famille que la platine : laque vert bouteille, commandes d'aluminium, inscriptions gravées en crème.
 */

export const AMPLI = {
  /** Coin haut-gauche du coffre sur le meuble : à droite du socle de la platine, un peu en retrait vers le fond. */
  position: [1012, 118],

  /** Le coffre : plus haut que le socle de la platine, il se voit d'un peu plus loin. */
  coffre: { largeur: 340, profondeur: 318, epaisseur: 24, rayon: 16, chanfrein: 3 },

  /**
   * Les deux vumètres, côte à côte au fond du coffre : la fenêtre (sa lunette sombre, son épaisseur, son chanfrein, la largeur
   * de son bord), et le cadran crème qu'elle entoure. Le pivot des aiguilles est sous le bord bas de la fenêtre : on ne voit
   * de chaque aiguille que ce qui passe sur le cadran.
   */
  vumetres: {
    x: [22, 176],
    y: 26,
    largeur: 142,
    profondeur: 96,
    lunette: { epaisseur: 2.2, chanfrein: 1.2, rayon: 7, bord: 6 },
    /** Le pivot, depuis le coin haut-gauche de la fenêtre ; le rayon de l'arc des graduations, leurs longueurs, et le rayon de leurs nombres. */
    pivot: [71, 112],
    graduations: { rayon: 76, longues: 8, courtes: 4.5, largeur: 1.3, nombres: 87 },
    /**
     * L'échelle, de -20 à +3 : l'angle de chaque graduation depuis la verticale, en degrés ; les nombres qu'on écrit, qui portent
     * une graduation longue ; et la zone rouge, à partir de 0, son épaisseur en px.
     */
    echelle: {
      graduations: [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3],
      angles: [-36, -22, -15, -9, -3, 1, 6, 11, 18, 25, 32],
      ecrits: [-20, -10, -5, 0, 3],
      rouge: { de: 11, a: 34, epaisseur: 4.2 },
    },
    /** L'aiguille : sa course (au repos, en butée), sa longueur depuis le pivot, sa largeur, sa hauteur au-dessus du cadran. */
    aiguille: { repos: -39, butee: 36, longueur: 92, largeur: 1.5, hauteur: 1.6 },
    /** Où s'écrivent « VU » sur le cadran, et le canal sous la fenêtre, depuis le coin haut-gauche de la fenêtre. */
    sigle: [71, 70],
    canal: [71, 112],
  },

  /**
   * Le gros bouton du volume, à l'avant gauche : moleté, vingt et un crans de -135 à +135 degrés ; un nombre gravé tous les deux
   * crans, de 0 à 10 ; son titre, à tant de px de son centre.
   */
  /**
   * Les cadrans de l'ampli, en jeu : la gauche compte les titres de la face, de tant en tant ; la droite, les secondes de l'extrait.
   * Hors d'une face, ils montrent les plus longues qu'on puisse régler.
   */
  cadrans: { titres: { pas: 5, auPlus: 20 }, secondes: { pas: 10, pasCourt: 5, auPlus: 30 } },

  volume: { centre: [94, 232], rayon: 36, de: -135, a: 135, pas: 13.5, ecritTousLes: 2, titre: 72 },

  /**
   * L'interrupteur « Allume l'ampli », et son voyant juste à sa droite : une bague sombre, puis la lentille, en part de son rayon,
   * qui monte en dôme jusqu'à son cœur, plat.
   */
  interrupteur: { centre: [232, 226] },
  voyant: { centre: [300, 226], rayon: 7.5, epaisseur: 2.2, chanfrein: 1, lentille: 0.62, coeur: 0.31, bombe: 1.1 },

  /** Vis du coffre : leur retrait par rapport à chaque coin ; leur germe, pour des fentes qui ne sont jamais alignées. */
  vis: { retrait: 13, germe: 12 },
  /** La plaque de marque, à l'avant droit. */
  marque: [312, 300],
} as const;
