/**
 * Les réglages du montage d'une scène dans un navigateur : la définition de ses images figées, et quand on les refait.
 */

export const MONTAGE = {
  /**
   * Px de toile par px de scène. Au-delà de trois, on ne voit plus la différence : on n'en fige pas davantage.
   * Le mode léger en fige moitié moins, sans descendre sous un : en dessous, tout devient flou.
   */
  definition: { auPlus: 3, auMoinsEnLeger: 1 },
  /** Une définition qui s'écarte de moins que cette part de celle des toiles ne vaut pas qu'on les refasse. */
  tolerance: 0.02,
  /**
   * Quand la taille du cadre change (un téléphone qu'on tourne, une fenêtre qu'on étire), on attend qu'elle se tienne
   * pendant ce temps, en secondes, avant de refaire les toiles : pas à chaque image du geste.
   */
  attente: 0.3,
} as const;

/**
 * Le téléphone, d'un écran à l'autre, en secondes : la réponse reste à l'écran ce temps après que le disque s'est retourné, avant
 * le hit-parade ou la finale ; l'ampli qu'on vient d'allumer reste de près ce temps-là, avant que le regard ne revienne au salon ;
 * le clavier qui tape tout seul met ce temps par lettre, et laisse ce temps à la réponse tapée avant de l'envoyer.
 */
export const TELEPHONE = {
  apresLaReponse: 4,
  ampliDePres: 1.6,
  clavier: { parLettre: 0.045, avantDEnvoyer: 0.35 },
  /**
   * L'horloge du serveur, vue du téléphone : on lui demande l'heure tant de fois de suite en se branchant, à cet écart, puis toutes
   * les tant de secondes ; on garde le meilleur des derniers échantillons, celui que le réseau a le moins retardé.
   */
  horloge: { auDebut: 5, entreDeux: 0.2, toutesLes: 10, echantillons: 8 },
  /** Quand la ligne tombe, on se rebranche après ce temps, puis deux fois plus, jusqu'à ce plafond. */
  reconnexion: { debut: 0.5, auPlus: 8 },
  /** Une zone à toucher fait au moins ce côté, en px du téléphone : celle d'une petite commande déborde autour d'elle. */
  zoneAuMoins: 44,
  /** Une touche enfoncée reste ce temps au fond de sa course avant que l'écran d'après n'arrive : on voit qu'elle a été pressée. */
  tenue: 0.07,
  /** D'un écran à l'autre, le nouveau se fond sur l'ancien en ce temps-là (rien, quand on a demandé moins d'animations). */
  fondu: 0.22,
  /** Un bouton rond qu'on tourne d'un cran (Pistes, Extrait, Mode, le volume) y va en ce temps-là, en ralentissant. */
  tourne: 0.25,
  /**
   * La touche principale d'un écran, celle qui le fait avancer, respire pour qu'on la voie : une lueur crème monte sur elle et
   * redescend en ce temps-là, jusqu'à cette opacité (rien quand on a demandé moins d'animations).
   */
  pouls: { duree: 1.8, eclat: 0.2 },
  /** Le tutoriel : le voile sombre qu'il pose sur le jeu, de cette opacité. */
  tuto: { voile: 0.9 },
  /**
   * Le son : un extrait qui s'écarte de plus que ce temps de là où il devrait en être, à l'heure du serveur, y est remis ;
   * il se tait en ce temps-là, là où le téléphone laisse baisser le volume.
   */
  son: { ecartAdmis: 0.15, fondu: 0.6 },
  /** Le volume de ce téléphone, de 0 à 1 : à 30 % en arrivant, pour ne pas agresser les oreilles ; un toucher le change de 10 %. */
  volume: { depart: 0.3, pas: 0.1 },
} as const;

/**
 * Le grand écran (un ordinateur, une tablette couchée) : une fenêtre au moins tant de fois plus large que haute, et au moins
 * si haute, en px de la page ; un téléphone couché, trop bas, garde le regard du téléphone.
 */
export const GRAND_ECRAN = { plusLargeQueHaut: 1.2, hauteurAuMoins: 500 } as const;
