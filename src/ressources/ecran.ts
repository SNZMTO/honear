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
 * le hit-parade ou la finale (celui-ci, quand une anecdote se lit dessous) ; l'ampli qu'on vient d'allumer reste de près ce temps-là, avant que le regard ne revienne au salon ;
 * le clavier qui tape tout seul met ce temps par lettre, et laisse ce temps à la réponse tapée avant de l'envoyer.
 */
export const TELEPHONE = {
  apresLaReponse: 4,
  apresLAnecdote: 9,
  ampliDePres: 1.6,
  clavier: { parLettre: 0.045, avantDEnvoyer: 0.35 },
  /**
   * L'horloge du serveur, vue du téléphone : on lui demande l'heure tant de fois de suite en se branchant, à cet écart, puis toutes
   * les tant de secondes ; on garde le meilleur des derniers échantillons, celui que le réseau a le moins retardé.
   */
  horloge: { auDebut: 5, entreDeux: 0.2, toutesLes: 10, echantillons: 8 },
  /**
   * Quand la ligne tombe, on se rebranche après ce temps, puis deux fois plus, jusqu'à ce plafond. Une ligne qui se tait plus de
   * `silence` secondes, la page au premier plan (on demande l'heure toutes les dix), ou plus de `auRetour` quand la page revient
   * au premier plan (on la redemande aussitôt), est morte sans le dire : l'iPhone qui revient de veille, ou de WhatsApp, la garde
   * « ouverte », et plus rien n'arrivait. On la rouvre.
   */
  reconnexion: { debut: 0.5, auPlus: 8, silence: 25, auRetour: 5 },
  /** Une zone à toucher fait au moins ce côté, en px du téléphone : celle d'une petite commande déborde autour d'elle. */
  zoneAuMoins: 44,
  /**
   * Un doigt posé qui glisse de plus que ça, en px de la page, ne touche plus rien : il fait glisser la page (à l'accueil, vers son
   * pied), ou il a changé d'avis.
   */
  doigt: { glisse: 10 },
  /** Une touche enfoncée reste ce temps au fond de sa course avant que l'écran d'après n'arrive : on voit qu'elle a été pressée. */
  tenue: 0.05,
  /** D'un écran à l'autre, le nouveau se fond sur l'ancien en ce temps-là (rien, quand on a demandé moins d'animations). */
  fondu: 0.18,
  /**
   * Au téléphone, le bois qu'on ne montre pas au-dessus de la platine, en px de la scène : aucun. L'écran commence sur la table,
   * la platine entière dessous ; la barre d'état (que Safari peint du fond de la page, le noyer) continue la table.
   */
  boisAuDessus: 0,
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
  /** Le pied de la page (l'accueil et le compte, au téléphone) : lâchée, la page se pose ouverte ou fermée en ce temps-là. */
  pied: { pose: 0.25 },
  /**
   * Le son : un extrait qui s'écarte de plus que ce temps de là où il devrait en être, à l'heure du serveur, y est remis, au plus
   * une fois en tant de secondes : chaque saut s'entend (l'iPhone met un moment à repartir, et sa position à se mettre à jour ;
   * le remettre trop vite, trop souvent, le faisait saccader ; lui changer sa vitesse aussi). Safari coupe le son à chaque
   * position qu'on lui donne en pleine lecture, et la pose souvent un peu à côté (bug WebKit 306350) : sur un iPhone, on ne le
   * remet à sa place qu'au-delà de `ecartAdmisSurIOS` (un extrait resté en panne, un téléphone qui revient de veille). Il se
   * tait en ce temps-là, là où le téléphone laisse baisser le volume. Un `play()` sans réponse au bout de `attenteDuPlay`
   * secondes, un extrait figé plus de `figeAuPlus` secondes en pleine lecture, ou relancé `relancesAuPlus` fois sans jamais
   * avancer (l'iPhone après une interruption : un appel, une notification, des écouteurs qu'on retire), est tenu pour refusé :
   * l'écran demande un toucher, qui relance un élément neuf.
   */
  son: { ecartAdmis: 0.6, ecartAdmisSurIOS: 2.5, entreDeuxSauts: 5, fondu: 0.6, attenteDuPlay: 4, figeAuPlus: 6, relancesAuPlus: 3 },
  /**
   * Le volume du bouton, de 0 à 1, là où il y en a un (un ordinateur ; au téléphone, ce sont ses boutons à lui) : aux deux tiers
   * en arrivant, assez pour qu'on entende, sans agresser les oreilles. L'oreille l'entend à cette puissance (un volume « cubique »,
   * comme sur les ordinateurs : à 30 %, on n'entendait presque rien) ; les petits bruits des touches ne se taisent jamais tout à
   * fait. On tourne le bouton en glissant (vers la droite ou vers le haut, il monte) : tant de px de la page le font aller d'un
   * bout à l'autre ; un clic sans glisser, ou une flèche du clavier, le change d'un pas.
   */
  volume: { depart: 0.7, courbe: 3, bruitsAuMoins: 0.3, pas: 0.1, course: 160 },
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
 * Les deux dispositions du jeu, rien entre elles (un regard à demi ouvert coupait le meuble aux bords) : une fenêtre au moins
 * `ordinateur` fois plus large que haute (un ordinateur, une tablette couchée) montre le meuble entier, le même d'un écran à
 * l'autre, et les liens du bas y flottent ; plus étroite (un téléphone, une tablette debout), l'écran du téléphone. Un téléphone
 * couché, moins haut que `hauteurAuMoins` px de la page, est prié de se redresser.
 */
export const GRAND_ECRAN = { hauteurAuMoins: 500, ordinateur: 0.8 } as const;
