/**
 * Les messages entre les téléphones et le serveur : le contrat du transport, le même pour le vrai serveur et pour celui que simule
 * le prototype. Les téléphones n'envoient que des actions. Le serveur décide de tout : il tient le journal de la room et son horloge,
 * et ne publie que ce que chacun peut savoir. Jamais ce qu'il faut trouver avant la révélation, jamais ce qu'un autre a tapé :
 * une réponse est publiée jugée. À chaque connexion ou reconnexion, il renvoie l'état complet, c'est-à-dire le journal publié :
 * le téléphone le rejoue, et retrouve exactement le même écran. Des messages petits : un événement à la fois.
 * Ce qui arrive du réseau n'est jamais cru sur parole : `lireUneAction` ne laisse passer qu'une action bien formée.
 */

import { COULEURS_DES_THEMES, type CleDeTheme } from '../ressources/bac';
import type { Pochette } from '../ressources/pochettes';
import { REGLAGES } from '../ressources/reglages';
import { MODES, type CleDeMode, type Proposition } from './modes';
import { departageDeLaPiste, jugerUneReponse, ROOM_VIDE, suivre, type EvenementDePartie } from './partie';
import type { ActionDePiste, Reponse } from './piste';
import { estUnePochette } from './pochette';

/** Un thème du bac, par sa clé. */
export const estUnThemeDuBac = (x: unknown): x is CleDeTheme => typeof x === 'string' && Object.prototype.hasOwnProperty.call(COULEURS_DES_THEMES, x);

/** Ce qu'un téléphone envoie. Rien d'autre : il ne dit jamais ce qu'il croit de l'état. */
export type Action =
  /** L'heure qu'il est au serveur ? Le téléphone dit l'heure de son départ, à sa propre horloge : de quoi régler la sienne. */
  | { readonly genre: 'quelleHeure'; readonly depart: number }
  /** L'hôte crée la room : ses réglages, lus sur les commandes de la platine, la playlist choisie dans le bac, et sa pochette. */
  | {
      readonly genre: 'creer';
      readonly mode: CleDeMode;
      readonly pistes: number;
      readonly extrait: number;
      readonly son: 'tous' | 'hote';
      readonly playlist: string;
      readonly pochette: Pochette;
    }
  /**
   * Un joueur rejoint une room par son code, avec sa pochette. S'il revient (la page rechargée, le réseau retrouvé), il redonne
   * le jeton que le serveur lui avait donné : il retrouve sa place. Le jeton est secret ; l'identifiant, que tous voient, ne suffit pas.
   */
  | { readonly genre: 'rejoindre'; readonly code: string; readonly pochette: Pochette; readonly jeton?: string }
  /**
   * Il refait sa pochette, quand il veut : dans la room, tous la voient changer ; sous un compte, le compte la garde. Hors d'une room
   * et de tout compte, il n'y a rien à en faire.
   */
  | { readonly genre: 'changerDePochette'; readonly pochette: Pochette }
  /** Ce téléphone est prêt : son ampli est allumé, l'extrait de la piste est chargé. */
  | { readonly genre: 'pret' }
  /** L'hôte lance la face A, ou la piste suivante. */
  | { readonly genre: 'lancer' }
  /** Une réponse : un texte tapé sur l'étiquette vierge, ou une étiquette touchée. */
  | { readonly genre: 'repondre'; readonly proposition: Proposition }
  /** « Rejouer la face B » : une nouvelle partie, avec les mêmes. */
  | { readonly genre: 'rejouer' }
  /**
   * L'hôte change de playlist quand il veut, même en pleine partie : il en choisit une autre dans le bac, et la room repart sur sa
   * face A, avec les mêmes, aux mêmes places.
   */
  | { readonly genre: 'changerDePlaylist'; readonly playlist: string }
  /** Il s'en va pour de bon. */
  | { readonly genre: 'quitter' }
  /** L'hôte cherche une playlist, dans le bac : parmi les playlists publiques de la source de musique. */
  | { readonly genre: 'chercher'; readonly recherche: string; readonly theme?: CleDeTheme }
  /** L'hôte colle le lien d'une playlist : le serveur la lit, et dit ce qu'on peut en jouer. */
  | { readonly genre: 'importer'; readonly lien: string }
  /** Un joueur veut entrer dans son compte : on lui envoie, à cette adresse, un lien qui l'y fera entrer. */
  | { readonly genre: 'demanderUnLien'; readonly email: string }
  /** Il a touché ce lien, sur ce téléphone : il entre, avec le secret que le lien portait. */
  | { readonly genre: 'ouvrirLeCompte'; readonly lien: string }
  /** Un téléphone qui est déjà entré revient dans le compte, avec le secret de sa session. */
  | { readonly genre: 'reprendreLeCompte'; readonly session: string }
  /** Il sort de son compte, sur ce téléphone ; il efface son compte, et tout ce qu'il gardait. */
  | { readonly genre: 'sortirDuCompte' | 'effacerLeCompte' }
  /** Le diagnostic d'une page qui l'a demandé : ce que font son son et sa fenêtre, que le serveur écrit dans son journal. */
  | { readonly genre: 'diagnostic'; readonly texte: string }
  /** Ce que seul le téléphone voit, pour les statistiques : un lien partagé, une arrivée par le QR code… (voir `CE_QUE_LE_TELEPHONE_COMPTE`). */
  | { readonly genre: 'statistique'; readonly quoi: CeQueLeTelephoneCompte };

/**
 * Ce que seul le téléphone voit, et qu'il dit au serveur pour qu'on le compte : le lien de la room partagé (par le partage du
 * téléphone) ou copié ; une arrivée par le QR code, par un lien, par un code tapé ; le petit tutoriel vu à la première visite, revu,
 * fini ou passé ; le jeu lancé depuis l'écran d'accueil, passé en plein écran ; le son que le navigateur bloque ; une playlist tirée
 * au hasard dans le bac. Rien d'autre : un mot de cette liste, jamais ce qu'on a tapé.
 */
export const CE_QUE_LE_TELEPHONE_COMPTE = [
  'lienPartage',
  'lienCopie',
  'arriveeParQr',
  'arriveeParLien',
  'codeTape',
  'tutoVu',
  'tutoRevu',
  'tutoFini',
  'tutoPasse',
  'ecranDAccueil',
  'pleinEcran',
  'sonBloque',
  'playlistAuHasard',
] as const;
export type CeQueLeTelephoneCompte = (typeof CE_QUE_LE_TELEPHONE_COMPTE)[number];

/** Ce qu'un compte garde, tel que son téléphone le voit : son adresse, sa pochette, ses scores. */
export interface CompteVu {
  readonly email: string;
  readonly pochette?: Pochette;
  /** Les faces jouées jusqu'au bout, et celles qu'il a finies premier. */
  readonly parties: number;
  readonly victoires: number;
}

/** Une playlist que la source connaît : son lien (celui qu'on donne pour créer la room), son titre, combien de titres elle a, et combien on peut en jouer. */
export interface PlaylistTrouvee {
  readonly lien: string;
  readonly titre: string;
  readonly total: number;
  /** Ceux qui ont un extrait : on ne le sait qu'une fois la playlist lue. */
  readonly jouables?: number;
}

/**
 * Ce qu'un téléphone tient de sa connexion au serveur : de quoi envoyer une action, et la couper. Le transport (un WebSocket, ou
 * le serveur simulé du prototype) la lui donne, et lui passe chaque nouvelle qui arrive.
 */
export interface Connexion {
  envoyer(action: Action): void;
  couper(): void;
}

/**
 * De quoi se connecter : chaque nouvelle du serveur arrivera à `recevoir`. Un transport qui peut perdre la ligne (un WebSocket) dit
 * à `enLigne` quand elle tombe et quand elle revient ; à son retour, le téléphone redonne son jeton.
 */
export type Brancher = (recevoir: (nouvelle: Nouvelle) => void, enLigne?: (oui: boolean) => void) => Connexion;

/**
 * Ce qu'un téléphone peut se voir refuser, chacun avec sa phrase dans les textes : un code que personne n'a, une room pleine, une
 * playlist trop courte, une playlist Spotify qui ne se laisse pas lire (privée), un lien qui ne mène à aucune playlist ; et pour
 * les comptes, une adresse qui n'en est pas une, trop de liens demandés, un lien de connexion périmé (ou déjà servi), un site qui
 * n'envoie pas d'e-mails (ses comptes sont fermés).
 */
export type RaisonDeRefus =
  'codeInconnu' | 'complet' | 'tropCourt' | 'spotify' | 'introuvable' | 'adresse' | 'tropDeLiens' | 'lienPerime' | 'comptesFermes';

/** Ce que le serveur envoie, toujours daté de son horloge, en secondes. */
export type Nouvelle =
  /**
   * À chaque connexion ou reconnexion : la room telle qu'on peut la savoir, son code, qui est ce téléphone (et son jeton, à lui seul),
   * et le déroulé de la piste en cours s'il y en a une (le décompte lancé, l'extrait parti, la révélation) : de quoi reprendre
   * l'extrait au bon endroit.
   */
  | {
      readonly genre: 'etat';
      readonly heure: number;
      readonly code: string;
      readonly toi: string;
      readonly jeton: string;
      readonly journal: readonly EvenementDePartie[];
      readonly seance: readonly ActionDePiste[];
      /** L'adresse de l'extrait de la piste en cours, s'il y en a un : de quoi le reprendre au bon endroit. */
      readonly extrait?: string;
    }
  /** Un événement de plus du journal publié. */
  | { readonly genre: 'evenement'; readonly heure: number; readonly evenement: EvenementDePartie }
  /**
   * Le déroulé de la piste : le décompte qui part (avec l'adresse de l'extrait, à précharger pendant le décompte), tous les appareils
   * prêts (l'extrait part), la révélation.
   */
  | { readonly genre: 'piste'; readonly heure: number; readonly action: ActionDePiste; readonly extrait?: string }
  /** Une action refusée : le téléphone le dit dans la voix du site. */
  | { readonly genre: 'refus'; readonly heure: number; readonly raison: RaisonDeRefus }
  /** L'heure qu'il est au serveur, à l'arrivée de la question, avec l'heure de départ qu'elle portait. */
  | { readonly genre: 'heure'; readonly heure: number; readonly depart: number }
  /** Ce que la recherche a trouvé dans la source de musique. */
  | { readonly genre: 'playlists'; readonly heure: number; readonly recherche: string; readonly playlists: readonly PlaylistTrouvee[] }
  /** La playlist dont l'hôte a collé le lien, lue : ce qu'on peut en jouer. */
  | { readonly genre: 'importee'; readonly heure: number; readonly playlist: PlaylistTrouvee }
  /** Le lien est parti, à cette adresse. On ne dit pas si elle avait déjà un compte : il se crée en entrant. */
  | { readonly genre: 'lienEnvoye'; readonly heure: number; readonly email: string }
  /**
   * Ce téléphone est dans ce compte : ce qu'il garde. En y entrant par le lien, il reçoit aussi le secret de sa session, qu'il garde
   * pour revenir : il ne le reçoit qu'une fois.
   */
  | { readonly genre: 'compte'; readonly heure: number; readonly compte: CompteVu; readonly session?: string }
  /** Ce téléphone n'est plus dans un compte : il en est sorti, l'a effacé, ou sa session a expiré. */
  | { readonly genre: 'horsCompte'; readonly heure: number };

/**
 * Ce que l'extrait publié dit de la réponse avant la révélation : rien. Le téléphone sait qu'une piste est en cours,
 * et en 4 choix, quelles étiquettes tendre ; la vraie réponse n'arrive qu'avec la révélation.
 */
export const REPONSE_MASQUEE: Reponse = { titre: '', artiste: '', pochette: { adresse: '' } };

/**
 * Le journal tel que le serveur le publie : l'extrait sans la réponse, chaque réponse jugée sans ce qui a été tapé,
 * la révélation avec la réponse. Rejoué par un téléphone, il donne les mêmes points, les mêmes têtes, le même classement.
 */
export function publier(journal: readonly EvenementDePartie[]): EvenementDePartie[] {
  let etat = ROOM_VIDE;
  const publies: EvenementDePartie[] = [];
  for (const e of [...journal].sort((x, y) => x.a - y.a)) {
    if (e.genre === 'extrait') {
      // L'adresse de l'extrait voyage avec le lancer de la piste, pas dans le journal.
      const { extrait: _adresse, ...piste } = e.piste;
      publies.push({ ...e, piste: { ...piste, reponse: REPONSE_MASQUEE } });
    } else if (e.genre === 'reponse') {
      const jugee = jugerUneReponse(etat, e.id, e.proposition);
      // Une réponse qui ne compte pas (hors d'un extrait, déjà tout trouvé) n'est pas publiée : elle ne change rien.
      if (jugee !== undefined) publies.push({ genre: 'jugee', a: e.a, id: e.id, ...jugee });
    } else if (e.genre === 'revelation') {
      // Avec ce qu'il fallait trouver, et ce que le départage rapporte à chacun : un téléphone ne connaît pas les propositions des autres.
      const piste = etat.piste;
      const departage = piste !== undefined ? departageDeLaPiste(MODES[etat.mode], piste) : {};
      publies.push({
        ...e,
        ...(piste !== undefined ? { reponse: piste.attendue.reponse } : {}),
        ...(Object.keys(departage).length > 0 ? { departage } : {}),
      });
    } else publies.push(e);
    etat = suivre(etat, e);
  }
  return publies;
}

/**
 * Ce que peut porter ce qui vient du réseau, au plus : un code de room, un jeton, une saisie, un lien de playlist (en caractères), le
 * rang d'une étiquette touchée, une recherche, une adresse e-mail (la plus longue que permettent les règles du courrier), un paquet de
 * lignes du diagnostic.
 */
const BORNES = { code: 8, jeton: 64, saisie: 160, playlist: 300, rang: 15, recherche: 100, email: 254, diagnostic: 3200 } as const;

/** Un secret de compte (celui d'un lien, celui d'une session) : des lettres, des chiffres, des tirets, en base 64 pour les adresses. */
const SECRET = /^[A-Za-z0-9_-]{20,64}$/;

const estUnObjet = (x: unknown): x is Readonly<Record<string, unknown>> => typeof x === 'object' && x !== null && !Array.isArray(x);
const estUnTexte = (x: unknown, auPlus: number): x is string => typeof x === 'string' && x.length <= auPlus;
const estUnEntier = (x: unknown, de: number, a: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= de && x <= a;
const estUnNombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const estUnMode = (x: unknown): x is CleDeMode => typeof x === 'string' && Object.prototype.hasOwnProperty.call(MODES, x);

function lireUneProposition(x: unknown): Proposition | undefined {
  if (!estUnObjet(x)) return undefined;
  if (x['genre'] === 'saisie' && estUnTexte(x['texte'], BORNES.saisie)) return { genre: 'saisie', texte: x['texte'] };
  if (x['genre'] === 'choix' && estUnEntier(x['rang'], 0, BORNES.rang)) return { genre: 'choix', rang: x['rang'] };
  return undefined;
}

/** Le plus de pistes qu'une partie peut compter : le plus grand cran du bouton « Pistes ». */
const PISTES_AU_PLUS = Math.max(...REGLAGES.pistes.choix);

/**
 * Ce qu'un téléphone a envoyé, s'il l'a bien formé : chaque champ attendu, de la bonne sorte et de la bonne taille, et rien d'autre
 * n'est gardé. Une durée d'extrait est l'un des crans du bouton ; un nombre de pistes, de un au plus grand cran.
 * @returns rien si ce n'est pas une action : le serveur ne la verra pas.
 */
export function lireUneAction(x: unknown): Action | undefined {
  if (!estUnObjet(x)) return undefined;
  switch (x['genre']) {
    case 'quelleHeure':
      return estUnNombre(x['depart']) ? { genre: 'quelleHeure', depart: x['depart'] } : undefined;
    case 'creer': {
      const { mode, pistes, extrait, son, playlist, pochette } = x;
      if (!estUnMode(mode) || !estUnEntier(pistes, 1, PISTES_AU_PLUS) || !(REGLAGES.extrait.choix as readonly unknown[]).includes(extrait))
        return undefined;
      if ((son !== 'tous' && son !== 'hote') || !estUnTexte(playlist, BORNES.playlist) || !estUnePochette(pochette)) return undefined;
      return { genre: 'creer', mode, pistes, extrait: extrait as number, son, playlist, pochette };
    }
    case 'rejoindre': {
      const { code, pochette, jeton } = x;
      if (!estUnTexte(code, BORNES.code) || !estUnePochette(pochette)) return undefined;
      if (jeton !== undefined && !estUnTexte(jeton, BORNES.jeton)) return undefined;
      return { genre: 'rejoindre', code, pochette, ...(jeton !== undefined ? { jeton } : {}) };
    }
    case 'changerDePochette':
      return estUnePochette(x['pochette']) ? { genre: 'changerDePochette', pochette: x['pochette'] } : undefined;
    case 'repondre': {
      const proposition = lireUneProposition(x['proposition']);
      return proposition !== undefined ? { genre: 'repondre', proposition } : undefined;
    }
    case 'chercher':
      return estUnTexte(x['recherche'], BORNES.recherche) && x['recherche'].trim() !== ''
        ? { genre: 'chercher', recherche: x['recherche'], ...(estUnThemeDuBac(x['theme']) ? { theme: x['theme'] } : {}) }
        : undefined;
    case 'importer':
      return estUnTexte(x['lien'], BORNES.playlist) && x['lien'].trim() !== '' ? { genre: 'importer', lien: x['lien'] } : undefined;
    case 'diagnostic':
      return estUnTexte(x['texte'], BORNES.diagnostic) ? { genre: 'diagnostic', texte: x['texte'] } : undefined;
    case 'statistique': {
      const quoi = CE_QUE_LE_TELEPHONE_COMPTE.find((q) => q === x['quoi']);
      return quoi !== undefined ? { genre: 'statistique', quoi } : undefined;
    }
    case 'changerDePlaylist':
      return estUnTexte(x['playlist'], BORNES.playlist) && x['playlist'].trim() !== ''
        ? { genre: 'changerDePlaylist', playlist: x['playlist'] }
        : undefined;
    case 'demanderUnLien':
      return estUnTexte(x['email'], BORNES.email) && x['email'].trim() !== '' ? { genre: 'demanderUnLien', email: x['email'] } : undefined;
    case 'ouvrirLeCompte':
      return typeof x['lien'] === 'string' && SECRET.test(x['lien']) ? { genre: 'ouvrirLeCompte', lien: x['lien'] } : undefined;
    case 'reprendreLeCompte':
      return typeof x['session'] === 'string' && SECRET.test(x['session']) ? { genre: 'reprendreLeCompte', session: x['session'] } : undefined;
    case 'pret':
    case 'lancer':
    case 'rejouer':
    case 'quitter':
    case 'sortirDuCompte':
    case 'effacerLeCompte':
      return { genre: x['genre'] };
    default:
      return undefined;
  }
}
