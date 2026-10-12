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
   * Et ce qu'il dit à un navigateur dont on a coupé les scripts.
   */
  readonly navigateur: {
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
    readonly code: string;
    readonly autourDuMeuble: string;
    readonly saisie: string;
    readonly rejoindre: string;
    readonly lien: string;
    readonly copier: string;
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
    readonly spectateur: string;
  };

  /** Ce que dit le jeu quand quelque chose ne va pas comme prévu : chaque état, sa phrase. */
  readonly etats: {
    readonly codeInconnu: string;
    readonly complet: string;
    readonly tropCourt: string;
    readonly connexionPerdue: string;
    readonly patronSorti: string;
    readonly personne: string;
    /** Un lien qui ne mène à aucune playlist. */
    readonly introuvable: string;
  };

  /**
   * Les playlists, dans le bac : ses trois façons de choisir, ce qu'on tape pour chercher ou coller sa playlist, ce qui reste jouable
   * après l'import, le message à qui colle le lien d'une playlist Spotify qui ne se laisse pas lire, et la touche qui choisit.
   */
  readonly playlists: {
    readonly pretes: string;
    readonly chercher: string;
    readonly laMienne: string;
    readonly recherche: string;
    readonly coller: string;
    readonly jouables: string;
    readonly spotify: string;
    readonly choisir: string;
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
    readonly envoyeA: string;
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
    readonly refus: { readonly adresse: string; readonly tropDeLiens: string; readonly lienPerime: string; readonly comptesFermes: string };
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
    };
  };

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
