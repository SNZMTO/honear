/**
 * Les réglages d'une partie : les valeurs proposées sur les commandes de la platine et celles par défaut,
 * puis le déroulé d'une piste. Les modes de jeu n'y sont pas : chacun se déclare dans le registre des modes.
 */

export const REGLAGES = {
  /** Nombre de pistes d'une partie. */
  pistes: { choix: [10, 15, 20], defaut: 15 },
  /** Durée de l'extrait, en secondes. */
  extrait: { choix: [10, 20, 30], defaut: 20 },
} as const;

export const DEROULE = {
  /** Le décompte avant l'extrait : le chiffre d'où il part, et la durée de chaque chiffre, en secondes. */
  decompte: { de: 3, pas: 1 },
  /**
   * Le préavis : le temps qu'il faut laisser entre l'instant où tous les appareils sont prêts et celui où l'extrait part,
   * en secondes. C'est ce qu'il faut au bras pour descendre sur le disque, avec un peu de marge.
   */
  preavis: 0.9,
  /**
   * Ce que le serveur attend un appareil en retard, une fois le décompte fini, avant de lancer l'extrait sans lui, en secondes :
   * il le rejoindra en route, au bon endroit.
   */
  attente: 3,
} as const;

/**
 * Le serveur, en secondes : une room où plus personne n'est branché s'en va au bout de ce temps (de quoi recharger sa page, retrouver
 * le réseau, ou revenir après une pause) ; aucune ne vit plus longtemps que la plus longue des soirées.
 */
export const SERVEUR = {
  expiration: { sansPersonne: 1800, auPlus: 21600 },
} as const;

/** L'adresse du site, telle que les planches l'écrivent sur le lien d'une room ; en ligne, c'est celle de la page. */
export const SITE = { adresse: 'honear.fr' } as const;

/** Les pages légales du site, par leur adresse : la confidentialité et les mentions légales. */
export const PAGES_LEGALES = { confidentialite: '/confidentialite', mentions: '/mentions-legales' } as const;

/** Le jeu comme une application, posé sur l'écran d'accueil d'un téléphone (il s'ouvre alors en plein écran) : son manifeste, son icône. */
export const APPLICATION = { manifeste: '/honear.webmanifest', icone: '/icone.svg' } as const;

/** Une room : de 2 à 12 pochettes autour du meuble, et le code qui l'ouvre. Ce que rapporte une réponse, c'est le mode qui le dit. */
export const PARTIE = {
  joueurs: { auMoins: 2, auPlus: 12 },
  /** Le code d'une partie : 4 lettres, sans celles qu'on confond de loin (I et L, O et Q). */
  code: { longueur: 4, lettres: 'ABCDEFGHJKMNPRSTUVWXYZ' },
  /** Combien de fois un joueur peut refaire sa pochette dans une room : assez pour jouer avec, pas de quoi la remplir de rien. */
  retouches: 40,
} as const;

/**
 * Le jugement d'une réponse tapée : on tolère une faute de frappe toutes les `lettresParFaute` lettres, et au-delà, jusqu'à
 * une part `presque` de la longueur de la réponse, c'est « Presque. » ; une saisie qui couvre au moins `morceau` de la réponse
 * attendue, sans la couvrir toute, aussi. Les petits mots qu'on oublie au début d'un titre ne comptent pas.
 */
export const JUGEMENT = {
  lettresParFaute: 5,
  presque: 0.4,
  morceau: 0.5,
  articles: ['le', 'la', 'les', 'l', 'un', 'une', 'des', 'the', 'a', 'an'],
  /** Les mots qui lient un artiste à son feat dans une saisie (« Angèle feat. Roméo Elvis ») : ils séparent, ils ne comptent pas. */
  liaisons: ['feat', 'ft', 'featuring', 'avec', 'x'],
} as const;
