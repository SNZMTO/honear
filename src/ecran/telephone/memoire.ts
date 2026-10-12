/**
 * Ce que le téléphone sait : ce que le serveur lui a dit (la room, qui il y est, le journal publié, le déroulé de la piste en cours,
 * ce qu'on lui a refusé), et ce qu'on y fait sans le serveur (les écrans où l'on prépare sa venue, ce qu'on tape, l'ampli qu'on
 * allume). Il ne décide de rien qui regarde la partie : il rejoue le journal tel que le serveur le publie, et n'envoie que des
 * actions. Tout est pur : la même mémoire, les mêmes nouvelles et les mêmes touchers redonnent la même mémoire.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { estUnThemeDuBac, type Action, type CompteVu, type Nouvelle, type PlaylistTrouvee, type RaisonDeRefus } from '../../regles/messages';
import { MODES, type CleDeMode } from '../../regles/modes';
import { numeroDeLaPiste, partieA, type EvenementDePartie, type Face, type SonDeLaRoom } from '../../regles/partie';
import type { ActionDePiste } from '../../regles/piste';
import { autreAlbum, nomTape, pochetteAuHasard, type ListesAuHasard } from '../../regles/pochette';
import type { ChoixDeLAvatar } from '../../ressources/avatar';
import { TELEPHONE } from '../../ressources/ecran';
import type { Pochette } from '../../ressources/pochettes';
import { PARTIE, REGLAGES } from '../../ressources/reglages';
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
    }
  | { readonly ecran: 'bac'; readonly pochette: Pochette; readonly cran: CranDuBac; readonly bac: BacEnCours }
  | {
      readonly ecran: 'compte';
      /** Où l'on en est : l'adresse à taper, le lien parti, le lien arrivé (la page ouverte par lui), la question avant d'effacer. */
      readonly etape: 'adresse' | 'envoye' | 'lien' | 'effacer';
      readonly email: string;
      /** Le secret du lien qui a ouvert la page : on entre quand on touche « Entrer », pas avant. */
      readonly lien?: string;
      readonly enAttente: boolean;
    }
  /** À la finale, les titres joués, qu'on revoit avec leurs pochettes. */
  | { readonly ecran: 'titres' }
  | ({
      readonly ecran: 'reglages';
      readonly pochette: Pochette;
      /** La playlist choisie dans le bac, et le bac tel qu'on l'a laissé : on y revient si elle est trop courte. */
      readonly playlist: string;
      readonly bac: BacEnCours;
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
}

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
   * Un clavier qui tape tout seul (celui du prototype) : le code d'une room, ou une réponse à la piste de ce numéro, sur cette face,
   * quand on en a déjà tapé tant ; rien, on n'a plus rien à dire. Sans lui, c'est le clavier du téléphone qui tape.
   */
  readonly clavier?: {
    readonly code: () => string;
    readonly reponse: (piste: { readonly face: Face; readonly numero: number }, deja: number) => string | undefined;
  };
}

/** Ce qu'on peut toucher sur le téléphone. Chaque touche, chaque étiquette à toucher en est un. */
export type Toucher =
  | { readonly genre: 'poser' | 'code' | 'taperLeCode' | 'entrer' | 'auHasard' | 'autreAlbum' | 'cEstMoi' | 'choisir' | 'ouvrir' }
  /** Sa pochette, quand on veut : la rouvrir, y taper son nom d'artiste, la laisser comme elle était. */
  | { readonly genre: 'maPochette' | 'taperLeNom' | 'laisserLaPochette' }
  /** À la finale : revoir les titres joués, et revenir. */
  | { readonly genre: 'revoirLesTitres' | 'fermerLesTitres' }
  | { readonly genre: 'ouvrirLeChoix'; readonly choix: ChoixDeLAvatar }
  | { readonly genre: 'porter'; readonly rang: number }
  | { readonly genre: 'cranDuBac'; readonly cran: CranDuBac }
  | { readonly genre: 'allumer' | 'lancer' | 'rejouer' | 'taper' }
  /** Quitter la partie : on revient à l'accueil, la room oubliée. */
  | { readonly genre: 'quitter' }
  | { readonly genre: 'toucherLEtiquette'; readonly rang: number }
  | { readonly genre: 'tournerLeBouton'; readonly bouton: 'pistes' | 'extrait' | 'mode' }
  | { readonly genre: 'basculerLeSon' }
  /** Aux « Prêtes à jouer », un thème touché : on cherche ses playlists, et la première sort du bac. */
  | { readonly genre: 'theme'; readonly cle: string; readonly recherche: string }
  /** Aux « Prêtes à jouer » : une des playlists du genre, tirée au sort. */
  | { readonly genre: 'playlistAuHasard' }
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

/** La pochette qu'on retrouve en arrivant : celle qu'on avait faite, sinon la première tirée au sort. */
const pochetteDeDepart = (m: Memoire, p: Preparatifs): Pochette => m.pochette ?? pochetteTiree(p, 0);

/** La pochette qu'on porte dans la room, telle que tous la voient : la dernière qu'on y a faite. */
function pochetteDansLaRoom(room: RoomConnue): Pochette | undefined {
  return partieA(room.journal, Infinity).joueurs.find((j) => j.id === room.toi)?.pochette;
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
  },
): Memoire {
  // Son ampli était allumé : il l'est encore, depuis toujours (le regard ne s'y attarde pas) ; le son repartira au premier toucher.
  const ampliAllumeA = depart.reprise?.ampli === true ? -Infinity : undefined;
  const m: Memoire = { ...MEMOIRE_VIDE, pochette: depart.pochette, reprise: depart.reprise, ampliAllumeA, session: depart.session };
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
      return {
        ...m,
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
      // Ce que l'écran du compte s'est vu refuser : il le dit, et l'on peut réessayer.
      if (n.raison === 'adresse' || n.raison === 'tropDeLiens' || n.raison === 'lienPerime' || n.raison === 'comptesFermes')
        return { ...m, refus: n.raison, preparation: p.ecran === 'compte' ? { ...p, enAttente: false } : p };
      if (n.raison === 'spotify' || n.raison === 'introuvable')
        return p.ecran === 'bac'
          ? { ...m, preparation: { ...p, bac: { ...p.bac, enAttente: undefined, importee: undefined, choisie: undefined, refus: n.raison } } }
          : m;
      if (n.raison === 'tropCourt')
        return {
          ...m,
          refus: n.raison,
          preparation: p.ecran === 'reglages' ? { ecran: 'bac', pochette: p.pochette, cran: 'pretes', bac: { ...p.bac, refus: 'tropCourt' } } : p,
        };
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
      // Dans son compte : sa pochette revient avec lui, d'un téléphone à l'autre. Le lien a servi : l'écran montre le compte.
      const p = m.preparation;
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
            : { ecran: 'compte', etape: 'adresse', email: n.compte.email, enAttente: false },
      };
    }
    case 'horsCompte': {
      const p = m.preparation;
      return {
        ...m,
        compte: undefined,
        session: undefined,
        preparation: p.ecran === 'compte' && p.etape !== 'lien' ? { ...p, etape: 'adresse', enAttente: false } : p,
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
    case 'ouvrirLeChoix':
      return prep.ecran === 'pochette' ? seul({ ...m, preparation: { ...prep, choisi: t.choix } }) : rien;
    case 'porter':
      return prep.ecran === 'pochette'
        ? seul({ ...m, preparation: { ...prep, pochette: pochetteAvecLOption(prep.pochette, prep.choisi, t.rang) } })
        : rien;
    case 'auHasard': {
      if (prep.ecran !== 'pochette') return rien;
      // Le nom qu'on a tapé est à soi : le hasard tire tout le reste.
      const tiree = pochetteTiree(p, prep.tirages + 1);
      const pochette = nomAMoi(prep.pochette.artiste, p) ? { ...tiree, artiste: prep.pochette.artiste.trim() } : tiree;
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
      // C'est le clavier du téléphone qui tape : le champ posé sur l'étiquette s'en charge.
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
      // Sans nom tapé, on garde celui que le hasard avait donné.
      const nom = prep.pochette.artiste.trim();
      const pochette = nom !== '' ? { ...prep.pochette, artiste: nom } : { ...prep.pochette, artiste: pochetteTiree(p, prep.tirages).artiste };
      // Refaite : la room la voit changer, le compte la garde ; on revient où l'on était.
      if (prep.venue.genre === 'retoucher') {
        const dire = m.room !== undefined || m.compte !== undefined;
        return { memoire: { ...m, pochette, preparation: { ecran: 'accueil' } }, actions: dire ? [{ genre: 'changerDePochette', pochette }] : [] };
      }
      // L'hôte va choisir sa playlist ; l'invité rejoint la room de son code, et c'est le serveur qui dira s'il y entre.
      if (prep.venue.genre === 'creer') return seul({ ...m, pochette, preparation: { ecran: 'bac', pochette, cran: 'pretes', bac: BAC_VIDE } });
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
      return seul({
        ...m,
        refus: undefined,
        preparation: { ecran: 'reglages', pochette: prep.pochette, playlist, bac: prep.bac, mode, pistes, extrait, son },
      });
    }
    case 'tournerLeBouton': {
      if (prep.ecran !== 'reglages' || !p.commandes) return rien;
      if (t.bouton === 'mode') {
        const cles = (Object.keys(MODES) as CleDeMode[]).sort((a, b) => MODES[a].cran - MODES[b].cran);
        return seul({ ...m, preparation: { ...prep, mode: suivant(cles, prep.mode) } });
      }
      return seul({ ...m, preparation: { ...prep, [t.bouton]: suivant(REGLAGES[t.bouton].choix, prep[t.bouton]) } });
    }
    case 'basculerLeSon':
      return prep.ecran === 'reglages' && p.commandes ? seul({ ...m, preparation: { ...prep, son: prep.son === 'tous' ? 'hote' : 'tous' } }) : rien;
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
  switch (genre) {
    case 'taperLAdresse':
      // C'est le clavier du téléphone qui tape : le champ posé sur l'étiquette s'en charge.
      return rien;
    case 'envoyerLeLien': {
      const email = prep.email.trim();
      if (email === '' || prep.enAttente) return rien;
      return ici({ enAttente: true }, [{ genre: 'demanderUnLien', email }]);
    }
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
      return { memoire: { ...m, refus: undefined, preparation: { ecran: 'accueil' } }, actions: [] };
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
  return {
    memoire: { ...m, pouce: { ...pouce, tape: frappe.texte, frappe: undefined, tapees: pouce.tapees + 1 } },
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

/** Ce qu'une réponse tapée peut compter de caractères ; une adresse e-mail, au plus. */
export const SAISIE_AU_PLUS = 120;
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
 * Ce qu'on tape au clavier du téléphone : le code d'une room, à la saisie (en capitales, sans les lettres qu'on confond, quatre au
 * plus) ; son nom d'artiste ; une adresse, une recherche, un lien ; ou une réponse, sur l'étiquette vierge.
 */
export function saisir(m: Memoire, texte: string): Memoire {
  const prep = m.preparation;
  // Le nom d'artiste, sur l'étiquette de « Fais ta pochette » : avant la room, ou dedans, quand on la refait.
  if (prep.ecran === 'pochette') return { ...m, preparation: { ...prep, pochette: { ...prep.pochette, artiste: nomTape(texte) } } };
  if (m.room === undefined && prep.ecran === 'saisie') {
    const lettres = [...texte.toUpperCase()].filter((l) => PARTIE.code.lettres.includes(l)).slice(0, PARTIE.code.longueur);
    return { ...m, refus: undefined, preparation: { ...prep, tape: lettres.join('') } };
  }
  if (m.room === undefined && prep.ecran === 'compte') {
    // Une adresse s'écrit sans espace ; on la garde telle qu'on la tape, le serveur dira si c'en est une.
    return { ...m, refus: undefined, preparation: { ...prep, email: [...texte.replace(/\s+/g, '')].slice(0, ADRESSE_AU_PLUS).join('') } };
  }
  if (m.room === undefined && prep.ecran === 'bac') {
    const court = [...texte].slice(0, SAISIE_AU_PLUS).join('');
    const bac =
      prep.cran === 'laMienne'
        ? { ...prep.bac, lien: court, refus: undefined, importee: undefined, choisie: undefined }
        : { ...prep.bac, recherche: court };
    return { ...m, preparation: { ...prep, bac } };
  }
  return m.room === undefined ? m : { ...m, pouce: { ...pouceDeLaPiste(m), tape: [...texte].slice(0, SAISIE_AU_PLUS).join('') } };
}

/** On valide ce qu'on a tapé (« Envoyer » au clavier) : on entre avec ce code, ou la réponse part. Ce qu'on a tapé reste écrit. */
export function valider(m: Memoire, heure: number, p: Preparatifs): Suite {
  const prep = m.preparation;
  // Le nom tapé : on a fini de l'écrire, rien ne part.
  if (prep.ecran === 'pochette') return { memoire: m, actions: [] };
  if (m.room === undefined && prep.ecran === 'compte') return toucher(m, { genre: 'envoyerLeLien' }, heure, p);
  if (m.room === undefined && prep.ecran === 'bac') {
    // Dans le bac : la recherche part, ou le lien collé ; on attend ce que le serveur en dira.
    const chercher = prep.cran === 'chercher';
    const texte = (chercher ? prep.bac.recherche : prep.bac.lien).trim();
    if (texte === '' || !p.chercher || prep.cran === 'pretes') return { memoire: m, actions: [] };
    const bac = {
      ...prep.bac,
      enAttente: texte,
      ...(chercher ? { resultats: undefined, touche: undefined, choisie: undefined } : { importee: undefined, choisie: undefined, refus: undefined }),
    };
    return {
      memoire: { ...m, preparation: { ...prep, bac } },
      actions: [chercher ? { genre: 'chercher', recherche: texte } : { genre: 'importer', lien: texte }],
    };
  }
  if (m.room === undefined) return toucher(m, { genre: 'entrer' }, heure, p);
  const pouce = pouceDeLaPiste(m);
  const texte = pouce.tape.trim();
  if (texte === '') return { memoire: m, actions: [] };
  return {
    memoire: { ...m, pouce: { ...pouce, tapees: pouce.tapees + 1 } },
    actions: [{ genre: 'repondre', proposition: { genre: 'saisie', texte } }],
  };
}
