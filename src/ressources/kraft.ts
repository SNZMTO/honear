/**
 * La pochette kraft du disque mystère, à la taille du disque : un carré de papier, une fenêtre ronde par où l'on voit
 * l'étiquette, et une encoche du côté où le disque sort. Mesures en px, autour de son centre.
 */

export const KRAFT = {
  cote: 346,
  /** Arrondi des coins, et nombre de pans de chacun. */
  coin: 5,
  pansDeCoin: 3,
  /** Épaisseur visible de la pochette, disque dedans. */
  tranche: 3,
  /** Hauteur du papier du dos au-dessus du bois : c'est là-dessus que le disque glisse. */
  dos: 0.6,
  /** La fenêtre : son rayon, et son nombre de pans. */
  fenetre: { rayon: 88, pans: 48 },
  /** L'encoche du pouce, au milieu du côté ouvert : son rayon, et son nombre de pans. */
  encoche: { rayon: 27, pans: 12 },
  /**
   * Le tampon « Disque mystère », au-dessus de l'encoche : le milieu de sa première ligne de base par rapport au centre,
   * la largeur qu'une ligne peut prendre (au-delà, il passe à la ligne), l'interligne en parts du corps, et de combien
   * il penche, en degrés. Avec l'encoche et la pastille, il tient sur la bande de la pochette qui reste dans le cadre.
   */
  tampon: { en: [-112, -128], place: 96, interligne: 1.1, angle: -3 },
  /** La pastille du numéro de la piste, collée de travers sous l'encoche : son centre, son rayon, son angle, et l'écart entre ses deux lignes, en px. */
  pastille: { en: [-108, 112], rayon: 31, angle: -8, interligne: 4 },
  /**
   * Où elle est posée par rapport au coin haut-gauche du socle de la platine, et de combien elle est de travers :
   * devant la platine, à droite, son côté ouvert tourné vers la gauche. Elle sort du cadre par la droite, comme le disque
   * du plateau en sort par la gauche : on en voit le tiers ouvert, et le disque qui en sort entre dans le cadre.
   */
  place: { centre: [565, 692], angle: 4 },
  /**
   * Le chemin du disque qui en sort : de combien il glisse par le côté ouvert, en px. Assez pour être tout à fait dehors
   * avant la fin de sa course ; pas plus, pour que son étiquette reste dans le cadre.
   */
  sortie: 350,
} as const;
