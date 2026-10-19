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
  /** Ce que le journal du serveur écrit d'une erreur, en signes au plus : sa classe et son motif, pas davantage. */
  journal: { motifAuPlus: 240 },
  /**
   * Les statistiques, pour l'éditeur seul. On range ce qui se passe à l'heure de ce fuseau ; on garde les compteurs jour par jour
   * tant de jours (treize mois, comme la CNIL le veut d'une mesure d'audience), et on en montre tant à la page ; on les écrit sur
   * le disque au plus toutes les tant de secondes. Les classements (titres joués, playlists prises, recherches) gardent tant
   * d'entrées au plus, et la page en montre tant ; un titre « dur » a été joué au moins tant de fois. Ce qu'on cherche se garde
   * coupé à tant de signes. Un navigateur qui se dit robot n'est pas un visiteur.
   */
  statistiques: {
    fuseau: 'Europe/Paris',
    jours: 396,
    montres: 120,
    ecriture: 60,
    gardes: { titres: 3000, playlists: 600, recherches: 600 },
    classes: { titres: 40, durs: 15, playlists: 30, recherches: 40 },
    durAuMoins: 3,
    rechercheAuPlus: 40,
    robots: /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|httpclient|monitor|uptime|headless|lighthouse/i,
  },
  /** Combien de téléphones une même adresse peut brancher à la fois. */
  parAdresse: 30,
  /** La minuterie du serveur ne dort jamais plus longtemps : de quoi voir passer l'expiration des rooms. */
  minuterieAuPlus: 1,
  /** Quand le serveur s'arrête, ce qu'il laisse à un téléphone pour lui dire au revoir, avant de couper sa ligne. */
  adieu: 1,
  /**
   * Deezer. Son API admet 50 appels par 5 secondes et par adresse : le jeu en fait 30, et le MCP de Honear (mcp.honear.fr), qui
   * sort par la même machine, 10 ; quand Deezer dit qu'on va trop vite, on attend une fenêtre et on réessaie, quelques fois. Une réponse qui tarde est abandonnée ; au-delà de tant d'appels qui attendent leur tour, on
   * n'en prend plus. Les liens des extraits expirent : les pistes d'une playlist se gardent dix minutes au plus, et jamais
   * jusqu'à moins de deux minutes de l'expiration de leurs liens (de quoi jouer une piste) ; une recherche, une heure. On garde
   * tant de playlists et de recherches au plus. Une recherche demande deux fois plus de playlists que le bac n'en montre (quatre) :
   * certaines n'ont rien à jouer.
   */
  deezer: {
    fenetre: 5,
    parFenetre: 30,
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
    /**
     * Les invités d'une piste (sa fiche, `/track/{id}`) : on les lit pour les tant de prochaines pistes d'une room, on les garde un
     * jour (ils ne changent pas), une fiche qui ne s'est pas lue est redemandée au bout de tant de secondes ; tant au plus.
     */
    aVenir: 3,
    invitesGardes: 86400,
    invitesRates: 120,
    invitesAuPlus: 4000,
  },
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
    /** Toutes les tant de secondes, on oublie les liens périmés, et les adresses (e-mail, IP) dont les essais ne comptent plus. */
    oubli: 60,
    /**
     * Les mots de passe. Cinq essais par compte et par quart d'heure, vingt par heure depuis un même téléphone : au-delà, on attend
     * (c'est la limite des essais que la CNIL demande). Un compte en change cinq fois par heure au plus. On n'en garde qu'une
     * empreinte scrypt, aux réglages que l'OWASP conseille (2^15, 8, 3 : 32 Mio de mémoire), un sel de 16 octets, 64 octets
     * d'empreinte ; on n'en vérifie pas une qui demanderait plus de 64 Mio, ou plus de 16 passes.
     */
    motDePasse: {
      essais: 5,
      fenetre: 900,
      parTelephone: 20,
      changements: 5,
      scrypt: { cout: 32768, blocs: 8, parallele: 3, sel: 16, longueur: 64, memoire: 67108864, paralleleAuPlus: 16 },
    },
  },
} as const;
