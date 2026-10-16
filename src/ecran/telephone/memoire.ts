/**
 * Ce que le téléphone sait : ce que le serveur lui a dit (la room, qui il y est, le journal publié, le déroulé de la piste en cours,
 * ce qu'on lui a refusé), et ce qu'on y fait sans le serveur (les écrans où l'on prépare sa venue, ce qu'on tape, l'ampli qu'on
 * allume). Il ne décide de rien qui regarde la partie : il rejoue le journal tel que le serveur le publie, et n'envoie que des
 * actions. Tout est pur : la même mémoire, les mêmes nouvelles et les mêmes touchers redonnent la même mémoire.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { estUnThemeDuBac, type Action, type CompteVu, type Nouvelle, type PlaylistTrouvee, type RaisonDeRefus } from '../../regles/messages';
import { MODES_PAR_CRAN, type CleDeMode } from '../../regles/modes';
import { numeroDeLaPiste, partieA, type EvenementDePartie, type Face, type SonDeLaRoom } from '../../regles/partie';
import type { ActionDePiste } from '../../regles/piste';
import { jugerUnMotDePasse } from '../../regles/mot-de-passe';
import { autreAlbum, nomTape, pochetteAuHasard, type ListesAuHasard } from '../../regles/pochette';
import type { ChoixDeLAvatar } from '../../ressources/avatar';
import { TELEPHONE } from '../../ressources/ecran';
import type { Pochette } from '../../ressources/pochettes';
import { JUGEMENT, MOT_DE_PASSE, PARTIE, REGLAGES } from '../../ressources/reglages';
import { TABLEE } from '../../ressources/tablee';
import type { RefusDuCompte } from '../../scene/telephone/compte';
import type { CranDuBac } from '../../scene/telephone/ecrans';
import { pochetteAvecLOption } from '../../scene/telephone/pochette';
import { sonVoulu } from './son';

/** La room telle que le serveur l'a donnée à ce téléphone. */
export interface RoomConnue {
  readonly code: string;
  readonly toi: string;
  /** Le secret qui rouvre la place de ce téléphone : à redonner quand il revient. */
  readonly jeton: string;
  readonly journal: readonly EvenementDePartie[];
  /** Le déroulé de la piste en cours, depuis son lancer. */
  readonly seance: readonly ActionDePiste[];
  /** L'adresse de l'extrait de la piste en cours, quand la source en donne un. */
  readonly extrait: string | undefined;
}

/**
 * Ce qu'on vient faire : ouvrir une room, en rejoindre une par son code ; ou refaire sa pochette, quand on veut (à l'accueil, ou
 * dans la room entre deux pistes), et revenir là où l'on était.
 */
export type Venue = { readonly genre: 'creer' } | { readonly genre: 'rejoindre'; readonly code: string } | { readonly genre: 'retoucher' };

/** Les écrans d'avant la room, où l'on prépare sa venue. */
export type Preparation =
  | { readonly ecran: 'accueil' }
  | { readonly ecran: 'saisie'; readonly tape: string }
  | {
      readonly ecran: 'pochette';
      readonly venue: Venue;
      readonly pochette: Pochette;
      readonly choisi: ChoixDeLAvatar;
      /** Combien de fois on a tiré au sort : chaque tirage a sa graine. */
      readonly tirages: number;
      /** Vrai si l'on a touché « C'est moi » sans avoir écrit son nom : l'écran le réclame. */
      readonly sansNom?: boolean;
    }
  | { readonly ecran: 'bac'; readonly pochette: Pochette; readonly cran: CranDuBac; readonly bac: BacEnCours }
  | {
      readonly ecran: 'compte';
      /**
       * Où l'on en est : l'adresse à taper, le lien parti, le lien arrivé (la page ouverte par lui), la question avant d'effacer ;
       * le mot de passe à taper pour entrer, celui qu'on choisit (dans son compte).
       */
      readonly etape: 'adresse' | 'envoye' | 'lien' | 'effacer' | 'motDePasse' | 'nouveauMotDePasse';
      readonly email: string;
      /** Le secret du lien qui a ouvert la page : on entre quand on touche « Entrer », pas avant. */
      readonly lien?: string;
      readonly enAttente: boolean;
      /** Le mot de passe qu'on tape : il ne vit qu'ici, le temps de l'étape, et ne part qu'au serveur. */
      readonly motDePasse?: string;
      /** Vrai quand le mot de passe qu'on a choisi vient d'être gardé : l'écran du compte le dit. */
      readonly garde?: boolean;
    }
  /** À la finale, les titres joués, qu'on revoit avec leurs pochettes. */
  | { readonly ecran: 'titres' }
  | ({
      readonly ecran: 'reglages';
      readonly pochette: Pochette;
      /** La playlist choisie dans le bac, et le bac tel qu'on l'a laissé (et son cran) : on y revient si elle est trop courte, ou par « Retour ». */
      readonly playlist: string;
      readonly bac: BacEnCours;
      readonly cran?: CranDuBac;
    } & ReglagesDeLaPlatine);

/**
 * Ce qu'on fait dans le bac : le thème touché, ce qu'on cherche et ce que la recherche a trouvé, le lien collé et ce qu'il a donné,
 * ce qu'on attend du serveur, et la playlist choisie.
 */
export interface BacEnCours {
  readonly theme: string | undefined;
  readonly recherche: string;
  readonly resultats: readonly PlaylistTrouvee[] | undefined;
  readonly touche: number | undefined;
  readonly lien: string;
  readonly importee: PlaylistTrouvee | undefined;
  readonly refus: 'tropCourt' | 'spotify' | 'introuvable' | undefined;
  /** La recherche ou le lien envoyés au serveur, dont on attend la réponse. */
  readonly enAttente: string | undefined;
  readonly choisie: PlaylistTrouvee | undefined;
}

/** Ce que l'écran du compte peut s'être vu refuser : il le dit, et l'on peut réessayer. */
const REFUS_DU_COMPTE: readonly RaisonDeRefus[] = [
  'adresse',
  'tropDeLiens',
  'lienPerime',
  'comptesFermes',
  'motDePasseFaux',
  'tropDEssais',
  'motDePasseFaible',
] satisfies readonly RefusDuCompte[];
export const estUnRefusDuCompte = (raison: RaisonDeRefus | undefined): raison is RefusDuCompte =>
  raison !== undefined && REFUS_DU_COMPTE.includes(raison);

export const BAC_VIDE: BacEnCours = {
  theme: undefined,
  recherche: '',
  resultats: undefined,
  touche: undefined,
  lien: '',
  importee: undefined,
  refus: undefined,
  enAttente: undefined,
  choisie: undefined,
};

/** Ce que l'hôte règle sur les commandes de la platine avant d'ouvrir sa room. */
export interface ReglagesDeLaPlatine {
  readonly mode: CleDeMode;
  readonly pistes: number;
  readonly extrait: number;
  readonly son: SonDeLaRoom;
}

/** Ce qu'un téléphone qu'on recharge sait de la room où il jouait : de quoi y revenir à sa place, et si son ampli était allumé. */
export interface Reprise {
  readonly code: string;
  readonly jeton: string;
  readonly pochette: Pochette;
  readonly ampli?: boolean;
}

/** Ce qu'on fait pendant une piste : ce qu'on a tapé sur l'étiquette vierge, ce qu'on est en train d'y taper, l'étiquette touchée. */
export interface AuPouce {
  /** L'instant où la piste a été lancée : c'est elle qu'on joue ; une autre efface ce qu'on avait fait. */
  readonly lanceeA: number | undefined;
  readonly tape: string;
  readonly frappe: { readonly texte: string; readonly depuis: number } | undefined;
  readonly touchee: number | undefined;
  /** Combien de réponses on a tapées à cette piste. */
  readonly tapees: number;
  /** Vrai tant que le clavier du téléphone est ouvert sur l'étiquette vierge. */
  readonly clavier: boolean;
  /** Le dessus du vrai clavier, en px depuis le haut du regard, quand la page sait le lire : l'étiquette se pose au-dessus. */
  readonly dessusDuClavier?: number;
  /** L'heure du serveur où l'on a validé sa dernière réponse : l'étiquette s'enfonce un instant. */
  readonly valideeA?: number;
}

export interface Memoire {
  readonly room: RoomConnue | undefined;
  readonly refus: RaisonDeRefus | undefined;
  readonly preparation: Preparation;
  readonly pouce: AuPouce;
  /** L'heure où l'on a allumé l'ampli : le téléphone peut jouer le son, il se dit prêt à chaque piste. */
  readonly ampliAllumeA: number | undefined;
  /** Vrai quand la connexion est tombée : le téléphone le dit, et se rebranche. */
  readonly horsLigne: boolean;
  /** La pochette qu'on a faite : on la retrouve à la partie d'après. */
  readonly pochette: Pochette | undefined;
  /** La room où l'on jouait avant que la page ne soit rechargée : on y revient dès que la ligne est là. */
  readonly reprise: Reprise | undefined;
  /** Le compte où joue ce téléphone, tel que le serveur l'a dit, et le secret de sa session : il le redonne en se branchant. */
  readonly compte: CompteVu | undefined;
  readonly session: string | undefined;
  /** Mes playlists : celles qu'on a importées par un lien, gardées sur l'appareil, la plus récente d'abord. */
  readonly mesPlaylists: readonly PlaylistTrouvee[];
  /** L'heure du serveur où l'on a copié le lien de la room : le papier du lien le dit un instant. */
  readonly lienCopieA?: number;
  /** Vrai quand le navigateur a refusé de jouer l'extrait faute d'un geste : l'écran demande qu'on le touche. */
  readonly sonBloque?: boolean;
  /**
   * Le lien de la liste sur mesure du MCP qui a ouvert la page (« honear.fr/?liste=… ») : le bac de l'hôte s'ouvre dessus, comme
   * s'il l'avait collé. Une fois : la room d'après choisit comme d'habitude.
   */
  readonly listeOuverte?: string;
}

/** Le navigateur refuse le son tant qu'on n'a pas touché l'écran, ou le laisse partir. */
export const sonBloque = (m: Memoire, bloque: boolean): Memoire =>
  bloque ? { ...m, sonBloque: true } : (({ sonBloque: _avant, ...reste }) => reste)(m);

/** Le lien de la room vient d'être copié, à cette heure : le papier du lien le dit un instant. */
export const lienCopie = (m: Memoire, heure: number): Memoire => ({ ...m, lienCopieA: heure });

/** Combien de « Mes playlists » l'appareil garde : autant que le bac en montre. */
export const MES_PLAYLISTS_AU_PLUS = TABLEE.telephone.bac.miennes.y.length;

export const POUCE_LIBRE: AuPouce = { lanceeA: undefined, tape: '', frappe: undefined, touchee: undefined, tapees: 0, clavier: false };

export const MEMOIRE_VIDE: Memoire = {
  room: undefined,
  refus: undefined,
  preparation: { ecran: 'accueil' },
  pouce: POUCE_LIBRE,
  ampliAllumeA: undefined,
  horsLigne: false,
  pochette: undefined,
  reprise: undefined,
  compte: undefined,
  session: undefined,
  mesPlaylists: [],
};

/** Ce que l'hôte trouve réglé avant d'ouvrir sa room, et ce qu'il faut pour tirer une pochette au sort. */
export interface Preparatifs extends ReglagesDeLaPlatine {
  /** Vrai si l'hôte peut tourner les commandes de la platine ; faux si elles sont réglées d'avance (la partie du prototype). */
  readonly commandes: boolean;
  /** La playlist que « Celle-là » prend dans le bac quand on n'y a rien choisi. */
  readonly playlist: string;
  /** Vrai si le serveur a une source de musique où chercher : les thèmes, la recherche et le lien collé marchent alors pour de vrai. */
  readonly chercher: boolean;
  /** D'où viennent les extraits, à écrire sous le bac. */
  readonly source?: string;
  /** Vrai si le serveur tient des comptes (le jeu en ligne) : l'accueil a sa touche « Mon compte ». */
  readonly comptes?: boolean;
  readonly listes: ListesAuHasard;
  /** La graine des pochettes tirées au sort sur ce téléphone. */
  readonly graine: number;
  /**
   * Un clavier qui tape tout seul (celui du prototype) : le code d'une room, son nom d'artiste, ou une réponse à la piste de ce
   * numéro, sur cette face, quand on en a déjà tapé tant ; rien, on n'a plus rien à dire. Sans lui, c'est le clavier du téléphone qui tape.
   */
  readonly clavier?: {
    readonly code: () => string;
    readonly nom: () => string;
    readonly reponse: (piste: { readonly face: Face; readonly numero: number }, deja: number) => string | undefined;
  };
}

/** Ce qu'on peut toucher sur le téléphone. Chaque touche, chaque étiquette à toucher en est un. */
export type Toucher =
  | { readonly genre: 'poser' | 'code' | 'taperLeCode' | 'entrer' | 'auHasard' | 'autreAlbum' | 'cEstMoi' | 'choisir' | 'ouvrir' }
  /** À la saisie du code : revenir à l'accueil sans entrer. */
  | { readonly genre: 'laisserLeCode' }
  /** « Retour », au coin de l'écran, avant la room : l'étape d'avant (voir `etapeDAvant`). */
  | { readonly genre: 'revenir' }
  /** Sa pochette, quand on veut : la rouvrir, y taper son nom d'artiste, la laisser comme elle était. */
  | { readonly genre: 'maPochette' | 'taperLeNom' | 'laisserLaPochette' }
  /** À la finale : revoir les titres joués, et revenir. */
  | { readonly genre: 'revoirLesTitres' | 'fermerLesTitres' }
  /** Au salon : partager le lien de la room (le téléphone le partage, ou le copie ; la mémoire n'en garde rien de plus). */
  | { readonly genre: 'partagerLeLien' }
  | { readonly genre: 'ouvrirLeChoix'; readonly choix: ChoixDeLAvatar }
  | { readonly genre: 'porter'; readonly rang: number }
  | { readonly genre: 'cranDuBac'; readonly cran: CranDuBac }
  | { readonly genre: 'allumer' | 'lancer' | 'rejouer' | 'taper' }
  /** Quitter la partie : on revient à l'accueil, la room oubliée. */
  | { readonly genre: 'quitter' }
  /** L'hôte, dans la room : ouvrir le bac pour changer de playlist, ou le refermer sans en changer. */
  | { readonly genre: 'autrePlaylist' | 'fermerLeBac' }
  | { readonly genre: 'toucherLEtiquette'; readonly rang: number }
  | { readonly genre: 'tournerLeBouton'; readonly bouton: 'pistes' | 'extrait' | 'mode' }
  /** Un nom gravé autour de la manette, touché : ce mode-là. */
  | { readonly genre: 'choisirLeMode'; readonly mode: CleDeMode }
  /** Aux « Prêtes à jouer », un thème touché : on cherche ses playlists, et la première sort du bac. */
  | { readonly genre: 'theme'; readonly cle: string; readonly recherche: string }
  /** Aux « Prêtes à jouer » : une des playlists du genre, tirée au sort. */
  | { readonly genre: 'playlistAuHasard' }
  /** Une de « Mes playlists », par son rang. */
  | { readonly genre: 'maPlaylist'; readonly rang: number }
  /** Un résultat de la recherche, touché : c'est lui qu'on prendra. */
  | { readonly genre: 'resultat'; readonly rang: number }
  /** Les étiquettes où l'on tape, dans le bac : celle de la recherche, celle du lien. */
  | { readonly genre: 'taperLaRecherche' | 'collerLeLien' }
  /** Le compte : l'ouvrir, y taper son adresse, demander le lien, en changer, entrer, sortir, effacer (et confirmer, ou pas), revenir. */
  | { readonly genre: ToucherDuCompte };

/** Ce qu'on touche sur l'écran du compte, et la touche de l'accueil qui l'ouvre. */
export type ToucherDuCompte =
  | 'compte'
  | 'taperLAdresse'
  | 'envoyerLeLien'
  | 'avecUnMotDePasse'
  | 'taperLeMotDePasse'
  | 'entrerAvecLeMotDePasse'
  | 'motDePasseOublie'
  | 'nouveauMotDePasse'
  | 'garderLeMotDePasse'
  | 'autreAdresse'
  | 'entrerParLeLien'
  | 'sortirDuCompte'
  | 'effacerLeCompte'
  | 'effacerVraiment'
  | 'garderLeCompte'
  | 'retour';

/** Ce qu'un toucher, une nouvelle ou le temps qui passe font : la mémoire d'après, et les actions à envoyer au serveur. */
export interface Suite {
  readonly memoire: Memoire;
  readonly actions: readonly Action[];
}

/** La pochette tirée au sort pour la n-ième fois sur ce téléphone. */
const pochetteTiree = (p: Preparatifs, tirages: number): Pochette => pochetteAuHasard(hasard(p.graine + tirages).suivant, p.listes);

/**
 * La pochette qu'on retrouve en arrivant : celle qu'on avait faite, sinon la première tirée au sort. Son nom, seulement s'il est à
 * soi : un nom tiré au sort (« DJ Raclette ») ne dit pas qui joue, on écrit le sien.
 */
function pochetteDeDepart(m: Memoire, p: Preparatifs): Pochette {
  const pochette = m.pochette ?? pochetteTiree(p, 0);
  return nomAMoi(pochette.artiste, p) ? pochette : { ...pochette, artiste: '' };
}

/** La pochette qu'on porte dans la room, telle que tous la voient : la dernière qu'on y a faite. */
function pochetteDansLaRoom(room: RoomConnue): Pochette | undefined {
  return partieA(room.journal, Infinity).joueurs.find((j) => j.id === room.toi)?.pochette;
}

/**
 * Le bac de l'hôte qui crée sa room. Si la page s'est ouverte sur une liste sur mesure du MCP, il s'ouvre sur « Mes playlists » et
 * la liste part, comme un lien collé : il n'y a plus qu'à la prendre.
 */
function bacDeLHote(m: Memoire, pochette: Pochette, p: Preparatifs): Suite {
  const { listeOuverte: lien, ...sansElle } = m;
  if (lien === undefined || !p.chercher)
    return { memoire: { ...sansElle, pochette, preparation: { ecran: 'bac', pochette, cran: 'pretes', bac: BAC_VIDE } }, actions: [] };
  return {
    memoire: { ...sansElle, pochette, preparation: { ecran: 'bac', pochette, cran: 'laMienne', bac: { ...BAC_VIDE, lien, enAttente: lien } } },
    actions: [{ genre: 'importer', lien }],
  };
}

/** Un nom qu'on a tapé soi-même, pas l'un de ceux qu'on tire au sort : « Au hasard » le laisse où il est. */
const nomAMoi = (nom: string, p: Preparatifs): boolean => nom.trim() !== '' && !p.listes.artistes.includes(nom);

/**
 * La mémoire d'un téléphone qu'on ouvre : à l'accueil ; sur sa pochette, s'il arrive par l'adresse d'une room (le QR code, le lien
 * copié) ; ou prêt à revenir dans la room où il jouait, si la page a été rechargée.
 */
export function memoireDeDepart(
  p: Preparatifs,
  depart: {
    readonly code?: string;
    readonly reprise?: Reprise;
    readonly pochette?: Pochette;
    /** Le secret de la session de ce téléphone, s'il est entré dans un compte. */
    readonly session?: string;
    /** Le secret du lien de connexion qui a ouvert la page : l'écran du compte attend qu'on touche « Entrer ». */
    readonly lien?: string;
    /** Les playlists que l'appareil a gardées. */
    readonly mesPlaylists?: readonly PlaylistTrouvee[];
    /** Le lien de la liste sur mesure que l'adresse de la page nomme. */
    readonly liste?: string;
  },
): Memoire {
  // Son ampli était allumé : il l'est encore, depuis toujours (le regard ne s'y attarde pas) ; le son repartira au premier toucher.
  const ampliAllumeA = depart.reprise?.ampli === true ? -Infinity : undefined;
  const m: Memoire = {
    ...MEMOIRE_VIDE,
    pochette: depart.pochette,
    reprise: depart.reprise,
    ampliAllumeA,
    session: depart.session,
    mesPlaylists: depart.mesPlaylists ?? [],
    ...(depart.liste !== undefined ? { listeOuverte: depart.liste } : {}),
  };
  if (depart.lien !== undefined && depart.reprise === undefined)
    return { ...m, preparation: { ecran: 'compte', etape: 'lien', email: '', lien: depart.lien, enAttente: false } };
  if (depart.reprise !== undefined || depart.code === undefined) return m;
  return {
    ...m,
    preparation: {
      ecran: 'pochette',
      venue: { genre: 'rejoindre', code: depart.code },
      pochette: pochetteDeDepart(m, p),
      choisi: 'dessus',
      tirages: 0,
    },
  };
}

/** Le cran suivant d'un bouton, en revenant au premier après le dernier ; un réglage hors des crans repart du premier. */
const suivant = <T>(crans: readonly T[], courant: T): T => crans[(crans.indexOf(courant) + 1) % crans.length] ?? courant;

/** La piste qu'on joue, par son lancer : le dernier du déroulé. */
const lancerEnCours = (room: RoomConnue | undefined): number | undefined => room?.seance.find((a) => a.genre === 'lancer')?.a;

/** Ce que le téléphone apprend du serveur. Un refus le ramène là où l'on peut corriger ce qui a été refusé. */
export function recevoir(m: Memoire, n: Nouvelle): Memoire {
  switch (n.genre) {
    case 'etat':
      return {
        ...m,
        room: { code: n.code, toi: n.toi, jeton: n.jeton, journal: n.journal, seance: n.seance, extrait: n.extrait },
        // Dans une room, l'ampli est allumé d'office : le son part au premier toucher, sans rien à allumer.
        ampliAllumeA: m.ampliAllumeA ?? -Infinity,
        refus: undefined,
        horsLigne: false,
        reprise: undefined,
        // La room repart (la face B, un retour) : les titres qu'on revoyait étaient ceux d'avant.
        preparation: m.preparation.ecran === 'titres' ? { ecran: 'accueil' } : m.preparation,
      };
    case 'evenement':
      return m.room === undefined ? m : { ...m, room: { ...m.room, journal: [...m.room.journal, n.evenement] } };
    case 'piste': {
      if (m.room === undefined) return m;
      const lancee = n.action.genre === 'lancer';
      const seance = lancee ? [n.action] : [...m.room.seance, n.action];
      return { ...m, room: { ...m.room, seance, extrait: lancee ? n.extrait : m.room.extrait } };
    }
    case 'playlists': {
      const p = m.preparation;
      // La réponse à ce qu'on a cherché, si l'on cherche encore (on a pu passer à « La mienne » entre-temps).
      if (p.ecran !== 'bac' || p.cran === 'laMienne' || p.bac.enAttente !== n.recherche) return m;
      // On choisira parmi elles : aux « Prêtes à jouer », en touchant un disque ou « Au hasard » ; à la recherche, une pochette.
      return { ...m, preparation: { ...p, bac: { ...p.bac, enAttente: undefined, resultats: n.playlists, touche: undefined, choisie: undefined } } };
    }
    case 'importee': {
      const p = m.preparation;
      if (p.ecran !== 'bac' || p.cran !== 'laMienne' || p.bac.enAttente === undefined) return m;
      const assez = (n.playlist.jouables ?? n.playlist.total) >= Math.min(...REGLAGES.pistes.choix);
      // Une playlist qu'on peut jouer rejoint « Mes playlists », en tête ; on n'en garde que ce que le bac en montre.
      const mesPlaylists = assez
        ? [n.playlist, ...m.mesPlaylists.filter((p) => p.lien !== n.playlist.lien)].slice(0, MES_PLAYLISTS_AU_PLUS)
        : m.mesPlaylists;
      return {
        ...m,
        mesPlaylists,
        preparation: {
          ...p,
          bac: {
            ...p.bac,
            enAttente: undefined,
            importee: n.playlist,
            refus: assez ? undefined : 'tropCourt',
            choisie: assez ? n.playlist : undefined,
          },
        },
      };
    }
    case 'refus': {
      const p = m.preparation;
      // Ce que l'écran du compte s'est vu refuser : il le dit, et l'on peut réessayer. Un mot de passe faux s'efface.
      if (estUnRefusDuCompte(n.raison)) {
        const efface = n.raison === 'motDePasseFaux' ? { motDePasse: '' } : {};
        return { ...m, refus: n.raison, preparation: p.ecran === 'compte' ? { ...p, ...efface, enAttente: false } : p };
      }
      if (n.raison === 'spotify' || n.raison === 'introuvable')
        return p.ecran === 'bac'
          ? { ...m, preparation: { ...p, bac: { ...p.bac, enAttente: undefined, importee: undefined, choisie: undefined, refus: n.raison } } }
          : m;
      if (n.raison === 'tropCourt') {
        // La playlist que l'hôte a prise dans la room est trop courte pour la face : il revient au bac, qui le dit.
        const sienne = m.room !== undefined ? pochetteDansLaRoom(m.room) : undefined;
        return {
          ...m,
          refus: n.raison,
          preparation:
            p.ecran === 'reglages'
              ? { ecran: 'bac', pochette: p.pochette, cran: 'pretes', bac: { ...p.bac, refus: 'tropCourt' } }
              : sienne !== undefined && p.ecran === 'accueil'
                ? { ecran: 'bac', pochette: sienne, cran: 'pretes', bac: { ...BAC_VIDE, refus: 'tropCourt' } }
                : p,
        };
      }
      // Un code inconnu, une room pleine : on revient à la saisie du code, avec ce qu'on avait tapé.
      const code = p.ecran === 'pochette' && p.venue.genre === 'rejoindre' ? p.venue.code : '';
      return { ...m, room: undefined, reprise: undefined, refus: n.raison, preparation: { ecran: 'saisie', tape: m.reprise?.code ?? code } };
    }
    case 'heure':
      // L'heure du serveur règle l'horloge du téléphone, pas sa mémoire.
      return m;
    case 'lienEnvoye': {
      const p = m.preparation;
      return p.ecran === 'compte' ? { ...m, refus: undefined, preparation: { ...p, etape: 'envoye', email: n.email, enAttente: false } } : m;
    }
    case 'compte': {
      // Dans son compte : sa pochette revient avec lui, d'un téléphone à l'autre. Le lien a servi, ou le mot de passe : l'écran
      // montre le compte ; s'il venait d'en choisir un, il dit qu'il est gardé.
      const p = m.preparation;
      const garde = p.ecran === 'compte' && p.etape === 'nouveauMotDePasse' && p.enAttente;
      return {
        ...m,
        compte: n.compte,
        session: n.session ?? m.session,
        pochette: n.compte.pochette ?? m.pochette,
        refus: p.ecran === 'compte' ? undefined : m.refus,
        // Le téléphone revient dans son compte (sa session) alors qu'un lien attend qu'on touche « Entrer » : le lien reste là.
        preparation:
          p.ecran !== 'compte' || (p.etape === 'lien' && !p.enAttente && n.session === undefined)
            ? p
            : { ecran: 'compte', etape: 'adresse', email: n.compte.email, enAttente: false, ...(garde ? { garde: true } : {}) },
      };
    }
    case 'horsCompte': {
      const p = m.preparation;
      return {
        ...m,
        compte: undefined,
        session: undefined,
        preparation: p.ecran === 'compte' && p.etape !== 'lien' ? { ecran: 'compte', etape: 'adresse', email: p.email, enAttente: false } : p,
      };
    }
  }
}

/** La connexion tombe, ou revient : le téléphone se rebranchera et redonnera son jeton. */
export const horsLigne = (m: Memoire, tombee: boolean): Memoire => ({ ...m, horsLigne: tombee });

/** Ce qu'il faut envoyer pour se rebrancher : rejoindre sa room, avec son jeton et sa pochette ; ou celle d'avant le rechargement. */
export function revenir(m: Memoire): Action | undefined {
  const p = m.room;
  if (p === undefined)
    return m.reprise !== undefined ? { genre: 'rejoindre', code: m.reprise.code, pochette: m.reprise.pochette, jeton: m.reprise.jeton } : undefined;
  const moi = p.journal.find((e): e is Extract<EvenementDePartie, { genre: 'arrivee' }> => e.genre === 'arrivee' && e.id === p.toi);
  return moi === undefined ? undefined : { genre: 'rejoindre', code: p.code, pochette: pochetteDansLaRoom(p) ?? moi.pochette, jeton: p.jeton };
}

/** Le pouce, remis à zéro à chaque nouvelle piste. */
function pouceDeLaPiste(m: Memoire): AuPouce {
  const lanceeA = lancerEnCours(m.room);
  return m.pouce.lanceeA === lanceeA ? m.pouce : { ...POUCE_LIBRE, lanceeA };
}

/**
 * L'étape d'avant, que « Retour » rouvre, avant la room : de sa pochette, l'accueil (pour poser un disque) ou la saisie du code, avec
 * ce code (pour rejoindre) ; du bac, sa pochette ; des réglages, le bac tel qu'on l'a laissé. Rien ailleurs : dans une room, on la
 * quitte ; les autres écrans ont leur propre « Retour » (le code, le compte, les titres) ou leur « Laisser » (la pochette qu'on refait).
 */
export function etapeDAvant(m: Memoire): Preparation | undefined {
  if (m.room !== undefined) return undefined;
  const prep = m.preparation;
  switch (prep.ecran) {
    case 'pochette':
      if (prep.venue.genre === 'creer') return { ecran: 'accueil' };
      return prep.venue.genre === 'rejoindre' ? { ecran: 'saisie', tape: prep.venue.code } : undefined;
    case 'bac':
      return { ecran: 'pochette', venue: { genre: 'creer' }, pochette: prep.pochette, choisi: 'dessus', tirages: 0 };
    case 'reglages':
      return { ecran: 'bac', pochette: prep.pochette, cran: prep.cran ?? 'pretes', bac: prep.bac };
    default:
      return undefined;
  }
}

/** Ce que fait un toucher. Rien de ce qui regarde la partie ne change ici : on l'envoie au serveur, qui décide. */
export function toucher(m: Memoire, t: Toucher, heure: number, p: Preparatifs): Suite {
  const rien: Suite = { memoire: m, actions: [] };
  const seul = (memoire: Memoire): Suite => ({ memoire, actions: [] });
  const prep = m.preparation;
  switch (t.genre) {
    case 'poser':
      return seul({
        ...m,
        refus: undefined,
        preparation: { ecran: 'pochette', venue: { genre: 'creer' }, pochette: pochetteDeDepart(m, p), choisi: 'dessus', tirages: 0 },
      });
    case 'code':
      return seul({ ...m, refus: undefined, preparation: { ecran: 'saisie', tape: '' } });
    case 'taperLeCode':
      return prep.ecran === 'saisie' && p.clavier !== undefined
        ? seul({ ...m, refus: undefined, preparation: { ...prep, tape: p.clavier.code() } })
        : rien;
    case 'entrer':
      if (prep.ecran !== 'saisie' || prep.tape === '') return rien;
      return seul({
        ...m,
        refus: undefined,
        preparation: {
          ecran: 'pochette',
          venue: { genre: 'rejoindre', code: prep.tape },
          pochette: pochetteDeDepart(m, p),
          choisi: 'dessus',
          tirages: 0,
        },
      });
    case 'laisserLeCode':
      return prep.ecran === 'saisie' ? seul({ ...m, refus: undefined, preparation: { ecran: 'accueil' } }) : rien;
    case 'revenir': {
      const avant = etapeDAvant(m);
      return avant !== undefined ? seul({ ...m, refus: undefined, preparation: avant }) : rien;
    }
    case 'ouvrirLeChoix':
      return prep.ecran === 'pochette' ? seul({ ...m, preparation: { ...prep, choisi: t.choix } }) : rien;
    case 'porter':
      return prep.ecran === 'pochette'
        ? seul({ ...m, preparation: { ...prep, pochette: pochetteAvecLOption(prep.pochette, prep.choisi, t.rang) } })
        : rien;
    case 'auHasard': {
      if (prep.ecran !== 'pochette') return rien;
      // Le nom qu'on a tapé est à soi : le hasard tire tout le reste.
      const pochette = { ...pochetteTiree(p, prep.tirages + 1), artiste: prep.pochette.artiste.trim() };
      return seul({ ...m, preparation: { ...prep, pochette, tirages: prep.tirages + 1 } });
    }
    case 'maPochette': {
      // Dans la room, celle que tous voient ; à l'accueil, celle qu'on a gardée.
      const pochette = (m.room !== undefined ? pochetteDansLaRoom(m.room) : undefined) ?? pochetteDeDepart(m, p);
      return seul({
        ...m,
        refus: undefined,
        preparation: { ecran: 'pochette', venue: { genre: 'retoucher' }, pochette, choisi: 'dessus', tirages: 0 },
      });
    }
    case 'laisserLaPochette':
      return prep.ecran === 'pochette' && prep.venue.genre === 'retoucher' ? seul({ ...m, preparation: { ecran: 'accueil' } }) : rien;
    case 'taperLeNom':
      // C'est le clavier du téléphone qui tape : le champ posé sur l'étiquette s'en charge ; celui du prototype tape tout seul.
      return prep.ecran === 'pochette' && p.clavier !== undefined ? seul(saisir(m, p.clavier.nom())) : rien;
    case 'partagerLeLien':
      // C'est le téléphone qui partage le lien, ou le copie : la mémoire le saura s'il est copié (voir `lienCopie`).
      return rien;
    case 'revoirLesTitres':
      return m.room !== undefined ? seul({ ...m, preparation: { ecran: 'titres' } }) : rien;
    case 'fermerLesTitres':
      return prep.ecran === 'titres' ? seul({ ...m, preparation: { ecran: 'accueil' } }) : rien;
    case 'autreAlbum':
      if (prep.ecran !== 'pochette') return rien;
      return seul({
        ...m,
        preparation: {
          ...prep,
          pochette: autreAlbum(prep.pochette, hasard(p.graine - prep.tirages - 1).suivant, p.listes.albums),
          tirages: prep.tirages + 1,
        },
      });
    case 'cEstMoi': {
      if (prep.ecran !== 'pochette') return rien;
      // Le nom est obligatoire : c'est lui qu'on lit au classement. Sans lui, l'écran le réclame.
      const nom = prep.pochette.artiste.trim();
      if (nom === '') return seul({ ...m, preparation: { ...prep, sansNom: true } });
      const pochette = { ...prep.pochette, artiste: nom };
      // Refaite : la room la voit changer, le compte la garde ; on revient où l'on était.
      if (prep.venue.genre === 'retoucher') {
        const dire = m.room !== undefined || m.compte !== undefined;
        return { memoire: { ...m, pochette, preparation: { ecran: 'accueil' } }, actions: dire ? [{ genre: 'changerDePochette', pochette }] : [] };
      }
      // L'hôte va choisir sa playlist ; l'invité rejoint la room de son code, et c'est le serveur qui dira s'il y entre.
      if (prep.venue.genre === 'creer') return bacDeLHote(m, pochette, p);
      return { memoire: { ...m, pochette }, actions: [{ genre: 'rejoindre', code: prep.venue.code, pochette }] };
    }
    case 'cranDuBac':
      // Un autre cran, une autre façon de choisir : ce qu'on avait choisi dans l'autre ne compte plus, ce qu'on y attendait non plus.
      return prep.ecran === 'bac'
        ? seul({
            ...m,
            refus: undefined,
            preparation: {
              ...prep,
              cran: t.cran,
              bac: { ...prep.bac, choisie: undefined, refus: undefined, theme: undefined, touche: undefined, enAttente: undefined },
            },
          })
        : rien;
    case 'theme':
      if (prep.ecran !== 'bac' || !p.chercher) return rien;
      return {
        memoire: {
          ...m,
          preparation: { ...prep, bac: { ...prep.bac, theme: t.cle, enAttente: t.recherche, resultats: undefined, choisie: undefined } },
        },
        actions: [{ genre: 'chercher', recherche: t.recherche, ...(estUnThemeDuBac(t.cle) ? { theme: t.cle } : {}) }],
      };
    case 'resultat': {
      if (prep.ecran !== 'bac') return rien;
      const trouvee = prep.bac.resultats?.[t.rang];
      return trouvee === undefined ? rien : seul({ ...m, preparation: { ...prep, bac: { ...prep.bac, touche: t.rang, choisie: trouvee } } });
    }
    case 'maPlaylist': {
      if (prep.ecran !== 'bac') return rien;
      const mienne = m.mesPlaylists[t.rang];
      return mienne === undefined
        ? rien
        : seul({ ...m, preparation: { ...prep, bac: { ...prep.bac, touche: t.rang, choisie: mienne, importee: undefined, refus: undefined } } });
    }
    case 'playlistAuHasard': {
      if (prep.ecran !== 'bac') return rien;
      const proposees = prep.bac.resultats ?? [];
      if (proposees.length === 0) return rien;
      // Le hasard est une graine : celle du téléphone, et l'heure du toucher. Jamais la même deux fois de suite, s'il y a le choix.
      const avant = prep.bac.touche;
      const autres = proposees.map((_, rang) => rang).filter((rang) => rang !== avant || proposees.length === 1);
      const rang = autres[Math.floor(hasard(p.graine + Math.floor(heure * MS_PAR_SECONDE)).suivant() * autres.length)] ?? 0;
      return seul({ ...m, preparation: { ...prep, bac: { ...prep.bac, touche: rang, choisie: proposees[rang] } } });
    }
    case 'taperLaRecherche':
    case 'collerLeLien':
      // C'est le clavier du téléphone qui tape : le champ posé sur l'étiquette s'en charge.
      return rien;
    case 'choisir': {
      if (prep.ecran !== 'bac') return rien;
      const { mode, pistes, extrait, son } = p;
      // À la recherche, sans résultat touché, on prend le premier ; aux « Prêtes à jouer », sans thème touché, celle du site, s'il n'a
      // pas de vraie source (avec une, il faut toucher un thème : la playlist d'essai n'a pas le son).
      const choisie = prep.bac.choisie ?? (prep.cran === 'chercher' ? prep.bac.resultats?.[0] : undefined);
      if (choisie === undefined && p.chercher) return rien;
      const playlist = choisie?.lien ?? p.playlist;
      // Une playlist plus courte que la face réglée (une liste sur mesure de douze titres, quand la face en veut quinze) se règle sur
      // la plus longue face qu'elle remplit : sans cela, le salon la refusait, et l'on revenait au bac.
      const jouables = choisie?.jouables;
      const remplies = REGLAGES.pistes.choix.filter((n) => jouables === undefined || n <= jouables);
      const face = jouables === undefined || jouables >= pistes || remplies.length === 0 ? pistes : Math.max(...remplies);
      // Dans la room, l'hôte change de playlist : la room repart dessus, réglée comme elle l'était ; le serveur dira si elle est trop courte.
      if (m.room !== undefined)
        return { memoire: { ...m, refus: undefined, preparation: { ecran: 'accueil' } }, actions: [{ genre: 'changerDePlaylist', playlist }] };
      return seul({
        ...m,
        refus: undefined,
        preparation: { ecran: 'reglages', pochette: prep.pochette, playlist, bac: prep.bac, cran: prep.cran, mode, pistes: face, extrait, son },
      });
    }
    case 'tournerLeBouton': {
      if (prep.ecran !== 'reglages' || !p.commandes) return rien;
      if (t.bouton === 'mode') {
        // Les modes de la manette, dans l'ordre de leurs crans : ceux d'au-delà ne se choisissent pas.
        const cles = MODES_PAR_CRAN.map((m) => m.cle as CleDeMode);
        return seul({ ...m, preparation: { ...prep, mode: suivant(cles, prep.mode) } });
      }
      return seul({ ...m, preparation: { ...prep, [t.bouton]: suivant(REGLAGES[t.bouton].choix, prep[t.bouton]) } });
    }
    case 'choisirLeMode':
      return prep.ecran === 'reglages' && p.commandes ? seul({ ...m, preparation: { ...prep, mode: t.mode } }) : rien;
    case 'ouvrir': {
      if (prep.ecran !== 'reglages') return rien;
      const { mode, pistes, extrait, son, pochette, playlist } = prep;
      return { memoire: m, actions: [{ genre: 'creer', mode, pistes, extrait, son, playlist, pochette }] };
    }
    case 'allumer': {
      // Allumé pendant le décompte d'une piste, le téléphone est prêt pour elle ; s'il a un extrait à charger, il le dira une fois chargé.
      const enDecompte = m.room !== undefined && lancerEnCours(m.room) !== undefined && !m.room.seance.some((a) => a.genre !== 'lancer');
      const allume: Memoire = { ...m, ampliAllumeA: m.ampliAllumeA ?? heure };
      return {
        memoire: allume,
        actions: m.ampliAllumeA === undefined && enDecompte && sonVoulu(allume) === undefined ? [{ genre: 'pret' }] : [],
      };
    }
    case 'lancer':
      return { memoire: m, actions: [{ genre: 'lancer' }] };
    case 'rejouer':
      return { memoire: m, actions: [{ genre: 'rejouer' }] };
    case 'autrePlaylist': {
      const room = m.room;
      if (room === undefined || partieA(room.journal, Infinity).hote !== room.toi) return rien;
      const pochette = pochetteDansLaRoom(room) ?? pochetteDeDepart(m, p);
      return seul({ ...m, refus: undefined, preparation: { ecran: 'bac', pochette, cran: 'pretes', bac: BAC_VIDE } });
    }
    case 'fermerLeBac':
      return prep.ecran === 'bac' ? seul({ ...m, refus: undefined, preparation: { ecran: 'accueil' } }) : rien;
    case 'quitter':
      if (m.room === undefined) return rien;
      return {
        memoire: { ...m, room: undefined, reprise: undefined, refus: undefined, preparation: { ecran: 'accueil' }, pouce: POUCE_LIBRE },
        actions: [{ genre: 'quitter' }],
      };
    case 'taper': {
      if (m.room === undefined || p.clavier === undefined) return rien;
      const pouce = pouceDeLaPiste(m);
      if (pouce.frappe !== undefined) return rien;
      const etat = partieA(m.room.journal, Infinity);
      const texte = p.clavier.reponse({ face: etat.face, numero: numeroDeLaPiste(etat, true).numero }, pouce.tapees);
      return texte === undefined ? rien : seul({ ...m, pouce: { ...pouce, tape: '', frappe: { texte, depuis: heure } } });
    }
    case 'toucherLEtiquette': {
      const pouce = pouceDeLaPiste(m);
      if (m.room === undefined || pouce.touchee !== undefined) return rien;
      return {
        memoire: { ...m, pouce: { ...pouce, touchee: t.rang } },
        actions: [{ genre: 'repondre', proposition: { genre: 'choix', rang: t.rang } }],
      };
    }
    case 'compte':
    case 'taperLAdresse':
    case 'envoyerLeLien':
    case 'avecUnMotDePasse':
    case 'taperLeMotDePasse':
    case 'entrerAvecLeMotDePasse':
    case 'motDePasseOublie':
    case 'nouveauMotDePasse':
    case 'garderLeMotDePasse':
    case 'autreAdresse':
    case 'entrerParLeLien':
    case 'sortirDuCompte':
    case 'effacerLeCompte':
    case 'effacerVraiment':
    case 'garderLeCompte':
    case 'retour':
      return toucherLeCompte(m, t.genre);
  }
}

/** Ce qu'on fait sur l'écran du compte. On n'y décide de rien : le serveur dit si le lien est parti, si l'on est entré. */
function toucherLeCompte(m: Memoire, genre: ToucherDuCompte): Suite {
  const rien: Suite = { memoire: m, actions: [] };
  const prep = m.preparation;
  if (genre === 'compte')
    return m.room === undefined
      ? {
          memoire: { ...m, refus: undefined, preparation: { ecran: 'compte', etape: 'adresse', email: m.compte?.email ?? '', enAttente: false } },
          actions: [],
        }
      : rien;
  if (prep.ecran !== 'compte') return rien;
  const ici = (change: Partial<Extract<Preparation, { readonly ecran: 'compte' }>>, actions: readonly Action[] = []): Suite => ({
    memoire: { ...m, refus: undefined, preparation: { ...prep, ...change } },
    actions,
  });
  /** Le mot de passe qu'on a tapé s'oublie quand on quitte son étape. */
  const { motDePasse: _tape, garde: _garde, ...sansMotDePasse } = prep;
  const motDePasse = prep.motDePasse ?? '';
  switch (genre) {
    case 'taperLAdresse':
    case 'taperLeMotDePasse':
      // C'est le clavier du téléphone qui tape : le champ posé sur l'étiquette s'en charge.
      return rien;
    case 'envoyerLeLien':
    case 'motDePasseOublie': {
      // Le lien part à l'adresse tapée : de l'étape de l'adresse, ou de celle du mot de passe, qu'on a oublié.
      const email = prep.email.trim();
      if (email === '' || prep.enAttente || m.compte !== undefined) return rien;
      return {
        memoire: { ...m, refus: undefined, preparation: { ...sansMotDePasse, enAttente: true } },
        actions: [{ genre: 'demanderUnLien', email }],
      };
    }
    case 'avecUnMotDePasse':
      // Il faut l'adresse d'abord : sans elle, l'écran la réclame.
      if (prep.etape !== 'adresse' || prep.enAttente || m.compte !== undefined) return rien;
      if (prep.email.trim() === '') return { memoire: { ...m, refus: 'adresse' }, actions: [] };
      return ici({ etape: 'motDePasse', motDePasse: '' });
    case 'entrerAvecLeMotDePasse':
      if (prep.etape !== 'motDePasse' || prep.enAttente || motDePasse === '') return rien;
      return ici({ enAttente: true }, [{ genre: 'entrerAvecUnMotDePasse', email: prep.email.trim(), motDePasse }]);
    case 'nouveauMotDePasse':
      return m.compte === undefined
        ? rien
        : { memoire: { ...m, refus: undefined, preparation: { ...sansMotDePasse, etape: 'nouveauMotDePasse' } }, actions: [] };
    case 'garderLeMotDePasse':
      if (prep.etape !== 'nouveauMotDePasse' || prep.enAttente || m.compte === undefined) return rien;
      // Trop faible, il ne part pas : l'écran dit pourquoi (le serveur le refuserait aussi).
      if (jugerUnMotDePasse(motDePasse, m.compte.email) !== 'bon') return { memoire: { ...m, refus: 'motDePasseFaible' }, actions: [] };
      return ici({ enAttente: true }, [{ genre: 'choisirUnMotDePasse', motDePasse }]);
    case 'autreAdresse': {
      const { lien: _servi, ...sansLien } = prep;
      return { memoire: { ...m, refus: undefined, preparation: { ...sansLien, etape: 'adresse', enAttente: false } }, actions: [] };
    }
    case 'entrerParLeLien':
      return prep.lien === undefined || prep.enAttente ? rien : ici({ enAttente: true }, [{ genre: 'ouvrirLeCompte', lien: prep.lien }]);
    case 'sortirDuCompte':
      return m.compte === undefined ? rien : ici({}, [{ genre: 'sortirDuCompte' }]);
    case 'effacerLeCompte':
      return m.compte === undefined ? rien : ici({ etape: 'effacer' });
    case 'effacerVraiment':
      return prep.etape === 'effacer' ? ici({ etape: 'adresse', email: '' }, [{ genre: 'effacerLeCompte' }]) : rien;
    case 'garderLeCompte':
      return ici({ etape: 'adresse' });
    case 'retour':
      // De l'étape d'un mot de passe, on revient à l'adresse (ou au compte ouvert) ; d'ailleurs, à l'accueil.
      return {
        memoire: {
          ...m,
          refus: undefined,
          preparation:
            prep.etape === 'motDePasse' || prep.etape === 'nouveauMotDePasse'
              ? { ...sansMotDePasse, etape: 'adresse', enAttente: false }
              : { ecran: 'accueil' },
        },
        actions: [],
      };
  }
}

/** Ce que le clavier a tapé à cette heure, de ce qu'il tape. */
export const tapeA = (frappe: { readonly texte: string; readonly depuis: number }, heure: number): string =>
  [...frappe.texte].slice(0, Math.max(0, Math.floor((heure - frappe.depuis) / TELEPHONE.clavier.parLettre))).join('');

/** Le temps passe : le clavier finit de taper, et la réponse part. */
export function avancer(m: Memoire, heure: number): Suite {
  const pouce = pouceDeLaPiste(m);
  const { frappe } = pouce;
  if (pouce !== m.pouce && frappe === undefined) return { memoire: { ...m, pouce }, actions: [] };
  if (frappe === undefined) return { memoire: m, actions: [] };
  const finie = frappe.depuis + [...frappe.texte].length * TELEPHONE.clavier.parLettre + TELEPHONE.clavier.avantDEnvoyer;
  if (heure < finie) return { memoire: m, actions: [] };
  // La réponse part, à l'heure où le clavier a fini de la taper : l'étiquette s'enfonce, comme sous le pouce.
  return {
    memoire: { ...m, pouce: { ...pouce, tape: frappe.texte, frappe: undefined, tapees: pouce.tapees + 1, valideeA: finie } },
    actions: [{ genre: 'repondre', proposition: { genre: 'saisie', texte: frappe.texte } }],
  };
}

/**
 * Ce qu'il faut envoyer quand une piste est lancée : « prêt », si l'ampli est déjà allumé et qu'il n'y a pas d'extrait à charger
 * (le haut-parleur le dira, une fois l'extrait chargé). Le reste du temps, rien.
 */
export function aLaNouvelle(avant: Memoire, apres: Memoire): readonly Action[] {
  const lancee = lancerEnCours(apres.room);
  return lancee !== undefined && lancee !== lancerEnCours(avant.room) && apres.ampliAllumeA !== undefined && sonVoulu(apres) === undefined
    ? [{ genre: 'pret' }]
    : [];
}

/** Les millisecondes d'une seconde : la graine d'un tirage change à chaque milliseconde. */
const MS_PAR_SECONDE = 1000;

/** Ce qu'une réponse tapée peut compter de caractères (le serveur refuse au-delà) ; une adresse e-mail, au plus. */
export const SAISIE_AU_PLUS = JUGEMENT.saisieAuPlus;
export const ADRESSE_AU_PLUS = 254;

/**
 * Le clavier du téléphone s'ouvre sur l'étiquette vierge, ou se ferme : l'éventail et l'étiquette lui font de la place.
 * @param dessus le dessus du vrai clavier, en px depuis le haut du regard, si la page sait le lire.
 */
export function clavierOuvert(m: Memoire, ouvert: boolean, dessus?: number): Memoire {
  if (m.room === undefined) return m;
  const { dessusDuClavier: _ancien, ...pouce } = pouceDeLaPiste(m);
  return { ...m, pouce: { ...pouce, clavier: ouvert, ...(ouvert && dessus !== undefined ? { dessusDuClavier: dessus } : {}) } };
}

/**
 * Les champs où tape le clavier du téléphone : la réponse, le code d'une room, une recherche, un lien, une adresse, un nom d'artiste,
 * un mot de passe.
 */
export const CHAMPS_DE_SAISIE = ['reponse', 'code', 'recherche', 'lien', 'email', 'nom', 'motDePasse'] as const;
export type ChampDeSaisie = (typeof CHAMPS_DE_SAISIE)[number];

/**
 * Vrai si ce qu'on voit sur l'étiquette de la réponse est la réponse qu'on vient d'envoyer, pas un brouillon : y revenir la vide,
 * pour en taper une autre. Un brouillon, lui, reste.
 */
export const laReponseEstPartie = (m: Memoire): boolean => m.room !== undefined && pouceDeLaPiste(m).valideeA !== undefined;

/**
 * Le champ que montre l'écran d'où l'on tape, quand on ne le dit pas : le nom sur « Fais ta pochette », la recherche ou le lien dans
 * le bac, le code à sa saisie, l'adresse au compte ; sinon, la réponse.
 */
function champDeLEcran(m: Memoire): ChampDeSaisie {
  const prep = m.preparation;
  if (prep.ecran === 'pochette') return 'nom';
  if (prep.ecran === 'bac') return prep.cran === 'laMienne' ? 'lien' : 'recherche';
  if (m.room === undefined && prep.ecran === 'saisie') return 'code';
  if (m.room === undefined && prep.ecran === 'compte')
    return prep.etape === 'motDePasse' || prep.etape === 'nouveauMotDePasse' ? 'motDePasse' : 'email';
  return 'reponse';
}

/**
 * Ce qu'on tape au clavier du téléphone : le code d'une room, à la saisie (en capitales, sans les lettres qu'on confond, quatre au
 * plus) ; son nom d'artiste ; une adresse, une recherche, un lien ; ou une réponse, sur l'étiquette vierge.
 * @param champ celui où l'on tape, tel que l'écran l'a posé : une piste passe avant la pochette qu'on refaisait, et le bac de l'hôte
 * s'ouvre dans la room ; c'est lui qui dit où va ce qu'on tape. Sans lui, celui que montre l'écran d'où l'on tape.
 */
export function saisir(m: Memoire, texte: string, champ: ChampDeSaisie = champDeLEcran(m)): Memoire {
  const prep = m.preparation;
  switch (champ) {
    case 'nom': {
      // Le nom d'artiste, sur l'étiquette de « Fais ta pochette » : avant la room, ou dedans, quand on la refait.
      if (prep.ecran !== 'pochette') return m;
      const { sansNom: _reclame, ...reste } = prep;
      return { ...m, preparation: { ...reste, pochette: { ...prep.pochette, artiste: nomTape(texte) } } };
    }
    case 'code': {
      if (m.room !== undefined || prep.ecran !== 'saisie') return m;
      const lettres = [...texte.toUpperCase()].filter((l) => PARTIE.code.lettres.includes(l)).slice(0, PARTIE.code.longueur);
      return { ...m, refus: undefined, preparation: { ...prep, tape: lettres.join('') } };
    }
    case 'email':
      if (m.room !== undefined || prep.ecran !== 'compte') return m;
      // Une adresse s'écrit sans espace ; on la garde telle qu'on la tape, le serveur dira si c'en est une.
      return { ...m, refus: undefined, preparation: { ...prep, email: [...texte.replace(/\s+/g, '')].slice(0, ADRESSE_AU_PLUS).join('') } };
    case 'motDePasse':
      // Un mot de passe, tel qu'on le tape, espaces compris.
      if (m.room !== undefined || prep.ecran !== 'compte' || (prep.etape !== 'motDePasse' && prep.etape !== 'nouveauMotDePasse')) return m;
      return { ...m, refus: undefined, preparation: { ...prep, motDePasse: [...texte].slice(0, MOT_DE_PASSE.auPlus).join('') } };
    case 'recherche':
    case 'lien': {
      // Dans le bac : avant la room, ou dedans, quand l'hôte change de playlist.
      if (prep.ecran !== 'bac') return m;
      const court = [...texte].slice(0, SAISIE_AU_PLUS).join('');
      const bac =
        prep.cran === 'laMienne'
          ? { ...prep.bac, lien: court, refus: undefined, importee: undefined, choisie: undefined }
          : { ...prep.bac, recherche: court };
      return { ...m, preparation: { ...prep, bac } };
    }
    case 'reponse': {
      if (m.room === undefined) return m;
      // On retape : la réponse d'avant n'est plus celle qu'on voit, l'étiquette ne se videra plus d'elle-même.
      const { valideeA: _partie, ...pouce } = pouceDeLaPiste(m);
      return { ...m, pouce: { ...pouce, tape: [...texte].slice(0, SAISIE_AU_PLUS).join('') } };
    }
  }
}

/**
 * On valide ce qu'on a tapé (« Envoyer » au clavier) : on entre avec ce code, ou la réponse part. Ce qu'on a tapé reste écrit.
 * @param champ celui où l'on a tapé (voir `saisir`).
 */
export function valider(m: Memoire, heure: number, p: Preparatifs, champ: ChampDeSaisie = champDeLEcran(m)): Suite {
  const prep = m.preparation;
  const rien: Suite = { memoire: m, actions: [] };
  switch (champ) {
    case 'nom':
      // Le nom tapé : on a fini de l'écrire, rien ne part.
      return rien;
    case 'email':
      return m.room === undefined && prep.ecran === 'compte' ? toucher(m, { genre: 'envoyerLeLien' }, heure, p) : rien;
    case 'motDePasse':
      if (m.room !== undefined || prep.ecran !== 'compte') return rien;
      return toucher(m, { genre: prep.etape === 'nouveauMotDePasse' ? 'garderLeMotDePasse' : 'entrerAvecLeMotDePasse' }, heure, p);
    case 'code':
      return m.room === undefined ? toucher(m, { genre: 'entrer' }, heure, p) : rien;
    case 'recherche':
    case 'lien': {
      if (prep.ecran !== 'bac') return rien;
      // Dans le bac : la recherche part, ou le lien collé ; on attend ce que le serveur en dira.
      const chercher = prep.cran === 'chercher';
      const texte = (chercher ? prep.bac.recherche : prep.bac.lien).trim();
      if (texte === '' || !p.chercher || prep.cran === 'pretes') return rien;
      const bac = {
        ...prep.bac,
        enAttente: texte,
        ...(chercher
          ? { resultats: undefined, touche: undefined, choisie: undefined }
          : { importee: undefined, choisie: undefined, refus: undefined }),
      };
      return {
        memoire: { ...m, preparation: { ...prep, bac } },
        actions: [chercher ? { genre: 'chercher', recherche: texte } : { genre: 'importer', lien: texte }],
      };
    }
    case 'reponse': {
      if (m.room === undefined) return rien;
      const pouce = pouceDeLaPiste(m);
      const texte = pouce.tape.trim();
      if (texte === '') return rien;
      return {
        memoire: { ...m, pouce: { ...pouce, tapees: pouce.tapees + 1, valideeA: heure } },
        actions: [{ genre: 'repondre', proposition: { genre: 'saisie', texte } }],
      };
    }
  }
}
