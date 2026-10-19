/**
 * Les mots de la planche « Tous les écrans du téléphone » (étape 5), à part des textes du site : c'est un document de travail.
 * Et les réglages de ses images : la partie d'exemple, ses joueurs, les instants qu'on arrête.
 */

export const LEGENDES_DES_ECRANS = {
  nom: 'Les écrans du téléphone',
  titre: 'Tous les écrans du téléphone',
  sousTitre: 'Étape 5 de Honear : une partie de l’accueil à la finale, le chemin de l’invité, chaque état avec sa phrase',

  /**
   * La partie d'exemple : le nombre de pistes réglé, la graine du code, les cinq potes (leur clé, la graine de leur pochette, le rang
   * de leur nom d'artiste dans les textes), celle du retardataire ; les titres déjà joués ; ce que la recherche trouve ; les playlists
   * importées ; le lien Spotify qu'on colle par erreur ; un code tapé qui n'ouvre rien.
   */
  partie: {
    pistes: 15,
    graine: 1987,
    potes: [
      { id: 'lady', graine: 404, artiste: 3 },
      { id: 'mc', graine: 7, artiste: 1 },
      { id: 'dj', graine: 2024, artiste: 0 },
      { id: 'mamie', graine: 31, artiste: 7 },
      { id: 'baron', graine: 58, artiste: 8 },
    ],
    retardataire: 77,
    dejaJoues: [
      { titre: 'Voyage, voyage', artiste: 'Desireless' },
      { titre: 'Ouragan', artiste: 'Stéphanie' },
    ],
    resultats: [
      { fond: 'orangeBrule', motif: 'rayons' },
      { fond: 'bleuPetrole', motif: 'damier' },
      { fond: 'vieuxRose', motif: 'cercles' },
      { fond: 'olive', motif: 'rayures' },
    ],
    importee: { jouables: 47, total: 52 },
    tropCourte: { jouables: 9, total: 12 },
    lienSpotify: 'spotify.link/kQ2xZbT9vXb',
    /** Ce que toi a tapé quand « Presque. » se colle. */
    presque: 'les demons du minou',
    /** L'anecdote qu'une liste sur mesure donne à la piste, presque aussi longue que le MCP la permet. */
    anecdote:
      'Le tube d’Images, sorti en 1986 : un synthé, un refrain d’une nuit blanche, et une chanson qu’on danse encore à chaque mariage, quarante ans plus tard.',
    codeFaux: 'MXPW',
  },
  /** Les instants arrêtés, sur l'horloge de la séance de l'atelier (en secondes) : le disque qui vole, juste après la rayure, la réponse. */
  instants: { decompte: 1.12, rayure: 7.2, reponse: 17.9 },
  /** Les instants de la danse des aiguilles, en secondes après le départ de l'extrait, et leurs noms. */
  danse: [
    { apres: -0.5, nom: 'Au repos, la gauche respire' },
    { apres: 0.1, nom: 'Le sursaut, au zéro' },
    { apres: 3.36, nom: 'Le pic d’une rayure' },
    { apres: 4.1, nom: 'La danse' },
    { apres: 7.5, nom: 'Dans le rouge, la fin approche' },
  ],

  ecrans: {
    accueil: '1. L’accueil',
    pochette: '2. Fais ta pochette',
    bac: { pretes: '3. La playlist, prête à jouer', chercher: '3 bis. Chercher', laMienne: '3 ter. La mienne' },
    reglages: '4. Les réglages : le mode sur Libre',
    reglagesQuatreChoix: '4 bis. Ou sur 4 choix',
    salon: '5. Le salon, chez l’hôte',
    ampli: '6. Allume l’ampli',
    invitePochette: '1. « C’est moi »',
    salonInvite: '2. « Allume l’ampli »',
    saisie: 'J’ai un code',
    decompte: 'Le décompte',
    presque: 'Presque',
    raye: 'Rayé',
    trouve: 'Le titre, trouvé',
    feat: 'Tout trouvé, feat compris',
    clavier: 'Clavier ouvert, à six',
    reponse: 'La révélation',
    anecdote: 'La révélation, et l’anecdote d’une liste sur mesure',
    choixExtrait: '4 choix : toucher une étiquette',
    choixReponse: '4 choix : la bonne reste',
    choixAnecdote: '4 choix : l’anecdote prend la place de la bonne',
    hitParade: 'Le hit-parade',
    finale: 'La finale',
  },
  etats: {
    codeInconnu: 'Code inconnu',
    complet: 'Room pleine',
    tropDeRooms: 'Une room de plus que le serveur n’ouvre pas',
    tropCourt: 'Playlist trop courte',
    spotify: 'Un lien Spotify',
    sonBloque: 'Son bloqué : l’ampli reste éteint',
    connexionPerdue: 'Connexion perdue',
    patronSorti: 'L’hôte est parti',
    spectateur: 'Arrivé en cours de partie',
    personne: 'Personne n’a trouvé',
    personneEtAnecdote: 'Personne n’a trouvé, et l’anecdote dessous',
    egalite: 'Égalité en tête : un diamant chacun',
  },

  sections: {
    hote: {
      titre: 'Le chemin de l’hôte',
      texte:
        'On ne change jamais de page : le regard reste sur la platine, et glisse vers le bac ou l’ampli quand il le faut. Ce qu’il y a à faire se pose sur le bois, dessous ; une seule action par écran, dans la zone du pouce. Le code de la room est écrit en énorme sur l’étiquette du disque du salon, le QR code est imprimé sur la pochette kraft. Le sélecteur de mode choisit le jeu : Libre (un point pour l’artiste, un pour le titre, un pour le feat s’il y en a un) ou 4 choix.',
    },
    invite: {
      titre: 'Le chemin de l’invité',
      texte:
        'Il ouvre le lien : le code est déjà dans l’adresse. Une pochette l’attend, tirée au hasard, son nom d’artiste avec : « C’est moi ». Puis le salon : « Allume l’ampli ». Deux gestes, pas un de plus.',
    },
    libre: {
      titre: 'Une piste, en saisie libre',
      texte:
        'L’étiquette vierge sous le pouce ; les pastilles « Artiste », « Titre » et « Feat » s’y collent quand on trouve ; le feat n’est pas annoncé, c’est un point pour qui le connaît. Les pochettes en éventail sont rangées dans l’ordre du classement : c’est le mini hit-parade, et une pastille A, T ou F y claque quand quelqu’un trouve, sans dire la réponse. Clavier ouvert, la platine garde le haut, l’étiquette se colle au-dessus du clavier, et l’éventail tient entre les deux, même à douze.',
    },
    quatreChoix: {
      titre: 'La même, en 4 choix',
      texte:
        'Quatre étiquettes à toucher ; celle qu’on touche s’enfonce comme une touche. À la révélation, les trois mauvaises s’en vont, la bonne reste.',
    },
    fin: {
      titre: 'Le hit-parade, et la finale',
      texte:
        'Entre deux pistes, les pochettes se rangent du premier au dernier, et une pastille claque sur chacune qui a bougé. À la fin, les disques : diamant, platine, or, et la liste des titres joués, imprimée comme au dos d’une pochette. À égalité en tête, un diamant chacun.',
    },
    etats: {
      titre: 'Chaque état, sa phrase',
      texte:
        'Une page rechargée revient au même endroit, sans rejouer les arrivées : l’écran est le reflet de l’état. Un extrait lent à charger, c’est l’atelier de l’étape 2 : le plateau tourne, le bras attend levé.',
    },
    danse: {
      titre: 'La danse des aiguilles',
      texte:
        'Nerveuses : elles montent en 80 ms, retombent en 300 ms. Au repos, la gauche respire ; au zéro, elles sursautent ensemble ; elles dansent, proches mais jamais pareilles ; une rayure les fait piquer ; dans les 5 dernières secondes, elles sont dans le rouge.',
    },
    animations: {
      titre: 'Les animations, en pellicules',
      texte:
        'Chaque geste arrêté à quelques instants, sur la part du cadre où il a lieu ; le temps est compté depuis son départ. De la physique : des glissades que le frottement arrête net, des ressorts, des chutes qui claquent. Trois niveaux à chaque fois : l’action, la réaction d’un voisin, l’ombre. Le décompte, l’extrait, la rayure et la révélation du disque sont ceux de l’atelier de l’étape 2. En version sobre, chaque objet est d’un coup à sa place d’arrivée.',
    },
  },

  /** Les pellicules : pour chaque geste, son nom, ce qu'il fait, et ses instants (en secondes depuis son départ) avec leurs noms. */
  animations: {
    arrivee: {
      titre: 'Une pochette arrive',
      texte: 'Lancée du bord, elle glisse en tournant, de moins en moins vite, et s’arrête net, de travers. Celle qu’elle touche se pousse de 2 px.',
      images: [
        { apres: 0, nom: '0 ms : lancée du bord' },
        { apres: 0.15, nom: '150 ms' },
        { apres: 0.3, nom: '300 ms' },
        { apres: 0.45, nom: '450 ms : elle ralentit' },
        { apres: 0.6, nom: '600 ms : elle touche' },
        { apres: 0.8, nom: 'Arrêtée de travers, la voisine poussée' },
      ],
    },
    bonneReponse: {
      titre: 'Une bonne réponse',
      texte:
        'La pastille arrive plus grande, d’un peu plus haut, et claque en 90 ms. La pochette s’enfonce d’un px et revient ; le joueur passe en « content » sur l’image de l’impact, le téléphone vibre. La seconde se pose à cheval sur la première.',
      images: [
        { apres: 0, nom: '0 ms : elle arrive' },
        { apres: 0.045, nom: '45 ms' },
        { apres: 0.09, nom: '90 ms : elle claque, content' },
        { apres: 0.118, nom: '120 ms : la pochette s’enfonce' },
        { apres: 0.3, nom: '300 ms : revenue' },
        { apres: 0.82, nom: 'Le titre, à cheval' },
      ],
    },
    presque: {
      titre: '« Presque. »',
      texte: 'Elle claque sur l’étiquette vierge, y reste 1,2 s, se décolle, et glisse hors du cadre. Aucun flash rouge.',
      images: [
        { apres: 0.045, nom: '45 ms : elle arrive' },
        { apres: 0.09, nom: '90 ms : collée' },
        { apres: 1.1, nom: '1,1 s : elle reste' },
        { apres: 1.38, nom: '1,38 s : décollée' },
        { apres: 1.55, nom: '1,55 s : elle glisse' },
        { apres: 2, nom: 'Partie' },
      ],
    },
    choix: {
      titre: 'Les quatre étiquettes',
      texte:
        'Elles arrivent en glissant, à 40 ms d’écart, de travers. Celle qu’on touche s’enfonce de 2 px en 60 ms, comme une touche. À la révélation, les trois mauvaises repartent, à 40 ms d’écart ; la bonne reste.',
      images: [
        { apres: 0.13, nom: '130 ms' },
        { apres: 0.22, nom: '220 ms' },
        { apres: 0.34, nom: '340 ms' },
        { apres: 0.6, nom: 'Arrivées' },
        { apres: 1.07, nom: 'Touchée : enfoncée' },
        { apres: 2.06, nom: 'Révélation, 60 ms' },
        { apres: 2.2, nom: '200 ms' },
        { apres: 2.8, nom: 'La bonne reste' },
      ],
    },
    vraie: {
      titre: 'La vraie pochette',
      texte: 'À la révélation, une fois le disque arrêté, elle glisse de sous la kraft en tournant, et s’arrête de travers.',
      images: [
        { apres: 0, nom: '0 ms : sous la kraft' },
        { apres: 0.13, nom: '130 ms' },
        { apres: 0.25, nom: '250 ms' },
        { apres: 0.4, nom: '400 ms' },
        { apres: 0.7, nom: 'Arrêtée de travers' },
      ],
    },
    deconnexion: {
      titre: 'Connexion perdue',
      texte:
        'La pochette se soulève en tournant sur elle-même, son ombre s’écarte, et retombe côté dos. Au retour du joueur, elle se remet côté face.',
      images: [
        { apres: 0, nom: '0 ms' },
        { apres: 0.08, nom: '80 ms : elle se soulève' },
        { apres: 0.14, nom: '140 ms : de profil' },
        { apres: 0.22, nom: '220 ms : le dos' },
        { apres: 0.5, nom: 'Retombée, côté dos' },
      ],
    },
    hitParade: {
      titre: 'Le hit-parade',
      texte:
        'Elles se rangent du dernier au premier, à 70 ms d’écart. Celle qui double se soulève, son ombre s’écarte, passe par-dessus et se pose ; la doublée se pousse un temps après. Une pastille claque sur chacune qui a bougé. Tout tient en moins de 2 s, même à douze.',
      images: [
        { apres: 0, nom: '0 ms : le classement d’avant' },
        { apres: 0.22, nom: '220 ms : elle se soulève' },
        { apres: 0.36, nom: '360 ms : elle passe, la doublée se pousse' },
        { apres: 0.52, nom: '520 ms : elle se pose' },
        { apres: 0.68, nom: '680 ms : les pastilles tombent' },
        { apres: 1.2, nom: 'Rangées, en 0,8 s' },
      ],
    },
    finale: {
      titre: 'La finale',
      texte:
        'L’or, le platine, puis le diamant, posés un par un, chacun descendant avec son ombre qui se resserre. Le diamant fait un dernier tour lent : un éclat fait deux fois le tour de ses facettes, puis il s’arrête, trois facettes allumées. C’est le seul moment où quelque chose brille.',
      images: [
        { apres: 0.14, nom: 'L’or descend' },
        { apres: 0.62, nom: 'Posé ; le platine descend' },
        { apres: 1.2, nom: 'Le diamant descend' },
        { apres: 1.6, nom: 'Posé' },
        { apres: 2.1, nom: 'L’éclat fait le tour' },
        { apres: 2.9, nom: 'Le second tour' },
        { apres: 4.2, nom: 'Trois facettes allumées' },
      ],
    },
    ampli: {
      titre: 'Allume l’ampli',
      texte:
        'L’interrupteur bascule en deux temps, la course puis le clic. Au clic, le voyant passe du ton sombre au miel, sans halo, et le téléphone vibre ; puis les aiguilles partent en butée, et retombent.',
      images: [
        { apres: 0, nom: '0 ms : éteint' },
        { apres: 0.08, nom: '80 ms : la course' },
        { apres: 0.15, nom: '150 ms : le clic, le voyant' },
        { apres: 0.25, nom: '250 ms : en butée' },
        { apres: 0.45, nom: '450 ms : elles retombent' },
        { apres: 0.9, nom: 'Allumé' },
      ],
    },
    volume: {
      titre: 'Le gros bouton du volume',
      texte: 'Il suit le doigt, de cran en cran, un tous les 15 degrés ; à chaque cran, une vibration brève.',
      images: [
        { apres: 0, nom: 'Le doigt se pose' },
        { apres: 0.2, nom: 'Un cran' },
        { apres: 0.4, nom: 'Deux crans' },
        { apres: 0.6, nom: 'Trois crans' },
        { apres: 0.9, nom: 'Lâché' },
      ],
    },
    commandes: {
      titre: 'Les commandes de la platine',
      texte:
        'Le sélecteur de mode tourne de cran en cran, dépasse de 2 degrés et revient. L’interrupteur du son bascule en deux temps : la course, puis le clic.',
      images: [
        { apres: 0, nom: 'Sur Libre' },
        { apres: 0.09, nom: '90 ms : il dépasse' },
        { apres: 0.35, nom: 'Revenu sur 4 choix' },
        { apres: 0.58, nom: 'Le son : la course' },
        { apres: 0.75, nom: 'Le clic' },
      ],
    },
    regard: {
      titre: 'Le regard glisse',
      texte:
        'De la platine à l’ampli, en 350 à 550 ms selon la distance, d’un bloc, avec un léger freinage à l’arrivée ; jamais de fondu. La nappe de lumière reste attachée au bois. À l’arrivée, une aiguille tressaille.',
      images: [
        { apres: 0, nom: '0 ms : sur la platine' },
        { apres: 0.13, nom: '130 ms' },
        { apres: 0.25, nom: '250 ms' },
        { apres: 0.4, nom: '400 ms : il freine' },
        { apres: 0.6, nom: 'Arrivé : l’aiguille tressaille' },
      ],
    },
    bac: {
      titre: 'La playlist sort du bac',
      texte:
        'Le bac arrêté sur son intercalaire, la playlist choisie se soulève de 6 px, puis sort du bac par le haut. Les intercalaires qui basculent quand on feuillette attendent l’étape suivante.',
      images: [
        { apres: 0, nom: '0 ms : dans le bac' },
        { apres: 0.1, nom: '100 ms : elle se soulève' },
        { apres: 0.3, nom: '300 ms : 6 px' },
        { apres: 0.5, nom: '500 ms : elle sort' },
        { apres: 0.9, nom: 'Sortie' },
      ],
    },
  },
} as const;
