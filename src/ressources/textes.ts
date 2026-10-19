/**
 * La forme des textes du site : la même pour toutes les langues.
 * Une langue est un fichier `textes.<langue>.ts` qui remplit cette forme ; la scène ne connaît que la forme.
 *
 * Seuls les textes déjà dessinés y sont. Les suivants arrivent avec leurs écrans.
 */

export interface Textes {
  /** Code de la langue (BCP 47) : c'est elle qui sait mettre un texte en capitales. */
  readonly langue: string;

  /**
   * Les espaces que cette langue ne coupe pas en fin de ligne : avant ces signes, après ceux-là, et entre un nombre et son unité.
   * Une barre oblique entourée d'espaces sépare des nombres qui vont ensemble (« 845 / 26 / 0,2 ») : on ne la coupe d'aucun côté.
   * Une langue qui n'en a pas laisse tout vide.
   */
  readonly typographie: {
    readonly insecableAvant: string;
    readonly insecableApres: string;
    readonly unites: readonly string[];
  };

  /** L'accueil : ce qu'est le jeu, écrit en grand sous la platine. */
  readonly accueil: { readonly titre: string };

  /**
   * Le petit tutoriel, en diapositives, à la première visite : chacune un titre et un texte ; les touches pour avancer, revenir,
   * passer et finir ; le lien qui le rouvre, en bas de l'accueil.
   */
  readonly tuto: {
    readonly diapos: readonly { readonly titre: string; readonly texte: string }[];
    readonly suivant: string;
    readonly precedent: string;
    readonly passer: string;
    readonly commencer: string;
    readonly lien: string;
  };

  readonly logo: {
    readonly nom: string;
    /** Les petites mentions d'une étiquette de disque. */
    readonly face: string;
    readonly vitesse: string;
    readonly mention: string;
  };

  /** Inscriptions gravées sur le socle de la platine. */
  readonly commandes: {
    readonly pistes: string;
    readonly extrait: string;
    readonly mode: string;
    readonly son: string;
    /** Le nom gravé de chaque mode de jeu, par sa clé. Un mode de plus y ajoute le sien dans chaque langue, sans toucher à cette forme. */
    readonly modes: Readonly<Record<string, string>>;
    /** Les numéros gravés autour du sélecteur des modes, un par cran. */
    readonly crans: readonly string[];
    readonly sons: { readonly tous: string; readonly hote: string };
  };

  /** Ce qui s'écrit autour d'une piste. Ce qui est entre accolades est remplacé par sa valeur. */
  readonly piste: {
    /** Sur l'étiquette du disque mystère et sur la pastille de sa pochette kraft : le numéro, et le total dessous. */
    readonly numero: string;
    readonly sur: string;
    /** Tamponné sur la pochette kraft. */
    readonly mystere: string;
    /** Ce que le jeu dit d'une mauvaise réponse. */
    readonly raye: string;
  };

  /**
   * Ce que le site dit, à la place du meuble, pendant qu'il le dessine. Puis ce qu'il dit à un navigateur qui ne sait pas
   * le montrer : une phrase, un conseil, et ce qui lui manque, pour qui dépanne, avec ce qui sépare deux manques dans la phrase.
   * Et ce qu'il dit à un navigateur dont on a coupé les scripts ; et à un téléphone couché, où le jeu ne tient pas.
   */
  readonly navigateur: {
    readonly couche: string;
    readonly enAttendant: string;
    readonly titre: string;
    readonly conseil: string;
    readonly detail: string;
    readonly entreDeuxManques: string;
    readonly manques: { readonly toile: string; readonly traces: string; readonly images: string; readonly svg: string };
    readonly sansScript: { readonly titre: string; readonly conseil: string };
  };

  /** Ce qui est gravé sur l'ampli : le titre de son gros bouton, celui de son interrupteur, le sigle des vumètres et leurs canaux. */
  readonly ampli: {
    readonly volume: string;
    /** Ce que disent, à qui ne les voit pas, les deux moitiés du bouton du volume. */
    readonly baisser: string;
    readonly monter: string;
    readonly allume: string;
    readonly sigle: string;
    readonly canaux: readonly [string, string];
    /** Les nombres de l'échelle des vumètres, hors le zéro : {n} est leur valeur sans signe. */
    readonly graduations: { readonly positif: string; readonly negatif: string };
  };

  /** Le bac à disques : le titre de chaque intercalaire, par la clé de son thème. Un thème de plus y ajoute le sien. */
  readonly bac: { readonly themes: Readonly<Record<string, string>> };

  /** Ce qu'on lit sur les touches : une action, dans la voix du disque. */
  readonly touches: {
    readonly poserUnDisque: string;
    readonly jAiUnCode: string;
    readonly cEstMoi: string;
    readonly lancer: string;
    /** Au salon, après « Rejouer la face B ». */
    readonly lancerLaFaceB: string;
    /** Au hit-parade, chez l'hôte : la piste d'après. */
    readonly suivante: string;
    readonly rejouer: string;
  };

  /** Ce qu'une pastille de disquaire dit d'une place au hit-parade, et d'une réponse presque juste. */
  readonly pastilles: {
    readonly monte: string;
    readonly descend: string;
    readonly entree: string;
    readonly presque: string;
  };

  /**
   * L'écran « Fais ta pochette » : le nom de chaque choix de l'avatar, de chaque forme de tête et de ce qu'on porte dessus
   * (par leur clé), de chaque motif ; les noms d'artiste qu'on propose d'office, les titres d'album qu'on tire au sort ; ses touches.
   */
  readonly pochette: {
    readonly choix: Readonly<Record<'tete' | 'dessus', string>>;
    readonly tetes: Readonly<Record<string, string>>;
    readonly dessus: Readonly<Record<string, string>>;
    readonly motifs: Readonly<Record<string, string>>;
    readonly artistes: readonly string[];
    readonly albums: readonly string[];
    readonly auHasard: string;
    readonly autreAlbum: string;
    /** Ce que dit l'étiquette du nom tant qu'on n'y a rien tapé. */
    readonly tonNom: string;
    /** Ce que dit le papier qui réclame le nom, quand on a touché « C'est moi » sans l'avoir écrit. */
    readonly nomDAbord: string;
    /** La touche qui rouvre sa pochette, à l'accueil et dans la room ; celle qui la laisse comme elle était. */
    readonly maPochette: string;
    readonly laisser: string;
  };

  /**
   * Une room : sur l'étiquette du disque du salon, le code et combien on est ; le papier où l'on tape un code, et la touche qui rejoint ;
   * le lien à copier ; la touche de l'hôte qui ouvre le salon ; l'étiquette vierge de la réponse et les deux pastilles qui s'y collent ;
   * les pastilles qui disent qui a trouvé quoi, sans dire la réponse ; le dos de pochette des titres joués ; les points de la finale ;
   * ce qu'on lit en arrivant pendant une piste.
   */
  readonly partie: {
    /** La touche pour quitter la partie, en haut à gauche, et ce qu'on demande avant. */
    readonly quitter: string;
    /** La touche de l'hôte, à côté de « Quitter » : ouvrir le bac pour changer de playlist, en pleine partie. */
    readonly autrePlaylist: string;
    readonly quitterVraiment: string;
    readonly code: string;
    readonly autourDuMeuble: string;
    readonly saisie: string;
    readonly rejoindre: string;
    readonly lien: string;
    readonly copier: string;
    /** Ce que dit le papier du lien, un instant, une fois qu'on l'a copié ; et le mot qui accompagne le lien qu'on partage. */
    readonly copie: string;
    readonly viensJouer: string;
    readonly ouvrirLeSalon: string;
    readonly taReponse: string;
    readonly artiste: string;
    readonly titre: string;
    readonly aTrouveLArtiste: string;
    readonly aTrouveLeTitre: string;
    readonly feat: string;
    readonly aTrouveLeFeat: string;
    /** L'artiste et son invité, quand une piste a un feat. */
    readonly avecUnFeat: string;
    /** Ce que rapporte une piste dans chaque mode, dit à l'hôte quand il tourne le sélecteur. */
    readonly bareme: Readonly<Record<string, string>>;
    readonly titresJoues: string;
    readonly titreJoue: string;
    /** Au bas du papier des titres joués, à la finale : combien il y en a (quand ils n'y tiennent pas tous), et qu'on les revoit en le touchant. */
    readonly titresDeLaFace: string;
    readonly revoir: string;
    readonly retour: string;
    readonly points: string;
    readonly unPoint: string;
    readonly onAttend: string;
    readonly spectateur: string;
  };

  /** Ce que dit le jeu quand quelque chose ne va pas comme prévu : chaque état, sa phrase. */
  readonly etats: {
    readonly codeInconnu: string;
    readonly complet: string;
    /** Une room en solo, où l'on tente d'entrer. */
    readonly solo: string;
    /** Le serveur n'ouvre pas une room de plus : il en tient assez, ou ce téléphone en a assez ouvert. */
    readonly tropDeRooms: string;
    readonly tropCourt: string;
    readonly connexionPerdue: string;
    readonly patronSorti: string;
    readonly personne: string;
    readonly sonBloque: string;
    /** Un lien qui ne mène à aucune playlist. */
    readonly introuvable: string;
  };

  /**
   * Les playlists, dans le bac : la touche qui cherche, « Mes playlists », ce qu'on tape pour chercher ou coller sa playlist, ce qui
   * reste jouable après l'import, le message à qui colle un lien Spotify (le jeu ne lit pas Spotify), et la touche qui choisit.
   */
  readonly playlists: {
    readonly chercher: string;
    readonly laMienne: string;
    readonly recherche: string;
    readonly coller: string;
    readonly jouables: string;
    readonly spotify: string;
    readonly choisir: string;
    /** Aux « Prêtes à jouer » : ce qu'on fait d'abord, et la touche qui tire une playlist du genre. */
    readonly toucheUnGenre: string;
    readonly auHasard: string;
    /** Ce qu'on lit sur la playlist choisie, sous son titre : combien de titres elle a. */
    readonly titres: string;
    /** Pendant que la recherche fouille le bac, puis quand elle n'a rien trouvé. */
    readonly fouille: string;
    readonly rien: string;
    /** D'où viennent les extraits : on le dit sous le bac. */
    readonly source: string;
  };

  /**
   * Le compte, facultatif : la touche de l'accueil, l'écran du compte (pourquoi en avoir un, l'adresse à taper, le lien parti, le
   * lien arrivé, les scores, sortir, tout effacer), ce qu'on peut s'y voir refuser, et l'e-mail qui porte le lien. Les scores ont
   * leur singulier (zéro et un) et leur pluriel.
   */
  readonly compte: {
    readonly touche: string;
    readonly pourquoi: string;
    readonly adresse: string;
    readonly envoyer: string;
    readonly envoye: string;
    /** Le lien parti : à quelle adresse, combien de temps il marche, et où le chercher s'il n'est pas là. */
    readonly envoyeA: string;
    readonly valable: string;
    readonly indesirables: string;
    readonly autreAdresse: string;
    readonly lienLa: string;
    readonly entrer: string;
    readonly parties: readonly [string, string];
    readonly victoires: readonly [string, string];
    readonly sortir: string;
    readonly effacer: string;
    readonly effacerQuestion: string;
    readonly effacerVraiment: string;
    readonly garder: string;
    readonly retour: string;
    /** « J'ai un mot de passe », sous l'adresse : on entre avec lui plutôt que par un lien. */
    readonly avecUnMotDePasse: string;
    /**
     * Le mot de passe : l'étiquette où on le tape (pour entrer, ou le nouveau), le papier de l'étape, « Mot de passe oublié » (qui
     * envoie le lien), la touche du compte ouvert qui mène à le choisir, et ce que le compte en dit (sans, ou avec) ; le garder ;
     * ce qu'on attend de lui, et ce que vaut celui qu'on tape ; ce qu'on dit une fois gardé.
     */
    readonly motDePasse: {
      readonly etiquette: string;
      readonly nouveau: string;
      readonly pour: string;
      readonly oublie: string;
      readonly touche: string;
      readonly sans: string;
      readonly avec: string;
      readonly garder: string;
      readonly choisis: string;
      readonly regle: string;
      readonly jugement: { readonly court: string; readonly simple: string; readonly adresse: string; readonly bon: string };
      readonly garde: string;
      readonly autres: string;
    };
    readonly refus: {
      readonly adresse: string;
      readonly tropDeLiens: string;
      readonly lienPerime: string;
      readonly comptesFermes: string;
      readonly motDePasseFaux: string;
      readonly tropDEssais: string;
      readonly motDePasseFaible: string;
    };
    readonly courrier: {
      readonly sujet: string;
      readonly bonjour: string;
      readonly corps: string;
      readonly bouton: string;
      readonly duree: string;
      readonly rien: string;
      readonly signature: string;
      /** L'e-mail d'essai, que la mise en place envoie pour vérifier que le courrier part. */
      readonly essaiSujet: string;
      readonly essai: string;
      /** La lettre qui prévient un compte qui dort depuis presque deux ans qu'il sera bientôt effacé. */
      readonly dortSujet: string;
      readonly dort: string;
      readonly dortGarder: string;
      /** La lettre qui dit à l'adresse d'un compte que son mot de passe vient d'être choisi ; et que faire, si ce n'était pas elle. */
      readonly motDePasseSujet: string;
      readonly motDePasse: string;
      readonly motDePassePasToi: string;
    };
  };

  /**
   * Les pages légales, servies à part, sans script : la confidentialité et les mentions légales. Chacune a un titre, une date,
   * et des parties, chacune ses paragraphes. « {site} » s'y remplace par l'adresse du site, « {contact} » par l'adresse où écrire
   * (celle que le serveur connaît). Les liens qui y mènent, en bas de l'accueil.
   */
  readonly legal: {
    readonly liens: { readonly confidentialite: string; readonly mentions: string };
    readonly retour: string;
    readonly confidentialite: PageLegale;
    readonly mentions: PageLegale;
    /** Quand le serveur ne connaît pas d'adresse où écrire. */
    readonly sansContact: string;
  };

  /** La page des statistiques, pour l'éditeur seul (voir ecran/statistiques). */
  readonly statistiques: TextesDesStatistiques;

  /**
   * Données d'exemple : un pseudo de pote et un titre d'album tiré de la liste ; un vrai titre connu, et qui le chante ;
   * et trois autres vrais titres, pour les quatre choix.
   */
  readonly exemples: {
    readonly artiste: string;
    readonly album: string;
    readonly titre: string;
    readonly interprete: string;
    readonly leurres: readonly { readonly titre: string; readonly interprete: string }[];
    /** Une piste avec un feat, pour montrer la troisième partie à trouver en saisie libre. */
    readonly avecUnFeat: { readonly titre: string; readonly interprete: string; readonly feat: string; readonly saisie: string };
  };
}

/** Un nom par clé : ce qu'une page écrit pour une clé qu'elle reçoit (un appareil, un navigateur, une phase…). */
export type Noms = Readonly<Record<string, string>>;

/**
 * La page des statistiques : son titre, ce qu'elle dit quand elle est fermée, ses périodes, ses unités, et chacune de ses parties,
 * avec le nom de ce qu'elle y compte. Les « {n} », « {jour} »… y sont remplis par la page.
 */
export interface TextesDesStatistiques {
  readonly titre: string;
  readonly aJour: string;
  readonly chargement: string;
  readonly fermee: { readonly titre: string; readonly texte: string };
  readonly periodes: Noms;
  readonly depuis: string;
  readonly rienDePersonnel: string;
  readonly evolution: { readonly hausse: string; readonly baisse: string; readonly egal: string; readonly avant: string };
  readonly unites: {
    readonly secondes: string;
    readonly minutes: string;
    readonly heures: string;
    readonly jours: string;
    readonly pourcent: string;
    readonly fois: string;
  };
  readonly enDirect: {
    readonly titre: string;
    readonly rooms: string;
    readonly telephones: string;
    readonly joueurs: string;
    readonly enJeu: string;
    readonly comptes: string;
    readonly serveur: string;
    readonly aucune: string;
    readonly phases: Noms;
    readonly room: string;
  };
  readonly essentiel: Noms & { readonly titre: string; readonly completion: string };
  readonly jourParJour: Noms & { readonly titre: string };
  readonly modes: { readonly titre: string; readonly colonnes: Noms };
  readonly reglages: { readonly titre: string; readonly titres: string; readonly secondes: string; readonly son: string; readonly sons: Noms };
  readonly joueurs: Noms & { readonly titre: string; readonly moyenne: string };
  readonly reponses: Noms & { readonly titre: string; readonly delais: string; readonly verdicts: string; readonly trouvailles: string };
  readonly musique: {
    readonly titre: string;
    readonly titres: string;
    readonly durs: string;
    readonly playlists: string;
    readonly themes: string;
    readonly recherches: string;
    readonly collees: string;
    readonly vides: string;
    readonly changees: string;
    readonly rejouees: string;
    readonly sansTitre: string;
    readonly colonnes: Noms;
    readonly imports: Noms;
  };
  readonly partage: Noms & { readonly titre: string };
  readonly appareils: {
    readonly titre: string;
    readonly appareils: string;
    readonly navigateurs: string;
    readonly systemes: string;
    readonly ecranDAccueil: string;
    readonly pleinEcran: string;
    readonly sonBloque: string;
    readonly robots: string;
    /** Les pages ouvertes par un navigateur qui demande à ne pas être suivi : comptées, sans visiteur ni appareil. */
    readonly sansSuivi: string;
    readonly noms: Noms;
  };
  readonly premiersPas: Noms & { readonly titre: string };
  readonly quand: { readonly titre: string; readonly heures: string; readonly jours: string; readonly semaine: readonly string[] };
  readonly comptes: Noms & { readonly titre: string };
  readonly records: Noms & { readonly titre: string; readonly le: string; readonly aucun: string };
}

/** Une page légale : son titre, sa date, ses parties. */
export interface PageLegale {
  readonly titre: string;
  readonly date: string;
  readonly parties: readonly { readonly titre: string; readonly paragraphes: readonly string[] }[];
}
