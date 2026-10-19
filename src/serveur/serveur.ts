/**
 * Le serveur : les rooms en mémoire, par leur code, et les connexions des téléphones. Une connexion n'envoie que des actions ;
 * la première crée une room ou en rejoint une, et le serveur donne au téléphone son identifiant et son jeton (dans l'état complet).
 * Le transport (un WebSocket, ou le serveur simulé du prototype) lui passe ce qui arrive et porte ce qui part. Il n'a qu'une horloge,
 * la sienne, et la donne à qui la demande. Pas de base : une room vit en mémoire, et s'en va quand plus personne n'y joue. Il n'en
 * tient qu'un nombre borné, et une même adresse n'en ouvre pas sans fin (`SERVEUR.rooms`).
 */

import type { Action, Connexion, Nouvelle } from '../regles/messages';
import type { CleDeMode, PisteDuMode } from '../regles/modes';
import { assezLongue, codeDePartie, type EtatDeLaPartie } from '../regles/partie';
import type { Tirage } from '../regles/pochette';
import { SERVEUR } from '../ressources/reglages';
import { avecDesChoix } from './choix';
import { dansLOrdre, lOrdreDeLaPlaylist, unOrdreAuHasard } from './ordre';
import type { RoomEnDirect } from '../regles/statistiques';
import type { Raconter } from './faits';
import { ouvrirUneRoom, type Room } from './room';

export interface Serveur {
  /**
   * Un téléphone se connecte : ce qu'il recevra passe par `recevoir`. C'est ce que fera un WebSocket, d'un bout à l'autre.
   * @param depuis son adresse sur le réseau, quand on la connaît : de quoi compter les rooms qu'elle ouvre (rien : on ne les compte pas).
   */
  readonly connecter: (recevoir: (nouvelle: Nouvelle) => void, depuis?: string) => Connexion;
  /** L'heure passe : chaque room fait ce qu'elle a à faire, et celles où plus personne ne joue s'en vont. Rend l'heure du prochain rendez-vous, s'il y en a un. */
  avancer(): number | undefined;
  room(code: string): Room | undefined;
  /** Combien de rooms vivent en mémoire. */
  readonly rooms: number;
  /** Les rooms en mémoire, telles qu'on les voit d'un coup d'œil : leur mode, où en est la partie, combien y jouent. */
  apercu(): readonly RoomEnDirect[];
}

export interface OptionsDuServeur {
  /** L'heure du serveur, en secondes : la seule horloge de la partie. */
  readonly maintenant: () => number;
  /** Le hasard des codes de room, et des leurres du 4 choix. */
  readonly tirage: Tirage;
  /** Un secret neuf, impossible à deviner : le jeton d'un joueur, qu'il redonne pour revenir à sa place. */
  readonly jeton: () => string;
  /** Les pistes d'une playlist, d'après ce que l'hôte a choisi dans le bac ; rien si aucune source ne la connaît. */
  readonly playlist: (lien: string) => readonly PisteDuMode[] | undefined;
  /** Une face jouée jusqu'au bout, dans cette room : de quoi compter les scores de ceux qui ont un compte. */
  readonly quandUneFaceFinit?: (code: string, etat: EtatDeLaPartie) => void;
  /** L'ordre où une room joue les n pistes de sa playlist ; sans lui, tiré au hasard. */
  readonly ordre?: (n: number) => readonly number[];
  /** Vrai si une playlist se joue dans son ordre à elle (une liste sur mesure dont la difficulté monte) : elle n'est pas mélangée. */
  readonly gardeSonOrdre?: (lien: string) => boolean;
  /** Les pistes qu'une room va jouer, dans l'ordre, chaque fois qu'elle les relit : la source s'y prépare (les invités de chacune). */
  readonly bientot?: (pistes: readonly PisteDuMode[]) => void;
  /** Ce qui se passe dans les rooms, pour qu'on le compte (voir faits.ts). */
  readonly raconter?: Raconter;
}

/** Les actions dont le serveur du jeu ne s'occupe pas : la musique et les comptes, que le réseau tient. */
const AFFAIRES_DU_RESEAU: ReadonlySet<Action['genre']> = new Set([
  'chercher',
  'importer',
  'demanderUnLien',
  'ouvrirLeCompte',
  'reprendreLeCompte',
  'sortirDuCompte',
  'effacerLeCompte',
  'diagnostic',
  'statistique',
]);

export function demarrerLeServeur(o: OptionsDuServeur): Serveur {
  const rooms = new Map<string, Room>();
  /** À chaque jeton, la room et la place qu'il rouvre ; et les jetons de chaque room, qui s'en vont avec elle. */
  const jetons = new Map<string, { readonly code: string; readonly id: string }>();
  const jetonsDe = new Map<string, string[]>();
  /** L'adresse d'où chaque room a été ouverte, par son code ; et les heures où chaque adresse en a ouvert une, dans la dernière fenêtre. */
  const ouvertesDepuis = new Map<string, string>();
  const ouvertures = new Map<string, number[]>();
  let compteur = 0;
  const nouvelId = (): string => `j${++compteur}`;

  /** Un code que personne n'a : quatre lettres sans ambiguïté, tirées jusqu'à ce qu'il soit libre, en tant d'essais au plus ; rien sinon. */
  function codeLibre(): string | undefined {
    for (let essai = 0; essai < SERVEUR.essaisDuCode; essai++) {
      const code = codeDePartie(o.tirage);
      if (!rooms.has(code)) return code;
    }
    return undefined;
  }

  /** Les heures où cette adresse a ouvert une room, dans la dernière fenêtre. */
  const recentes = (depuis: string, heure: number): number[] =>
    (ouvertures.get(depuis) ?? []).filter((h) => heure - h < SERVEUR.rooms.ouvertures.fenetre);

  /** Vrai si l'on peut ouvrir une room de plus : le serveur n'en tient pas déjà assez, et cette adresse n'en a pas trop ouvert. */
  function peutOuvrir(depuis: string | undefined, heure: number): boolean {
    const R = SERVEUR.rooms;
    if (rooms.size >= R.auPlus) return false;
    if (depuis === undefined) return true;
    let siennes = 0;
    for (const adresse of ouvertesDepuis.values()) if (adresse === depuis) siennes++;
    return siennes < R.parAdresse && recentes(depuis, heure).length < R.ouvertures.parFenetre;
  }

  /**
   * Une room s'en va quand plus personne n'y est branché depuis un moment (bien moins longtemps si l'on n'y a jamais lancé de piste),
   * ou quand elle a trop duré ; ses jetons avec elle. Les ouvertures d'une adresse qui ne comptent plus s'oublient.
   */
  function expirer(heure: number): void {
    const E = SERVEUR.expiration;
    for (const [code, room] of rooms) {
      const vide = room.branches === 0 && heure - room.activite >= (room.lancee ? E.sansPersonne : E.jamaisLancee);
      if (!vide && heure - room.ouverteA < E.auPlus) continue;
      room.fermer(heure);
      rooms.delete(code);
      for (const jeton of jetonsDe.get(code) ?? []) jetons.delete(jeton);
      jetonsDe.delete(code);
      ouvertesDepuis.delete(code);
    }
    for (const depuis of ouvertures.keys()) if (recentes(depuis, heure).length === 0) ouvertures.delete(depuis);
  }

  function avancer(): number | undefined {
    const heure = o.maintenant();
    expirer(heure);
    const rendezVous = [...rooms.values()].map((r) => r.avancer(heure)).filter((t): t is number => t !== undefined);
    return rendezVous.length > 0 ? Math.min(...rendezVous) : undefined;
  }

  /**
   * Les pistes d'une playlist, telles qu'une room les joue : elles se relisent à chaque lancer (la source a peut-être renouvelé les
   * liens de leurs extraits), dans un ordre tiré au hasard quand la room la prend, ou dans le sien si elle le garde.
   */
  function lire(lien: string, pistes: readonly PisteDuMode[], mode: CleDeMode): () => readonly PisteDuMode[] {
    const sonOrdre = o.gardeSonOrdre?.(lien) === true ? lOrdreDeLaPlaylist(pistes.length) : undefined;
    const ordre = o.ordre?.(pistes.length) ?? sonOrdre ?? unOrdreAuHasard(pistes.length, o.tirage);
    const dansSonOrdre = (): PisteDuMode[] => dansLOrdre(o.playlist(lien) ?? pistes, ordre);
    // Dès qu'elle la prend, puis à chaque lancer : la source lit en coulisses ce qu'il faut des pistes qui viennent.
    o.bientot?.(dansSonOrdre());
    return () => {
      const liste = dansSonOrdre();
      o.bientot?.(liste);
      return avecDesChoix(liste, mode, o.tirage);
    };
  }

  return {
    room: (code) => rooms.get(code),
    get rooms() {
      return rooms.size;
    },
    apercu: () =>
      [...rooms.values()].map((room) => {
        const e = room.etat;
        return {
          mode: e.mode,
          phase: e.phase,
          face: e.face,
          joueurs: e.joueurs.length,
          branches: room.branches,
          pistesJouees: e.pistesJouees,
          pistes: e.pistes,
          age: o.maintenant() - room.ouverteA,
        };
      }),
    avancer,
    connecter(recevoir, depuis): Connexion {
      let lien: { readonly room: Room; readonly id: string } | undefined;
      /** L'hôte prend une autre playlist : s'il y a de quoi jouer une face, la room repart dessus ; sinon, elle est trop courte. */
      const changerDePlaylist = (room: Room, id: string, playlist: string, heure: number): void => {
        if (room.etat.hote !== id) return;
        const pistes = o.playlist(playlist);
        if (pistes === undefined || !assezLongue(pistes.length, room.etat.pistes)) {
          recevoir({ genre: 'refus', heure, raison: 'tropCourt' });
          o.raconter?.({ genre: 'refus', raison: 'tropCourt' });
          return;
        }
        room.changerDePlaylist(id, playlist, lire(playlist, pistes, room.etat.mode), heure);
      };
      /** Un nouveau joueur dans une room : un identifiant, un jeton, et sa place. */
      const arriver = (room: Room, pochette: Parameters<Room['arriver']>[1], heure: number): void => {
        const id = nouvelId();
        const jeton = o.jeton();
        const avant = room.etat.joueurs.length;
        room.arriver(id, pochette, recevoir, heure, jeton);
        if (room.etat.joueurs.length === avant) return;
        jetons.set(jeton, { code: room.code, id });
        jetonsDe.set(room.code, [...(jetonsDe.get(room.code) ?? []), jeton]);
        lien = { room, id };
      };
      return {
        envoyer(action) {
          const heure = o.maintenant();
          // L'heure se demande à tout moment, dedans ou hors d'une room.
          if (action.genre === 'quelleHeure') {
            recevoir({ genre: 'heure', heure, depart: action.depart });
            return;
          }
          if (lien !== undefined) {
            if (action.genre === 'changerDePlaylist') return changerDePlaylist(lien.room, lien.id, action.playlist, heure);
            if (!AFFAIRES_DU_RESEAU.has(action.genre)) lien.room.recevoir(lien.id, action, heure);
            // Il s'en va : sa ligne reste, hors de toute room ; il peut en ouvrir ou en rejoindre une autre.
            if (action.genre === 'quitter') lien = undefined;
            return;
          }
          // Chercher une playlist, en importer une, entrer dans son compte : c'est l'affaire du réseau, qui parle à la source de musique
          // et garde les comptes ; le serveur du jeu n'en sait rien.
          if (AFFAIRES_DU_RESEAU.has(action.genre)) return;
          if (action.genre === 'creer') {
            const pistes = o.playlist(action.playlist);
            if (pistes === undefined || !assezLongue(pistes.length, action.pistes)) {
              recevoir({ genre: 'refus', heure, raison: 'tropCourt' });
              o.raconter?.({ genre: 'refus', raison: 'tropCourt' });
              return;
            }
            // Une room de plus que le serveur n'ouvre pas : il en tient assez, cette adresse en a assez ouvert, ou plus un code n'est libre.
            const code = peutOuvrir(depuis, heure) ? codeLibre() : undefined;
            if (code === undefined) {
              recevoir({ genre: 'refus', heure, raison: 'tropDeRooms' });
              o.raconter?.({ genre: 'refus', raison: 'tropDeRooms' });
              return;
            }
            const { mode, extrait, son } = action;
            const finie = (etat: EtatDeLaPartie): void => o.quandUneFaceFinit?.(code, etat);
            const lues = lire(action.playlist, pistes, mode);
            const room = ouvrirUneRoom(code, { mode, pistes: action.pistes, extrait, son }, action.playlist, lues, heure, finie, o.raconter);
            rooms.set(room.code, room);
            if (depuis !== undefined) {
              ouvertesDepuis.set(room.code, depuis);
              ouvertures.set(depuis, [...recentes(depuis, heure), heure]);
            }
            arriver(room, action.pochette, heure);
            return;
          }
          if (action.genre === 'rejoindre') {
            const room = rooms.get(action.code.toUpperCase());
            if (room === undefined) {
              recevoir({ genre: 'refus', heure, raison: 'codeInconnu' });
              o.raconter?.({ genre: 'refus', raison: 'codeInconnu' });
              return;
            }
            // Il revient, son jeton à la main : il retrouve sa place. Sinon, c'est un nouveau joueur, s'il reste de la place.
            const place = action.jeton !== undefined ? jetons.get(action.jeton) : undefined;
            if (place !== undefined && place.code === room.code && room.etat.joueurs.some((j) => j.id === place.id)) {
              lien = { room, id: place.id };
              room.revenir(place.id, recevoir, heure);
              return;
            }
            arriver(room, action.pochette, heure);
          }
        },
        couper() {
          if (lien !== undefined) lien.room.debrancher(lien.id, o.maintenant(), recevoir);
          lien = undefined;
        },
      };
    },
  };
}
