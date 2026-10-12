/**
 * La table des réglages de mouvement : chaque matière bouge à sa façon, et aucun mouvement n'est réglé ailleurs.
 * Une matière est un ressort (raideur, amortissement, masse) ; le plateau est un volant (moteur et frottement).
 * Les temps sont en secondes, les angles en degrés, les longueurs en px.
 *
 * Les autres temps du site ne règlent pas un mouvement, et ont chacun leur table : ceux d'une partie (le décompte,
 * le préavis, la durée d'un extrait) dans reglages.ts, l'attente avant de refaire les toiles dans ecran.ts.
 * Les pas de calcul (la tranche d'une somme, la finesse d'une recherche) sont nommés là où ils servent.
 *
 * Pour lire un ressort : sa pulsation est la racine de raideur sur masse, et il arrive, à 2 % près, en 5,83 fois
 * l'inverse de sa pulsation quand son amortissement est critique (égal à deux fois la racine de raideur fois masse).
 * En dessous, il dépasse sa place une fois ; au-dessus, il traîne.
 */

export const MATIERES = {
  /**
   * Le plateau et son disque : un volant lourd. Il prend sa vitesse en 1,4 s (plein couple, puis accrochage en douceur),
   * la perd en 2 s une fois le moteur coupé, et ne rebondit jamais. 33 tours un tiers par minute font 200 degrés par seconde.
   */
  plateau: { croisiere: 200, moteur: { couple: 162, accrochage: 0.12 }, frottement: { sec: 43.1, visqueux: 0.75 } },

  /**
   * Le vinyle qu'on déplace : lourd. Il ne dépasse jamais sa place, sauf en se posant, où il se tasse d'un px.
   * Porté d'un endroit à l'autre, ou retourné, il suit la main qui le mène (voir `main`).
   */
  vinyle: {
    /** Il suit la main qui le porte, avec son inertie : seul, il la rejoindrait en 195 ms. C'est ce qui lui donne un départ sans à-coup. */
    suit: { raideur: 2700, amortissement: 180, masse: 3 },
    /** Il se soulève : 225 ms. */
    leve: { raideur: 2028, amortissement: 156, masse: 3 },
    /** Il se pose : il descend un px trop bas, la feutrine se tasse, puis il remonte à sa place. */
    pose: { raideur: 1728, amortissement: 96.5, masse: 3 },
  },

  /** Le bras : léger, amorti. Il se lève vite, descend lentement, dépasse sa cible une seule fois, à peine. */
  bras: {
    /** Il se lève : il est en haut en 110 ms, dépasse de 5 %, et s'y tient en 200 ms. */
    leve: { raideur: 900, amortissement: 42, masse: 1 },
    /** Le levier le relève d'un coup sec, à la révélation : en haut en 60 ms, il dépasse de 10 % (moins d'un px), et s'y tient en 130 ms. */
    sec: { raideur: 2025, amortissement: 54, masse: 1 },
    /**
     * Il pivote vers le bord du disque : il y est en 210 ms, le dépasse de 1,5 % (un tiers de degré), revient. La seconde du « 1 »
     * loge aussi sa descente : son dépassement culmine 20 ms avant qu'elle ne parte.
     */
    pivote: { raideur: 320, amortissement: 28.6, masse: 1 },
    /**
     * Lâché par le levier, il descend sur son amortisseur : sans à-coup au départ, puis à vitesse lente et constante
     * (en px par seconde). Les 7 px de sa levée lui prennent 620 ms : 80 de moins que le brief, pour laisser au pivot le temps de finir.
     */
    descend: { vitesse: 14.82, elan: 0.15 },
    /** Il suit sa course de chrono, ou se repose sur son support, sans dépasser. */
    suit: { raideur: 196, amortissement: 28, masse: 1 },
    /** Le diamant touche le disque : il rebondit d'un px, une fois. */
    touche: { raideur: 1600, amortissement: 40, masse: 1 },
    /** Il retourne lentement à son repos : 1,1 s. */
    retour: { raideur: 27, amortissement: 10.4, masse: 1 },
  },

  /** Le levier du bras : il bascule en 100 ms, presque sans dépasser (1,5 %). */
  levier: { raideur: 1444, amortissement: 60.8, masse: 1 },

  /** Une pastille : elle claque en 90 ms, arrêt net. Décollée, elle file en glissant. */
  pastille: {
    /**
     * Elle tombe de plus en plus vite, comme sous une main qui la plaque (vitesse en px par seconde) : les 9 px d'où elle arrive
     * lui prennent 90 ms, elle touche à 170 px par seconde, et ce qui la reçoit l'arrête net.
     */
    tombe: { vitesse: 272, elan: 0.09 },
    /** Elle se décolle : 90 ms, sans dépasser. */
    seDecolle: { raideur: 845, amortissement: 26, masse: 0.2 },
    file: { raideur: 16.2, amortissement: 3.6, masse: 0.2 },
  },

  /** Le carton d'une pochette qu'on bouscule ou qu'on entraîne : il frotte et s'arrête net, en 150 ms. */
  carton: { raideur: 480, amortissement: 24, masse: 0.3 },

  /**
   * Les aiguilles des vumètres : nerveuses. Elles montent en 80 ms et dépassent à peine (1,5 %) ; elles retombent en 300 ms, sans dépasser.
   * Au repos, la gauche suit sa respiration (voir `DANSE_DES_AIGUILLES.respire`) avec la matière de la retombée.
   */
  aiguille: {
    monte: { raideur: 2200, amortissement: 75, masse: 1 },
    retombe: { raideur: 380, amortissement: 39, masse: 1 },
  },

  /**
   * La main, qu'on ne voit pas. Elle porte le disque : elle le tire hors de sa pochette, puis l'emporte au-dessus du plateau,
   * plus posément parce que le chemin est plus long ; à la fin, elle le retourne. Le disque la suit avec son inertie (`vinyle.suit`).
   * À une mauvaise réponse, elle le raye : elle le ramène en arrière en 80 ms, le rend en 120 ms, puis le lâche. Le disque
   * reprend alors sa vitesse avec son inertie, sans jamais dépasser celle du plateau : il en retrouve 95 % en 900 ms.
   */
  main: {
    /** Elle tire le disque hors de sa pochette : il va au plus vite 105 ms après, et il est au bout de sa course, à 2 % près, en 315 ms. */
    tire: { raideur: 784, amortissement: 56, masse: 1 },
    /** Elle l'emporte au-dessus du plateau : il y est, à 2 % près, en 340 ms, et centré sur l'axe à moins d'un px en 455 ms. */
    emporte: { raideur: 576, amortissement: 48, masse: 1 },
    /**
     * Elle le retourne, en visant un peu au-delà du plat (`AMPLEURS.retournement.audela`) : il tourne au plus vite 190 ms après,
     * et retombe à plat en 690 ms, où le plateau l'arrête net.
     */
    retourne: { raideur: 81, amortissement: 18, masse: 1 },
    recule: { raideur: 15987, amortissement: 438, masse: 3 },
    rend: { raideur: 7086, amortissement: 291.6, masse: 3 },
    lache: { raideur: 38.9, amortissement: 21.6, masse: 3 },
  },

  /** Ce qu'on ne voit pas : le disque qui rejoint la course du plateau. */
  recalage: { raideur: 1600, amortissement: 80, masse: 1 },
  /**
   * Ce qu'on ne voit pas non plus : l'étiquette qui se recale sous ses arcs longs, pour que le disque s'arrête à l'endroit.
   * Elle s'y tient en 220 ms : avant que le disque ne passe sous 25 tours par minute, où le fondu commence à la montrer.
   */
  etiquetteSeRecale: { raideur: 4900, amortissement: 140, masse: 1 },

  /** Les repères du plateau, à une rayure : le plateau accuse le coup, puis se reprend. */
  reperes: { raideur: 81, amortissement: 18, masse: 1 },

  /** Le regard qui glisse d'un objet à son voisin : il arrive en 450 ms, avec un léger freinage. */
  regard: { raideur: 169, amortissement: 26, masse: 1 },
} as const;

/**
 * Les temps d'une piste : ce qui part quand, compté depuis un chiffre du décompte ou depuis la révélation.
 * Rien ne part en même temps : deux pièces démarrent toujours à quelques centièmes d'écart.
 */
export const TEMPS = {
  /**
   * Au « 3 » : le disque sort de sa pochette ; dehors, il se soulève ; puis il est emporté au-dessus du plateau, et se pose
   * quand il est centré sur l'axe. Il est en place au « 2 ».
   */
  disque: { sort: 0.03, seSouleve: 0.31, traverse: 0.36, sePose: 0.76 },
  /** Au « 3 », le disque qui sort de sa pochette kraft l'entraîne un instant avec lui. */
  kraft: { entrainee: 0.07 },
  /** Au « 1 » : le levier bascule, le bras se lève, puis pivote vers le bord du disque. */
  bras: { levier: 0, seLeve: 0.04, pivote: 0.07 },
  /**
   * Avant l'extrait : le levier se baisse, et le bras commence à descendre 50 ms après. La descente est comptée à rebours :
   * elle finit à l'instant même où l'extrait part.
   */
  descente: { levier: 0.05 },
  /** À zéro : la pastille se décolle, puis file hors du cadre. */
  pastille: { seDecolle: 0.03, file: 0.08, disparait: 0.6 },
  /**
   * À une rayure : la main ramène le disque en arrière ; 30 ms après, le bras tressaute ; 30 ms encore, les repères du plateau
   * accusent le coup. À 80 ms la main rend le disque, et le lâche 120 ms plus tard ; les repères se reprennent ensuite.
   */
  rayure: { brasTressaute: 0.03, repereAccuse: 0.06, mainRend: 0.08, mainLache: 0.2, repereSeReprend: 0.23 },
  /**
   * À la révélation : le levier relève le bras, le moteur coupe, le bras retourne à son repos ; puis le levier se baisse
   * et le bras se repose. Pendant que le disque ralentit, un écran prépare la réponse qu'il montrera à son verso (`reponse`) :
   * à cet instant, seuls bougent des arcs qui ralentissent et le bras qui s'en va.
   */
  revelation: { brasSeLeve: 0.03, moteurCoupe: 0.06, brasRetourne: 0.12, reponse: 0.65, levierSeBaisse: 1.35, brasSeRepose: 1.4 },
  /**
   * Le disque arrêté, le bras reposé : le regard glisse vers le disque ; à son arrivée le disque se soulève, puis se retourne.
   * Il retombe à plat de lui-même : cet instant-là se déduit de la main qui le retourne (voir `MATIERES.main.retourne`).
   */
  retournement: { regard: 0.08, seSouleve: 0.46, seRetourne: 0.58 },
} as const;

/**
 * Les ampleurs : de combien un geste soulève, tourne, pousse ou lance sa pièce, hors des mesures des objets eux-mêmes ;
 * et les vitesses auxquelles l'étiquette d'un disque change de face.
 */
export const AMPLEURS = {
  /** Hauteur à laquelle le disque vole au-dessus du bois, en px visibles. */
  vol: 44,
  /**
   * Le disque qui se retourne : il passe d'abord au-dessus de la pointe de l'axe avec cette garde, en px visibles, que la main rend
   * à mesure qu'il tourne ; elle vise tant de degrés au-delà du plat, pour qu'il y arrive avec de l'élan ; et cet élan, quand
   * le plateau l'arrête, tasse la feutrine d'un px (c'est une vitesse, en px par seconde : à peu près celle où son centre descendait).
   */
  retournement: { garde: 5, audela: 5, tassement: 51 },
  /** Ce dont la tête du bras est levée, en px visibles ; et l'élan du diamant qui touche le disque, ou du bras qui tressaute, en px par seconde. */
  brasLeve: 7,
  rebond: 73,
  /** Le bras ondule une fois par tour, comme sur un disque un peu excentré : de tant de degrés. */
  ondulation: 0.2,
  /** Rayons du disque où le diamant se pose au début de l'extrait, et où il arrive à la fin. */
  course: { de: 157, a: 80 },
  /**
   * Le disque arrêté, le regard glisse de tant de px et s'arrête sur lui : on lit alors tout son verso, pochette, titre et artiste.
   * À gauche du socle, il reste un liseré de noyer ; à droite, le cadre coupe franchement le bord du disque et le plateau,
   * entre le bouton de mode et l'interrupteur du son : aucune inscription n'est coupée, aucune pièce ne dépasse d'un rien.
   */
  regardSurLaReponse: -142,
  /** À une rayure : le disque revient de tant de degrés en arrière ; les repères du plateau glissent de tant. */
  rayure: { recul: 20, repere: 2.5 },
  /** Le disque qui sort de sa pochette kraft l'entraîne de tant de px, du côté de son ouverture : le papier frotte contre lui. */
  entrainementDuKraft: 2,
  /** La pastille du décompte, décollée, file de tant de px vers la droite. */
  fuiteDeLaPastille: 90,
  /**
   * L'étiquette quand le disque tourne, en degrés par seconde du plateau (60 font 10 tours par minute). Chaque dessin paraît
   * ou s'efface entre deux vitesses, sans à-coup : sous 10 tours par minute on lit le texte entier ; il laisse une traînée
   * dès 20, s'efface entre 60 et 100 sous des arcs courts, que des arcs longs allongent jusqu'à être seuls à 150.
   * La traînée : deux copies du texte, tournées en arrière l'une de l'autre de ce que le disque parcourt en `retard` secondes.
   * Ses arcs longs cachent aussi l'étiquette tant qu'elle n'est pas recalée, à ce nombre de degrés près, sur l'angle où elle doit être.
   */
  etiquette: {
    texte: { de: 60, a: 100 },
    trainee: { parait: { de: 20, a: 60 }, sEfface: { de: 85, a: 120 }, retard: 0.03, opacites: [0.5, 0.28] },
    arcsCourts: { parait: { de: 70, a: 105 }, sEfface: { de: 130, a: 150 } },
    arcsLongs: { de: 105, a: 150 },
    recalee: 0.5,
  },
} as const;

/** Les touches : 2 px de course, 60 ms pour s'enfoncer, 80 ms pour remonter, à vitesse constante. Arrêt net, aucun rebond. */
/**
 * La danse des aiguilles, pendant l'extrait : au départ, elles sursautent ensemble ; puis elles dansent, une nouvelle cible à chaque
 * battement, chacune la sienne, tirée entre deux bornes ; dans les 5 dernières secondes elles passent dans le rouge ; à la révélation,
 * ou à la fin de l'extrait, elles retombent. À une mauvaise réponse, elles font un pic. Au repos, la gauche respire.
 * Les temps en secondes, les places de 0 (au repos) à 1 (en butée).
 */
export const DANSE_DES_AIGUILLES = {
  sursaut: { place: 0.84, duree: 0.2 },
  battement: 0.27,
  danse: { de: 0.34, a: 0.76 },
  /** Dans les dernières secondes, elles dansent plus haut : dans le rouge. */
  rouge: { avantLaFin: 5, de: 0.86, a: 0.98 },
  /** Le pic d'une mauvaise réponse : la place, et le temps qu'elles y restent avant de reprendre la danse. */
  pic: { place: 0.97, duree: 0.12 },
  /** La respiration au repos : de combien elle s'écarte du repos, et en combien de temps elle fait un souffle. */
  respire: { place: 0.05, souffle: 3.6 },
  /** La droite bat une demi-mesure après la gauche : elles ne vont jamais tout à fait ensemble. */
  decalage: 0.5,
  /** Le germe des cibles : le même extrait danse toujours de la même façon, sur tous les écrans. */
  germe: 33,
} as const;

export const TOUCHES = { course: 2, enfonce: 0.06, remonte: 0.08 } as const;

/**
 * Ce que le moteur de mouvement tolère.
 * De l'horloge, en secondes : après un trou plus long (un onglet qui revient, un téléphone en retard), on ne rejoue pas ce qui
 * a été manqué, chaque pièce est posée où elle doit être ; si l'horloge recule d'un rien (elle vient d'être recalée
 * sur le serveur), on l'attend ; si elle recule davantage, c'est qu'on a remis la piste en arrière, et tout est reposé.
 * D'une pièce presque arrivée : en deçà de cet écart à sa place (en px ou en degrés) et de cette vitesse (par seconde),
 * elle s'arrête net. C'est bien moins que ce qu'un écran sait montrer ; son élan éteint, plus rien ne s'écrit pour elle dans la page.
 */
export const TOLERANCES = { trou: 1, recul: 0.1, repos: { ecart: 0.001, vitesse: 0.01 } } as const;

/**
 * Les gestes de la tablée et du meuble (étape 5) : ce qui arrive sur le bois, s'y colle, s'y range, et ce qu'on règle à la main.
 * Les ressorts critiques arrivent sans dépasser, en 5,83 fois l'inverse de leur pulsation (voir plus haut) ; les glissades
 * sont freinées par un frottement sec, et s'arrêtent net. Temps en secondes, longueurs en px, angles en degrés.
 */
export const GESTES = {
  /** Ce qu'on rejoue d'un geste pour une image arrêtée : le pas, bien plus fin que le plus vif d'entre eux, et le repos d'avant. */
  rejeu: { pas: 1 / 240, avant: 0.3 },

  /**
   * Une pochette qui arrive : lancée d'un bord de l'écran, elle glisse sur le bois en tournant, de moins en moins vite, et s'arrête
   * net, de travers. Le carton frotte : lancée de 200 px, elle perd sa vitesse en 600 ms. Elle part de tant de px au-delà du bord,
   * tourne de tant de degrés en route, et pousse de tant de px la pochette qu'elle touche à l'arrivée.
   */
  arrivee: { frottement: { frein: 1111 }, depuis: 60, tour: 40, pousse: 2 },

  /**
   * Une pastille tombe sur une pochette : elle arrive un peu plus grande, d'un peu plus haut, et claque (`MATIERES.pastille.tombe`).
   * La pochette encaisse : elle s'enfonce d'un px, 30 ms après l'impact, et revient (un coup, en px par seconde, sur un ressort critique).
   */
  encaisse: { ressort: { raideur: 1111, amortissement: 66.7, masse: 1 }, coup: -90.6 },

  /** « Presque. » : collée sur l'étiquette vierge, elle y reste 1,2 s, puis se décolle (de 3 px) et glisse hors du cadre, vers la droite. */
  presque: { reste: 1.2, decollee: 3, seDecolle: 0.09, frottement: { frein: 1600 }, fuite: 320 },

  /**
   * Les quatre étiquettes du mode 4 choix : elles arrivent en glissant depuis la gauche, à 40 ms d'écart, de travers ; le papier
   * frotte moins que le carton. À la révélation, les trois mauvaises repartent vers la gauche, à 40 ms d'écart, hors du cadre.
   */
  choix: { frottement: { frein: 1600 }, depuis: 300, ecart: 0.04, tour: 5, sortie: 340 },

  /** La vraie pochette sort de sous la kraft : elle glisse de tant de px, en tournant de tant de degrés, et s'arrête de travers. */
  vraie: { frottement: { frein: 1111 }, depuis: [180, -40], tour: 22 },

  /** Une pochette retournée quand la connexion tombe : elle se soulève en tournant sur elle-même, montre son dos, et retombe. */
  deconnexion: { retourne: { raideur: 332, amortissement: 36.4, masse: 1 }, leve: 8 },

  /**
   * Le hit-parade : les pochettes se rangent du dernier au premier, à 70 ms d'écart. Celle qui double se soulève (150 ms),
   * passe par-dessus l'autre (380 ms), et se pose ; la doublée se pousse un temps après qu'elle est passée. Une pastille claque
   * sur chaque pochette qui a bougé, une fois posée. Les autres glissent à leur place sans se soulever.
   */
  hitParade: {
    ecart: 0.07,
    leve: 12,
    seSouleve: { raideur: 1512, amortissement: 77.8, masse: 1 },
    passe: { raideur: 235, amortissement: 30.7, masse: 1 },
    sePose: { raideur: 2360, amortissement: 97.2, masse: 1 },
    /** Quand la doublée se pousse, depuis le départ de celle qui la double ; et quand la pastille claque, une fois la pochette posée. */
    poussee: 0.16,
    passeA: 0.12,
    poseA: 0.42,
    pastille: 0.5,
  },

  /**
   * La finale : trois disques posés un par un, l'or, le platine, puis le diamant, chacun descendant de tant de px avec son ombre
   * qui se resserre (350 ms). Le diamant fait ensuite un dernier tour lent : ses facettes passent au ton le plus clair l'une
   * après l'autre, comme un éclat qui fait deux fois le tour du disque ; puis il s'arrête, trois facettes allumées.
   */
  finale: {
    vol: 26,
    descend: { raideur: 277.5, amortissement: 33.3, masse: 1 },
    ecart: 0.55,
    tour: { apres: 0.4, duree: 2.4, tours: 2, angle: 24 },
  },

  /**
   * « Allume l'ampli » : l'interrupteur bascule en deux temps, la course (jusqu'au milieu, 120 ms), puis le clic (40 ms) ;
   * au clic, le voyant passe au miel ; 30 ms après, les deux aiguilles partent en butée, puis retombent.
   */
  ampli: {
    course: { part: 0.5, ressort: { raideur: 2361, amortissement: 97.2, masse: 1 } },
    clic: { a: 0.12, ressort: { raideur: 21252, amortissement: 291.6, masse: 1 } },
    aiguilles: { a: 0.03, retombent: 0.22 },
  },

  /** Un sélecteur tourne de cran en cran : il dépasse de 2 degrés en 100 ms, et revient sur son cran 150 ms après son départ. */
  selecteur: {
    /** D'un cran au suivant, quand on en passe plusieurs. */
    cran: 0.22,
    depasse: 2,
    tourne: { raideur: 3402, amortissement: 116.7, masse: 1 },
    revient: { a: 0.15, ressort: { raideur: 2360, amortissement: 97.2, masse: 1 } },
  },

  /**
   * Le regard qui glisse d'un objet à l'autre : en 350 à 550 ms selon la distance, sans dépasser, freinant à l'arrivée.
   * À l'arrivée, l'objet visé répond d'un petit signe : une aiguille de l'ampli tressaille (tant, en part de sa course).
   */
  regard: { court: { distance: 120, duree: 0.35 }, long: { distance: 800, duree: 0.55 }, signe: { place: 0.12, tient: 0.08 } },

  /** La playlist choisie sort du bac : elle se soulève de 6 px (150 ms), puis monte de tant de px, par le haut. */
  bac: {
    leve: 6,
    seLeve: { raideur: 1512, amortissement: 77.8, masse: 1 },
    sortA: 0.35,
    sort: 48,
    sortie: { raideur: 235, amortissement: 30.7, masse: 1 },
  },
} as const;
