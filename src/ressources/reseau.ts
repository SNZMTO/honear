/**
 * Le réseau, côté serveur : ce qu'un message peut peser, à quel rythme on vérifie qu'un téléphone est encore là, ce qu'un téléphone
 * peut envoyer sans être coupé, et le plus long que la minuterie du serveur dort. Les durées sont en secondes.
 */

export const RESEAU = {
  /** Un message, au plus, en octets : une pochette et son nom tiennent dans le quart. */
  messageAuPlus: 4096,
  /** Toutes les tant de secondes, on demande à chaque téléphone s'il est là ; qui n'a pas répondu à la question d'avant est coupé. */
  battement: 15,
  /** Ce qu'un téléphone peut envoyer : tant de messages d'un coup, puis tant par seconde. Au-delà, ils sont perdus. */
  debit: { rafale: 40, parSeconde: 20 },
  /** Ce qu'on passe à un téléphone avant de le couper : tant de messages qui ne sont pas des actions, tant de codes inconnus. */
  tolerance: { malFormes: 5, codesInconnus: 10 },
  /** Combien de paquets de diagnostic une connexion peut écrire au journal du serveur, au plus. */
  diagnostic: { auPlus: 600 },
  /** Combien de téléphones une même adresse peut brancher à la fois. */
  parAdresse: 30,
  /** La minuterie du serveur ne dort jamais plus longtemps : de quoi voir passer l'expiration des rooms. */
  minuterieAuPlus: 1,
  /** Quand le serveur s'arrête, ce qu'il laisse à un téléphone pour lui dire au revoir, avant de couper sa ligne. */
  adieu: 1,
  /**
   * Deezer. Son API admet 50 appels par 5 secondes : on en fait moins, et quand il dit qu'on va trop vite, on attend une fenêtre
   * et on réessaie, quelques fois. Une réponse qui tarde est abandonnée ; au-delà de tant d'appels qui attendent leur tour, on
   * n'en prend plus. Les liens des extraits expirent : les pistes d'une playlist se gardent dix minutes au plus, et jamais
   * jusqu'à moins de deux minutes de l'expiration de leurs liens (de quoi jouer une piste) ; une recherche, une heure. On garde
   * tant de playlists et de recherches au plus. Une recherche demande deux fois plus de playlists que le bac n'en montre (quatre) :
   * certaines n'ont rien à jouer.
   */
  deezer: {
    fenetre: 5,
    parFenetre: 40,
    essais: 3,
    attente: 8,
    fileAuPlus: 60,
    fraicheur: 600,
    marge: 120,
    /** Ce qui sera bientôt plus frais (dans moins de tant de secondes) se relit en coulisses, sans faire attendre une piste. */
    avance: 240,
    rechercheGardee: 3600,
    gardeesAuPlus: 400,
    resultats: 4,
  },
  /**
   * Spotify : on lit la page publique d'une playlist, au plus tant de fois par fenêtre. On en cherche les premiers titres chez Deezer,
   * jusqu'à en trouver assez pour deux faces de vingt pistes ; un titre que Deezer n'a pas est oublié une heure, avant qu'on le recherche.
   */
  spotify: { fenetre: 10, parFenetre: 5, attente: 8, titresAuPlus: 60, pistesAuPlus: 40, sansDeezer: 3600 },
  /**
   * Les comptes. Un lien de connexion marche une fois, un quart d'heure ; une session dure six mois, et se prolonge à chaque retour.
   * Un compte dont personne ne se sert s'efface au bout de deux ans.
   * On envoie un lien par adresse et par minute au plus, cinq par heure ; dix par heure depuis un même téléphone (sa même adresse
   * sur le réseau) ; trois cents par jour en tout, ce que permettent les envois gratuits. Le serveur d'envoi a tant pour répondre.
   */
  comptes: {
    lien: 900,
    session: 15552000,
    /**
     * Un compte où personne n'est revenu depuis deux ans est effacé, avec sa pochette, ses scores et ses sessions ; un mois avant,
     * une lettre prévient son adresse. On fait ce ménage au démarrage, puis une fois par jour.
     */
    inactif: { efface: 63072000, prevenu: 2592000, menage: 86400 },
    parAdresse: { attente: 60, parHeure: 5 },
    parTelephone: 10,
    parJour: 300,
    patience: 15,
  },
} as const;
