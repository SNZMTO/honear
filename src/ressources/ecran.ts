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
  /** Au téléphone, le bois qu'on ne montre pas au-dessus de la platine, en px de la scène : l'écran commence au bord de la platine. */
  boisAuDessus: 28,
  /** Un bouton rond qu'on tourne d'un cran (Pistes, Extrait, Mode, le volume) y va en ce temps-là, en ralentissant. */
  tourne: 0.25,
  /**
   * Le diagnostic (« ?diagnostic ») : ses lignes partent au serveur par paquets, toutes les tant de secondes, d'au plus tant de
   * caractères ; on n'en garde pas plus que tant en attendant la ligne.
   */
  diagnostic: { envoi: 2, paquet: 3000, enAttente: 400 },
  /** Le lien de la room copié : son papier le dit ce temps-là. */
  lienCopie: 2,
  /** La réponse qu'on valide (« Entrée ») : son étiquette reste enfoncée ce temps-là, qu'on voie qu'elle est partie. */
  reponseEnfoncee: 0.25,
  /** Le curseur de ce qu'on tape clignote : allumé ce temps-là, éteint autant. */
  curseur: { demiPeriode: 0.53 },
  /** Le tutoriel : le voile sombre qu'il pose sur le jeu, de cette opacité. */
  tuto: { voile: 0.9 },
  /**
   * Le son : un extrait qui s'écarte de plus que ce temps de là où il devrait en être, à l'heure du serveur, y est remis, au plus
   * une fois en tant de secondes : chaque saut s'entend (l'iPhone met un moment à repartir, et sa position à se mettre à jour ;
   * le remettre trop vite, trop souvent, le faisait saccader). Il se tait en ce temps-là, là où le téléphone laisse baisser le volume.
   */
  son: { ecartAdmis: 0.6, entreDeuxSauts: 5, fondu: 0.6 },
  /**
   * Le volume de ce téléphone, de 0 à 1 : à 30 % en arrivant, pour ne pas agresser les oreilles. L'oreille l'entend à cette
   * puissance (un volume « cubique », comme sur les ordinateurs) ; les petits bruits des touches ne se taisent jamais tout à fait.
   * On tourne le bouton en glissant le doigt (vers la droite ou vers le haut, il monte) : tant de px de la page le font aller
   * d'un bout à l'autre ; un toucher sans glisser, ou une flèche du clavier, le change d'un pas.
   */
  volume: { depart: 0.3, courbe: 3, bruitsAuMoins: 0.3, pas: 0.1, course: 160 },
} as const;

/**
 * Les petits bruits du téléphone : une note brève qui glisse de `de` à `a` (en hertz) en ce temps-là, à cette force (avant le
 * volume) ; la touche qu'on enfonce sonne grave et ronde, le bouton qui passe un cran, plus sec. Le silence où chaque bruit s'éteint.
 */
export const BRUITS = {
  touche: { de: 520, a: 180, duree: 0.06, fort: 0.5 },
  cran: { de: 1800, a: 900, duree: 0.025, fort: 0.25 },
  silence: 0.0001,
} as const;
export type NomDeBruit = 'touche' | 'cran';

/**
 * Le grand écran (un ordinateur, une tablette couchée) : une fenêtre au moins tant de fois plus large que haute, et au moins
 * si haute, en px de la page ; un téléphone couché, trop bas, garde le regard du téléphone.
 */
export const GRAND_ECRAN = { plusLargeQueHaut: 1.2, hauteurAuMoins: 500 } as const;
