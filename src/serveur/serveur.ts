/**
 * Le serveur : les rooms en mémoire, par leur code, et les connexions des téléphones. Une connexion n'envoie que des actions ;
 * la première crée une room ou en rejoint une, et le serveur donne au téléphone son identifiant et son jeton (dans l'état complet).
 * Le transport (un WebSocket, ou le serveur simulé du prototype) lui passe ce qui arrive et porte ce qui part. Il n'a qu'une horloge,
 * la sienne, et la donne à qui la demande. Pas de base : une room vit en mémoire, et s'en va quand plus personne n'y joue.
 */

import type { Action, Brancher, Connexion } from '../regles/messages';
import type { CleDeMode, PisteDuMode } from '../regles/modes';
import { assezLongue, codeDePartie, type EtatDeLaPartie } from '../regles/partie';
import type { Tirage } from '../regles/pochette';
import { SERVEUR } from '../ressources/reglages';
import { avecDesChoix } from './choix';
import { dansLOrdre, unOrdreAuHasard } from './ordre';
import { ouvrirUneRoom, type Room } from './room';

export interface Serveur {
  /** Un téléphone se connecte : ce qu'il recevra passe par `recevoir`. C'est ce que fera un WebSocket, d'un bout à l'autre. */
  readonly connecter: Brancher;
  /** L'heure passe : chaque room fait ce qu'elle a à faire, et celles où plus personne ne joue s'en vont. Rend l'heure du prochain rendez-vous, s'il y en a un. */
  avancer(): number | undefined;
  room(code: string): Room | undefined;
  /** Combien de rooms vivent en mémoire. */
  readonly rooms: number;
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
]);

export function demarrerLeServeur(o: OptionsDuServeur): Serveur {
  const rooms = new Map<string, Room>();
  /** À chaque jeton, la room et la place qu'il rouvre. */
  const jetons = new Map<string, { readonly code: string; readonly id: string }>();
  let compteur = 0;
  const nouvelId = (): string => `j${++compteur}`;

  /** Un code que personne n'a : quatre lettres sans ambiguïté, tirées jusqu'à ce qu'il soit libre. */
  function codeLibre(): string {
    for (;;) {
      const code = codeDePartie(o.tirage);
      if (!rooms.has(code)) return code;
    }
  }

  /** Une room s'en va quand plus personne n'y est branché depuis un moment, ou quand elle a trop duré. */
  function expirer(heure: number): void {
    for (const [code, room] of rooms) {
      const vide = room.branches === 0 && heure - room.activite >= SERVEUR.expiration.sansPersonne;
      if (!vide && heure - room.ouverteA < SERVEUR.expiration.auPlus) continue;
      rooms.delete(code);
      for (const [jeton, place] of jetons) if (place.code === code) jetons.delete(jeton);
    }
  }

  function avancer(): number | undefined {
    const heure = o.maintenant();
    expirer(heure);
    const rendezVous = [...rooms.values()].map((r) => r.avancer(heure)).filter((t): t is number => t !== undefined);
    return rendezVous.length > 0 ? Math.min(...rendezVous) : undefined;
  }

  /**
   * Les pistes d'une playlist, telles qu'une room les joue : elles se relisent à chaque lancer (la source a peut-être renouvelé les
   * liens de leurs extraits), dans un ordre tiré au hasard quand la room la prend.
   */
  function lire(lien: string, pistes: readonly PisteDuMode[], mode: CleDeMode): () => readonly PisteDuMode[] {
    const ordre = o.ordre?.(pistes.length) ?? unOrdreAuHasard(pistes.length, o.tirage);
    return () => avecDesChoix(dansLOrdre(o.playlist(lien) ?? pistes, ordre), mode, o.tirage);
  }

  return {
    room: (code) => rooms.get(code),
    get rooms() {
      return rooms.size;
    },
    avancer,
    connecter(recevoir): Connexion {
      let lien: { readonly room: Room; readonly id: string } | undefined;
      /** L'hôte prend une autre playlist : s'il y a de quoi jouer une face, la room repart dessus ; sinon, elle est trop courte. */
      const changerDePlaylist = (room: Room, id: string, playlist: string, heure: number): void => {
        if (room.etat.hote !== id) return;
        const pistes = o.playlist(playlist);
        if (pistes === undefined || !assezLongue(pistes.length, room.etat.pistes)) {
          recevoir({ genre: 'refus', heure, raison: 'tropCourt' });
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
              return;
            }
            const { mode, extrait, son } = action;
            const code = codeLibre();
            const finie = (etat: EtatDeLaPartie): void => o.quandUneFaceFinit?.(code, etat);
            const lues = lire(action.playlist, pistes, mode);
            const room = ouvrirUneRoom(code, { mode, pistes: action.pistes, extrait, son }, action.playlist, lues, heure, finie);
            rooms.set(room.code, room);
            arriver(room, action.pochette, heure);
            return;
          }
          if (action.genre === 'rejoindre') {
            const room = rooms.get(action.code.toUpperCase());
            if (room === undefined) {
              recevoir({ genre: 'refus', heure, raison: 'codeInconnu' });
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
          if (lien !== undefined) lien.room.debrancher(lien.id, o.maintenant());
          lien = undefined;
        },
      };
    },
  };
}
