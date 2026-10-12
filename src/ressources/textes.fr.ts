/**
 * Les textes du site en français, dans la voix du projet :
 * on se tutoie, phrases courtes, un peu taquines, avec le vocabulaire du disque.
 * Aucune phrase affichée par le site n'est écrite ailleurs. Une autre langue, c'est un autre fichier de la même forme.
 */

import type { Textes } from './textes';

export const TEXTES: Textes = {
  langue: 'fr-FR',

  typographie: {
    insecableAvant: ':;?!%»·/',
    insecableApres: '«/',
    unites: ['ms', 's', 'px', 'Mpx', 'fois', 'tours', 'images', 'toiles', '°/s²'],
  },

  accueil: { titre: 'BLIND TEST' },

  tuto: {
    diapos: [
      {
        titre: 'Bienvenue sur Honear',
        texte: 'Le blind test entre potes : un téléphone chacun, une platine, et des extraits de 30 secondes à reconnaître.',
      },
      {
        titre: 'Pose un disque',
        texte:
          'Touche « On pose un disque ? », fais ta pochette, choisis un genre dans le bac, puis ouvre le salon : un code et un QR code s’affichent.',
      },
      {
        titre: 'Tes potes te rejoignent',
        texte: 'Chacun ouvre honear.fr sur son téléphone et touche « J’ai un code », ou scanne le QR code. Puis il fait sa pochette.',
      },
      {
        titre: 'Trouve l’artiste et le titre',
        texte: 'Pendant l’extrait, tape ce que tu reconnais : 1 point l’artiste, 1 le titre, 1 le feat. En mode 4 choix, touche la bonne étiquette.',
      },
      {
        titre: 'Le hit-parade',
        texte:
          'Après chaque piste, le classement ; à la fin, la finale et ses disques. Le son part à 30 % : règle-le en tournant le bouton de l’ampli (sur iPhone, avec les boutons du téléphone). Pour partir, « Quitter », en haut à gauche.',
      },
    ],
    suivant: 'Suivant',
    precedent: 'Retour',
    passer: 'Passer',
    commencer: 'C’est parti !',
    lien: 'Comment on joue ?',
  },

  logo: {
    nom: 'Honear',
    face: 'Face A',
    vitesse: '33 tours',
    mention: 'Enregistré entre potes',
  },

  commandes: {
    pistes: 'Titres',
    extrait: 'Secondes',
    mode: 'Mode',
    son: 'Son',
    modes: { libre: 'Libre', quatreChoix: '4 choix', premierArrive: 'First one', premiereNote: '1re note' },
    crans: ['1', '2', '3', '4', '5', '6', '7'],
    sons: { tous: 'Tous', hote: 'Hôte' },
  },

  piste: {
    numero: 'Piste {numero}',
    sur: 'sur {total}',
    mystere: 'Disque mystère',
    raye: 'Rayé.',
  },

  navigateur: {
    enAttendant: 'On sort le disque de sa pochette.',
    titre: 'Ce navigateur ne sait pas lire ce disque.',
    conseil: 'Ouvre le lien dans un navigateur à jour : Chrome, Safari ou Firefox.',
    detail: 'Pour qui dépanne, il lui manque : {manques}.',
    entreDeuxManques: ', ',
    manques: {
      toile: 'le dessin sur toile (canvas)',
      traces: 'les tracés (Path2D)',
      images: 'les images animées (requestAnimationFrame)',
      svg: 'le SVG',
    },
    sansScript: { titre: 'Sans ses scripts, la platine ne tourne pas.', conseil: 'Autorise JavaScript ici, puis recharge la page.' },
  },

  ampli: {
    volume: 'Volume',
    baisser: 'Baisser le son',
    monter: 'Monter le son',
    allume: 'Allume l’ampli',
    sigle: 'VU',
    canaux: ['Titres', 'Secondes'],
    graduations: { positif: '+{n}', negatif: '–{n}' },
  },

  bac: {
    themes: {
      annees80: 'Années 80',
      annees2000: 'Années 2000',
      rapFrancais: 'Rap français',
      variete: 'Variété française',
      tubesDeLEte: 'Tubes de l’été',
      rock: 'Rock',
      generiques: 'Génériques de dessins animés',
      hitsDuMoment: 'Hits du moment',
    },
  },

  touches: {
    poserUnDisque: 'On pose un disque ?',
    jAiUnCode: 'J’ai un code',
    cEstMoi: 'C’est moi',
    lancer: 'Lancer la face A',
    lancerLaFaceB: 'Lancer la face B',
    suivante: 'Piste suivante',
    rejouer: 'Rejouer la face B',
  },

  pastilles: {
    monte: '+{places}',
    descend: '–{places}',
    entree: 'Entrée',
    presque: 'Presque.',
  },

  pochette: {
    choix: { tete: 'Tête', dessus: 'Sur la tête' },
    tetes: { ronde: 'Ronde', ovale: 'Ovale', large: 'Large', carree: 'Carrée' },
    dessus: { courts: 'Cheveux courts', chignon: 'Chignon', bonnet: 'Bonnet', casquette: 'Casquette', casque: 'Casque audio', rien: 'Rien du tout' },
    motifs: { rayons: 'Rayons', rayures: 'Rayures', damier: 'Damier', cercles: 'Cercles' },
    artistes: [
      'DJ Raclette',
      'MC Tisane',
      'Tonton Reverb',
      'Lady Larsen',
      'Captain Karaoké',
      'DJ Fondue',
      'MC Pétanque',
      'Mamie Vibrato',
      'Baron Bémol',
      'Miss Playback',
      'DJ Pain Perdu',
      'MC Doudoune',
      'Cousin Falsetto',
      'Lady Dédicace',
      'Sœur Sono',
      'Duc de Basse',
      'Papy Scratch',
      'Tata Tambourin',
      'MC Brioche',
      'Professeur Refrain',
    ],
    albums: [
      'Live à la salle des fêtes',
      'Best of des fausses notes',
      'Unplugged dans la cuisine',
      'Le refrain seulement',
      'Volume 2 (il n’y a pas de volume 1)',
      'Reprises que personne n’a demandées',
      'Enregistré chez mamie',
      'Sans autotune (hélas)',
      'Démos du garage',
      'En direct du karaoké',
      'Face B, toujours',
      'Les inédits du répondeur',
      'Acoustique sous la douche',
      'Live au camping',
      'Le slow de trop',
      'Remix de fin de soirée',
      'Unplugged (le voisin a toqué)',
      'L’intégrale des intros',
      'Mes tubes de colo',
      'Chanté faux, joué fort',
      'Session au fond du bus',
      'Le meilleur du pire',
      'Live au mariage de Kévin',
      'Versions longues inutiles',
      'Couplets oubliés',
      'Hymnes de fin de banquet',
      'La compil du covoiturage',
      'Enregistré au téléphone',
      'Le concert du balcon',
      'Bis sans rappel',
      'Instrumental (paroles oubliées)',
      'Live au bowling',
      'Les hits du baby-foot',
      'Duos avec moi-même',
      'Mixé au micro-ondes',
      'Le retour que personne n’attendait',
      'Tournée des parkings',
      'Échauffement vocal',
      'Les classiques de la boum',
      'Le dernier slow',
    ],
    auHasard: 'Au hasard',
    autreAlbum: 'Un autre album',
    tonNom: 'Ton nom d’artiste',
    maPochette: 'Ma pochette',
    laisser: 'Retour',
  },

  partie: {
    quitter: 'Quitter',
    quitterVraiment: 'Quitter la partie ? Tu pourras la rejoindre avec son code.',
    code: 'Le code',
    autourDuMeuble: '{nombre} joueurs',
    saisie: 'Le code de la partie',
    rejoindre: 'On rejoint',
    lien: '{site}/{code}',
    copier: 'Touche pour copier le lien',
    ouvrirLeSalon: 'Ouvrir le salon',
    taReponse: 'L’artiste, le titre, le feat',
    artiste: 'Artiste',
    titre: 'Titre',
    aTrouveLArtiste: 'A',
    aTrouveLeTitre: 'T',
    feat: 'Feat',
    aTrouveLeFeat: 'F',
    avecUnFeat: '{artiste} feat. {feat}',
    bareme: {
      libre: 'Libre : 1 point l’artiste, 1 le titre, 1 le feat.',
      quatreChoix: '4 choix : 1 point, 1 de plus au plus rapide.',
      premierArrive: 'First one : le premier qui trouve l’artiste et le titre gagne 3 points, la piste s’arrête.',
      premiereNote: '1re note : une seconde de son, puis on cherche. 1 point par partie.',
    },
    titresJoues: 'Face A, ce soir',
    titreJoue: '{numero}. {titre} – {artiste}',
    titresDeLaFace: '{titres} titres',
    revoir: 'Touche pour revoir les pochettes',
    retour: 'Retour',
    points: '{points} pts',
    spectateur: 'Piste en cours. Tu joues la suivante.',
  },

  etats: {
    codeInconnu: 'Connais pas ce disque. Vérifie le code.',
    complet: 'Complet. Douze pochettes, pas une de plus.',
    tropCourt: 'Trop court pour une face.',
    connexionPerdue: 'Connexion perdue. On garde ta pochette au chaud.',
    patronSorti: 'Le patron est sorti. C’est toi qui tiens la platine.',
    personne: 'Personne. Même pas honte ?',
    introuvable: 'Ce disque est introuvable. Vérifie le lien.',
  },

  playlists: {
    pretes: 'Prêtes à jouer',
    chercher: 'Chercher',
    laMienne: 'Mes playlists',
    recherche: 'années 90',
    coller: 'Un lien de playlist Deezer ou Spotify',
    jouables: '{jouables} titres jouables sur {total}',
    spotify: 'Cette playlist Spotify ne se laisse pas lire : elle est sans doute privée. Rends-la publique, puis recolle son lien.',
    choisir: 'Celle-là',
    toucheUnGenre: 'Touche un genre dans le bac.',
    auHasard: 'Au hasard',
    titres: '{pistes} titres',
    fouille: 'On fouille le bac…',
    rien: 'Rien dans le bac pour ça. Essaie autrement.',
    source: 'Extraits de 30 secondes, par Deezer',
  },

  compte: {
    touche: 'Mon compte',
    pourquoi: 'Un compte garde ta pochette et tes scores d’un téléphone à l’autre, sous ton adresse e-mail. Rien d’autre, ni mot de passe.',
    adresse: 'Ton adresse e-mail',
    envoyer: 'Envoie-moi le lien',
    envoye: 'Regarde tes e-mails.',
    envoyeA: 'Le lien est parti à :',
    valable: 'Il marche une fois, pendant un quart d’heure.',
    indesirables: 'Pas reçu ? Regarde dans tes indésirables.',
    autreAdresse: 'Une autre adresse',
    lienLa: 'Ton lien est là.',
    entrer: 'Entrer',
    parties: ['{n} partie jouée', '{n} parties jouées'],
    victoires: ['{n} gagnée', '{n} gagnées'],
    sortir: 'Me déconnecter',
    effacer: 'Effacer mon compte',
    effacerQuestion: 'Tout effacer ? Ta pochette et tes scores partent avec.',
    effacerVraiment: 'Oui, tout effacer',
    garder: 'Non, garder',
    retour: 'Retour',
    refus: {
      adresse: 'Ce n’est pas une adresse e-mail.',
      tropDeLiens: 'Un lien est déjà parti. Regarde tes e-mails, ou réessaie dans une minute.',
      lienPerime: 'Ce lien ne marche plus. Demande-en un autre.',
      comptesFermes: 'Les comptes ne marchent pas en ce moment : aucun e-mail ne part.',
    },
    courrier: {
      sujet: 'Ton lien pour entrer dans Honear',
      bonjour: 'Salut,',
      corps: 'Touche ce lien sur le téléphone où tu joues : tu entres dans ton compte Honear.',
      bouton: 'Entrer dans mon compte',
      duree: 'Il marche une fois, pendant un quart d’heure.',
      rien: 'Tu n’as rien demandé ? Ne fais rien : sans ce lien, personne n’entre.',
      signature: 'Honear',
      essaiSujet: 'Honear : l’e-mail d’essai',
      essai: 'Si tu lis ceci, le courrier de ton site marche : les liens de connexion des comptes partiront bien.',
      dortSujet: 'Ton compte Honear va être effacé',
      dort: 'Personne n’est entré dans ton compte Honear depuis presque deux ans. Dans un mois, il sera effacé, avec ta pochette et tes scores : on ne garde pas ce qui ne sert plus.',
      dortGarder:
        'Pour le garder, il suffit d’y revenir : ouvre le site sur ton téléphone, ou demande un lien de connexion. Pour le laisser partir, ne fais rien.',
    },
  },

  legal: {
    liens: { confidentialite: 'Confidentialité', mentions: 'Mentions légales' },
    retour: 'Revenir au jeu',
    sansContact: 'l’adresse que l’éditeur a donnée à l’hébergeur',
    confidentialite: {
      titre: 'Confidentialité',
      date: 'Mise à jour le 12 octobre 2026',
      parties: [
        {
          titre: 'En deux mots',
          paragraphes: [
            'Honear ({site}) est un blind test entre potes, gratuit, sans publicité, sans cookie et sans mesure d’audience. On ne garde que ce qu’il faut pour jouer, et rien n’est vendu ni prêté à personne.',
            'Le responsable de ces données est l’éditeur du site, un particulier (voir les mentions légales). Pour toute question, ou pour exercer tes droits : {contact}.',
          ],
        },
        {
          titre: 'Si tu joues sans compte',
          paragraphes: [
            'Ton nom d’artiste et ta pochette restent sur ton téléphone, dans son stockage local. Pendant une partie, le serveur les connaît, avec tes réponses et tes points, le temps que la room existe : ils ne vivent qu’en mémoire et disparaissent quand elle se ferme. Rien n’en est écrit sur disque.',
          ],
        },
        {
          titre: 'Si tu ouvres un compte (c’est facultatif)',
          paragraphes: [
            'Un compte garde ton adresse e-mail, ta pochette, le nombre de parties que tu as jouées et gagnées, sa date de création et celle de ta dernière visite. C’est tout.',
            'Il n’y a pas de mot de passe : tu entres par un lien envoyé à ton adresse. Le serveur ne garde de ce lien, et du secret de ta session, qu’une empreinte qu’on ne peut pas retourner : qui lirait le fichier des comptes n’entrerait dans aucun.',
            'Base légale : le service que tu demandes en ouvrant ton compte (article 6, 1, b, du RGPD).',
          ],
        },
        {
          titre: 'L’adresse de ton téléphone sur le réseau',
          paragraphes: [
            'Le serveur lit l’adresse IP de ton téléphone pour limiter les abus : pas plus de trente téléphones à la fois depuis une même adresse, pas plus de dix liens de connexion par heure. Il ne l’écrit nulle part : il la garde en mémoire tant que ton téléphone est branché, et une heure au plus quand il a demandé un lien.',
            'Base légale : l’intérêt légitime à protéger le jeu (article 6, 1, f, du RGPD).',
          ],
        },
        {
          titre: 'Les e-mails',
          paragraphes: [
            'Le site n’envoie que deux sortes d’e-mails, et seulement à qui a un compte : le lien de connexion que tu demandes, et un avertissement si ton compte dort depuis presque deux ans. Jamais de lettre d’information ni de publicité. Ils partent par le service de messagerie de notre hébergeur, OVHcloud.',
          ],
        },
        {
          titre: 'La musique : Deezer',
          paragraphes: [
            'Les extraits de 30 secondes et les pochettes, ton téléphone les lit directement chez Deezer (sur dzcdn.net). Deezer reçoit donc l’adresse IP de ton téléphone, comme pour n’importe quelle page web, et la traite selon sa propre politique de confidentialité. Le site ne lui transmet rien d’autre te concernant.',
            'Une playlist Spotify que tu colles est lue par le serveur, sur sa page publique : Spotify n’apprend rien de toi.',
          ],
        },
        {
          titre: 'Ce que le site garde sur ton téléphone',
          paragraphes: [
            'Ni cookie, ni traceur, ni outil tiers. Le site garde dans le stockage local de ton navigateur seulement ce qu’il faut pour marcher : ta pochette, la room où tu joues (pour y revenir si la page se recharge), le secret de ta session si tu as un compte, le fait que tu as vu le petit tutoriel, et les playlists que tu as importées (« Mes playlists »).',
            'Ces informations, strictement nécessaires au jeu que tu demandes, ne demandent pas ton consentement (article 82 de la loi Informatique et Libertés). Tu peux les effacer quand tu veux, en effaçant les données du site dans ton navigateur.',
          ],
        },
        {
          titre: 'Combien de temps',
          paragraphes: [
            'Une room et ce qui s’y joue : tant qu’elle existe, en mémoire.',
            'Un lien de connexion : un quart d’heure, et il ne sert qu’une fois.',
            'Une session : six mois, prolongée à chaque visite ; oubliée dès que tu te déconnectes.',
            'Un compte : tant que tu t’en sers. Après deux ans sans visite, il est effacé tout seul, avec ta pochette et tes scores ; un e-mail te prévient un mois avant. Tu peux aussi l’effacer toi-même, tout de suite : « Mon compte », puis « Effacer mon compte ».',
            'L’adresse IP de ton téléphone : en mémoire seulement, le temps de ta connexion (une heure au plus pour un lien demandé). Les journaux techniques du serveur (ses erreurs, ses redémarrages) ne gardent rien plus de six mois.',
          ],
        },
        {
          titre: 'Où',
          paragraphes: ['Le serveur est loué à OVHcloud, en France (Strasbourg). Le site ne transfère aucune donnée hors de l’Union européenne.'],
        },
        {
          titre: 'Tes droits',
          paragraphes: [
            'Tu peux accéder à tes données, les faire corriger ou effacer, en limiter l’usage, t’y opposer, et les récupérer dans un format lisible : écris à {contact}, on te répond sous un mois. Pour effacer ton compte, pas besoin d’écrire : « Mon compte », puis « Effacer mon compte ».',
            'Si tu estimes que tes droits ne sont pas respectés, tu peux t’adresser à la CNIL (cnil.fr).',
          ],
        },
        {
          titre: 'Moins de 15 ans',
          paragraphes: ['On peut jouer à tout âge, sans compte. Si tu as moins de 15 ans, demande à un de tes parents avant d’ouvrir un compte.'],
        },
      ],
    },
    mentions: {
      titre: 'Mentions légales',
      date: 'Mise à jour le 12 octobre 2026',
      parties: [
        {
          titre: 'L’éditeur',
          paragraphes: [
            'Honear ({site}) est édité à titre non professionnel par un particulier, qui a choisi de ne pas publier son identité, comme la loi le permet (article 1-1, II, de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique) : il l’a communiquée à l’hébergeur. Pour le joindre : {contact}.',
          ],
        },
        {
          titre: 'L’hébergeur',
          paragraphes: ['OVH SAS, 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 1007. Site : ovhcloud.com.'],
        },
        {
          titre: 'La musique',
          paragraphes: [
            'Les extraits de 30 secondes, les pochettes et les titres viennent de l’API de Deezer et appartiennent à leurs ayants droit. Ici, on ne les écoute qu’en extraits, pour un usage privé et non commercial, entre proches, comme le demandent les conditions de Deezer. Deezer n’a ni approuvé ni parrainé ce site.',
          ],
        },
        {
          titre: 'Le reste',
          paragraphes: [
            'Le jeu, ses dessins, son logo et ses textes sont l’œuvre de son auteur. Ses polices, Caprasimo et Barlow Condensed, sont sous licence SIL Open Font License.',
            'Le site est gratuit, sans publicité, et ne vend rien.',
          ],
        },
      ],
    },
  },

  exemples: {
    artiste: 'Tonton Reverb',
    album: 'Live à la salle des fêtes',
    titre: 'Les Démons de minuit',
    interprete: 'Images',
    leurres: [
      { titre: 'Voyage, voyage', interprete: 'Desireless' },
      { titre: 'Femme libérée', interprete: 'Cookie Dingler' },
      { titre: 'Ouragan', interprete: 'Stéphanie' },
    ],
    avecUnFeat: { titre: 'Tout oublier', interprete: 'Angèle', feat: 'Roméo Elvis', saisie: 'angèle feat. roméo elvis' },
  },
};
