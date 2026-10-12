/**
 * La tablée : où se pose, sur chaque écran du téléphone, ce qui vient sur le bois sous la platine (les pochettes des joueurs,
 * l'étiquette vierge, les étiquettes à toucher, les touches, les papiers, la vraie pochette, les disques de la finale).
 * Les places sont en px dans le regard de l'écran (coin haut-gauche du cadre), les angles en degrés :
 * rien de ce qui est posé n'est jamais droit. Une seule action par écran, dans la zone du pouce, en bas.
 */

export interface Place {
  readonly en: readonly [number, number];
  readonly angle: number;
}

/** Le papier : sa marge, ses coins, ses lignes, son épaisseur, et le curseur de l'étiquette où l'on tape. */
export const PAPIER = {
  marge: 12,
  coin: 4,
  /** Une ligne trop longue passe à la ligne : trois lignes au plus ; l'interligne en part du corps, l'écart entre deux lignes différentes. */
  lignesAuPlus: 3,
  interligne: 0.5,
  entre: 9,
  epaisseur: 0.6,
  avantLeCurseur: 3,
  curseurDepasse: 2,
  hauteurDuCurseur: 0.82,
  epaisseurDuCurseur: 1.8,
} as const;

export const TABLEE = {
  telephone: {
    /**
     * La colonne : sous la platine, tout ce qu'on pose et tout ce qu'on touche part de ce bord gauche, l'éventail, les papiers,
     * les étiquettes, les touches ; la kraft tient le côté droit. Chacun s'y pose un peu de travers, à un ou deux px près,
     * jamais au cordeau. Seule la finale se range autour du milieu : un podium.
     */
    colonne: { gauche: 18, largeur: 228 },
    /**
     * L'éventail des pochettes des joueurs, en 48 px, rangées dans l'ordre du classement, le premier à gauche : c'est le mini hit-parade.
     * Elles se serrent à mesure qu'on est nombreux, jusqu'à douze, entre `de` et `a` (à gauche de la pochette kraft), ou sur toute
     * la largeur quand la kraft n'est pas là. Toutes penchées du même côté, comme posées d'une même main : jamais droites, entre 3 et 9 degrés.
     */
    eventail: {
      y: 514,
      de: 42,
      a: 226,
      aSansKraft: 356,
      pasAuPlus: 56,
      taille: 48,
      angles: [-4, -6, -3, -5, -7, -4, -6, -3, -5, -7, -4, -6],
      /** Ce dont une pochette sur deux descend, pour que l'éventail ait un peu de relief. */
      decalage: 3,
    },
    /** Le tableau des scores, en jeu : les points de chacun, sous sa pochette dans l'éventail, de ce corps, tant de px sous elle. */
    scores: { corps: 12, sous: 14 },
    /** La pastille qui claque sur une pochette de l'éventail quand son joueur trouve : petite, dans son coin bas-droit. */
    trouve: { rayon: 12, coin: [0.36, 0.34], angle: -10 },
    /** La pastille du hit-parade ou des points sur une pochette plus grande : dans son coin bas-droit (en part du côté). */
    pastille: { coin: [0.4, 0.36], angle: -12 },
    /** L'étiquette vierge de la saisie libre, et les pastilles « Artiste », « Titre » et « Feat » qui se collent sur son bord haut. */
    reponse: {
      en: [136, 642],
      largeur: 236,
      /** Taillée à ce qu'on tape, jamais plus étroite que ses trois pastilles côte à côte. */
      auMoins: 184,
      angle: -1,
      /** Les pastilles, à cheval sur le bord haut, surtout au-dessus pour ne rien cacher : leur place en part de la largeur, depuis le milieu ; leur angle. */
      pastilles: { places: [-0.31, 0.31, 0], au: -13, angles: [-9, 7, -3] },
    },
    /**
     * Clavier ouvert : la platine garde le haut, le regard descend un peu, l'étiquette vierge se colle au-dessus du clavier.
     * Ces places sont celles d'un clavier de cette hauteur ; un vrai clavier plus haut les remonte d'autant, jusqu'à ce que son dessus
     * soit à `auPlusHaut` du haut du regard.
     */
    clavier: { hauteur: 291, descente: 44, eventail: 486, reponse: 526, auPlusHaut: 330 },
    /** Les quatre étiquettes à toucher du mode 4 choix, en colonne dans la zone du pouce. */
    /**
     * Les quatre étiquettes du mode 4 choix, en deux colonnes de deux, à gauche de la pochette kraft : le milieu de chaque colonne,
     * la hauteur de chacune (de la première à la quatrième, rang par rang), leur largeur ; le titre au-dessus, l'interprète dessous.
     */
    choix: {
      x: [74, 194],
      y: [636, 636, 734, 734],
      largeur: 112,
      angles: [-1.5, 1, -1, 1.5],
      /** L'étiquette qu'on a touchée : enfoncée de tant de px, à plat, dans ce papier plus sombre. */
      touchee: { enfonce: 3, teinte: 'kraft' },
    },
    /**
     * Un papier qui dit ce qui se passe, sur la colonne, au-dessus de la zone du pouce ; à gauche de la vraie pochette, une fois révélée.
     * Taillé à sa phrase, il garde son bord gauche.
     */
    message: { en: [132, 610], largeur: 228, angle: -1.5, aCoteDeLaVraie: { en: [128, 640], largeur: 220 } },
    /** Un mot sur une pastille (« Presque. », « Rayé. ») collée à cheval sur le bord droit de l'étiquette vierge. */
    mot: { decalage: [22, -2], angle: -8 },
    /**
     * Le bouton du volume, au téléphone : la copie de celui de l'ampli, petite, sur le coin haut droit de la platine (à droite du
     * contrepoids du bras), ou du cadre. Son centre, dans le regard du téléphone, et son rayon.
     */
    volume: { en: [364, 54], rayon: 15 },
    /** La touche pour quitter la partie, en miroir du volume : au coin haut gauche du cadre, son bord gauche et son milieu. */
    quitter: { en: [10, 54] },
    /**
     * L'accueil : le titre du jeu, en grand, sous la platine ; deux grandes touches au milieu, créer une room ou en rejoindre une
     * avec son code (leur hauteur) ; dessous, deux petits onglets, sa pochette à gauche et son compte à droite, entre ces deux bords.
     */
    accueil: { titre: { en: [195, 528], angle: -2 }, poser: 626, code: 706, onglets: { y: 792, gauche: 20, droite: 370 } },
    /**
     * Le compte : sous la platine, sur la colonne, le papier qui dit ce qu'il garde (ou ce qui se passe, ce qu'on vient de refuser),
     * l'étiquette où l'on tape son adresse ; puis les touches, par leur bord gauche, de haut en bas, et « Retour » au bout.
     */
    compte: {
      papier: { en: [195, 548], largeur: 300 },
      /** Le lien parti : un papier plus large, qui laisse à l'adresse toute une ligne. */
      envoye: { en: [195, 552], largeur: 336 },
      adresse: { en: [195, 630], largeur: 300, angle: -1 },
      /** La hauteur de la touche de l'étape (envoyer le lien, entrer…) ; des deux touches du compte ouvert, ou de la question avant d'effacer. */
      action: 734,
      deux: [650, 728],
      retour: 806,
    },
    /** La saisie du code : le papier, ses quatre cases, la touche qui entre (par son bord gauche). */
    saisie: { en: [195, 610], largeur: 260, angle: -1.5, cases: 4, entrer: 784, message: [195, 690] },
    /**
     * Le salon : l'éventail des pochettes, le lien à copier, l'ampli à allumer, et la touche de l'hôte, en colonne ; les touches
     * par leur bord gauche. Le QR code est sur la kraft.
     */
    salon: { lien: { en: [132, 640], largeur: 228 }, lancer: [18, 792], pochette: [19, 565] },
    /** Le QR code imprimé sur la pochette kraft, dans le tiers qu'on en voit : son centre depuis celui de la pochette, et son côté. */
    qr: { en: [-100, 12], cote: 66 },
    /** Le bac, chez l'hôte : les trois façons de choisir, en crans au-dessus du bac, et ce qui se pose dessous. */
    bac: {
      /** Les crans, taillés à leur libellé, côte à côte depuis la colonne, à cet écart l'un de l'autre. */
      crans: { y: 470, ecart: 10 },
      saisie: { en: [195, 562], largeur: 300 },
      resultats: { y: 662, x: [66, 152, 238, 324], rayon: 36 },
      message: { en: [195, 664], largeur: 300 },
      /** « Mes playlists », sous l'étiquette du lien : un disque et son papier par rangée, à ces hauteurs. */
      miennes: { y: [628, 680, 732] },
      /** La hauteur de la touche qui choisit, au milieu. */
      choisir: 792,
      /** La playlist choisie, sous les résultats ; aux « Prêtes à jouer », de combien elle sort du bac ; d'où viennent les extraits. */
      choisie: { en: [195, 730], largeur: 300 },
      /**
       * Aux « Prêtes à jouer », les playlists du genre touché, en liste au milieu : à chaque rang sa hauteur et son angle ; un disque
       * à gauche (son centre et son rayon), son nom sur un papier à droite (le milieu du papier, sa largeur). La choisie se soulève
       * d'autant. « Au hasard », dessous, à cette hauteur.
       */
      playlists: {
        y: [518, 570, 622, 674],
        angles: [-1, 0.8, -0.6, 1],
        disque: { x: 62, rayon: 23 },
        papier: { x: 222, largeur: 252 },
        leve: 12,
        auHasard: 730,
      },
      /** Le regard sur le bac descend sous le haut de ses intercalaires, de cette marge : on lit tous les thèmes. */
      auDessus: 10,
      leve: 28,
      source: { en: [195, 424], largeur: 300 },
    },
    /** Les réglages : la touche qui ouvre le salon (par son bord gauche), une fois les commandes de la platine réglées. */
    reglages: { ouvrir: 792 },
    /**
     * « Fais ta pochette » : le regard se pose à côté de la platine, sur le bois nu. En haut, la pochette, en grand ; dessous,
     * l'étiquette vierge du nom ; « Au hasard », puis « C'est moi ». Rien d'autre : on tire au sort jusqu'à ce qu'elle plaise.
     * Les tailles des pochettes, en px.
     */
    pochette: {
      origine: [520, 560],
      pochette: { en: [195, 228], angle: -4, taille: 300 },
      etiquette: { centre: [176, 452], largeur: 268, angle: -1.5, marge: 14 },
      auHasard: [112, 690],
      /** Quand on la refait (à l'accueil, dans la room) : la touche qui la laisse comme elle était, à côté du hasard. */
      laisser: [296, 690],
      cEstMoi: [195, 784],
    },
    /** La révélation : la vraie pochette, sortie de sous la kraft, posée de travers à côté d'elle. */
    vraiePochette: { en: [292, 704], angle: 8, taille: 104 },
    /** Le hit-parade entre deux pistes : les pochettes en 64 px, du premier au dernier, quatre par rang ; chez l'hôte, la touche suivante. */
    hitParade: { x: [50, 132, 214, 296], y: [536, 620, 704], taille: 64, angles: [-4, -6, -3, -5], suivante: [18, 792], pochette: [20, 792] },
    /** La finale : les trois premiers, leurs disques glissés à côté, le dos de pochette où sont imprimés les titres joués. */
    finale: {
      premiers: [
        { en: [195, 534], angle: -3, taille: 92 },
        { en: [82, 566], angle: 5, taille: 72 },
        { en: [308, 572], angle: -6, taille: 72 },
      ],
      /** Le disque de chacun, sorti de sa pochette vers le haut à droite : son décalage en part du côté, et son rayon en part du côté. */
      disque: { decalage: [0.36, -0.36], rayon: 0.42 },
      suivants: { y: 640, x: [60, 120, 270, 330], taille: 40 },
      titres: { en: [195, 716], largeur: 300, angle: 1.5 },
      rejouer: [195, 806],
      /** Chez l'invité, à la place de « Rejouer la face B » : sa pochette, à refaire. */
      pochette: [195, 806],
      /** Combien de titres le papier écrit en entier ; au-delà, il dit combien il y en a. */
      titresEnEntier: 3,
    },
    /**
     * Les titres joués, qu'on revoit en touchant leur papier à la finale : le regard se pose à côté de la platine, sur le bois nu.
     * Un grand papier, le dos d'une pochette : en haut le titre, puis chaque titre joué avec sa pochette, en une colonne jusqu'à dix,
     * en deux au-delà ; « Retour » dessous. En px dans le regard.
     */
    titres: {
      papier: { gauche: 14, haut: 34, largeur: 362, bas: 744, angle: -0.8, marge: 14 },
      /** L'écart sous le titre, entre deux colonnes ; la plus grande pochette et le plus grand pas d'une ligne à l'autre ; l'écart du texte. */
      sousLeTitre: 18,
      entreColonnes: 12,
      pochetteAuPlus: 46,
      pasAuPlus: 62,
      apresLaPochette: 10,
      colonneAuPlus: 10,
      retour: [195, 798],
    },
  },

  /**
   * L'écran de l'hôte, en grand (1440 × 900) : le meuble entier, et ce qui se pose devant lui. En px dans ce cadre.
   * Devant le bac et la gauche de la platine, la tablée : les pochettes de tous, en deux rangs de six, dans l'ordre du classement.
   * Devant la droite de la platine, la kraft ; à droite d'elle, sous l'ampli, ce qu'on lit et ce qu'on touche.
   * Tout y est plus grand qu'au téléphone : on le lit depuis le canapé.
   */
  hote: {
    tablee: { x: [100, 210, 320, 430, 540, 650], y: [612, 736], taille: 96, angles: [-5, 4, -3, 6, -6, 3, 5, -4, 7, -3, 4, -6] },
    /** Les pastilles sur une pochette de la tablée : A, T, F, un point ; dans son coin bas-droit, en part du côté. */
    trouve: { rayon: 17, coin: [0.36, 0.34], angle: -10 },
    pastille: { coin: [0.38, 0.36], angle: -12 },
    /** Le lien de la room, sous l'ampli, à droite de la kraft ; la touche de l'ampli, sous lui ; celle qui lance, devant la tablée. */
    lien: { en: [1330, 566], largeur: 200 },
    allume: [1206, 482],
    lancer: [375, 852],
    /** Les quatre étiquettes du mode 4 choix, en rang devant la tablée. */
    choix: { x: [150, 355, 560, 765], y: 852, largeur: 196, angles: [-2, 1.5, -1, 2.5] },
    /** La vraie pochette, sortie de sous la kraft, posée de travers à sa gauche. */
    vraiePochette: { en: [790, 770], angle: 8, taille: 120 },
    /** La finale : les trois premiers en grand, les suivants en petit dessous ; les titres joués et la touche qui rejoue, à droite. */
    finale: {
      premiers: [
        { en: [330, 590], angle: -3, taille: 150 },
        { en: [150, 630], angle: 5, taille: 120 },
        { en: [510, 636], angle: -6, taille: 120 },
      ],
      suivants: { y: 800, x: [110, 210, 310, 410, 510, 610, 710, 810, 910], taille: 72 },
      titres: { en: [1060, 650], largeur: 420, angle: 1.5 },
      rejouer: [1060, 846],
    },
  },
} as const;
