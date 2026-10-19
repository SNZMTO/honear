/**
 * Ce que le serveur du jeu raconte de ce qui s'y passe, pour qu'on le compte (voir reseau/statistiques.ts) : une room qui s'ouvre,
 * un joueur qui arrive, une piste lancée, une réponse jugée, une face finie… Jamais qui : ni nom, ni pochette, ni ce qu'on a tapé.
 * Chaque fait d'une room dit son code (pour suivre une partie de bout en bout, en mémoire), son mode et sa playlist.
 */

import type { Verdict } from '../regles/jugement';
import type { CleDeMode } from '../regles/modes';
import type { Face, SonDeLaRoom } from '../regles/partie';

/** Ce que chaque fait d'une room porte : la room, par son code, son mode, et la playlist qu'elle joue. */
export interface DeLaRoom {
  readonly room: string;
  readonly mode: CleDeMode;
  readonly playlist: string;
}

export type FaitDuJeu =
  /** Un refus : un code que personne n'a, une room pleine, une room de plus que le serveur n'ouvre pas, une playlist trop courte pour la face. */
  | { readonly genre: 'refus'; readonly raison: 'codeInconnu' | 'complet' | 'tropDeRooms' | 'tropCourt' }
  | (DeLaRoom &
      (
        | { readonly genre: 'ouverte'; readonly pistes: number; readonly extrait: number; readonly son: SonDeLaRoom }
        /** Un joueur entre : combien ils sont avec lui ; spectateur s'il arrive pendant une piste. */
        | { readonly genre: 'arrivee'; readonly joueurs: number; readonly spectateur: boolean }
        /** Un joueur revient à sa place (la page rechargée, le réseau retrouvé), ou sa ligne tombe, ou il s'en va pour de bon. */
        | { readonly genre: 'retour' | 'deconnexion' | 'depart' }
        /** L'hôte lance une piste : son numéro dans la face (la première lance la partie). */
        | { readonly genre: 'lancer'; readonly numero: number; readonly face: Face }
        /** L'extrait part : la piste se joue. */
        | { readonly genre: 'extrait' }
        /**
         * Une réponse jugée : son verdict, ce qu'elle a trouvé, ce qu'elle rapporte, si elle finit de tout trouver, combien de
         * secondes après le départ de l'extrait, et si c'est la première à trouver quelque chose dans cette piste.
         */
        | {
            readonly genre: 'reponse';
            readonly verdict: Verdict;
            readonly trouve: readonly string[];
            readonly points: number;
            readonly complet: boolean;
            readonly delai: number;
            readonly premiere: boolean;
          }
        /** La piste se révèle : ce qu'il fallait trouver, si quelqu'un a trouvé quelque chose, combien, sur combien de joueurs. */
        | {
            readonly genre: 'revelation';
            readonly titre: string;
            readonly artiste: string;
            readonly trouvee: boolean;
            readonly trouveurs: number;
            readonly joueurs: number;
          }
        /** Une face jouée jusqu'au bout : combien de joueurs, sa durée depuis le premier lancer, le meilleur score. */
        | { readonly genre: 'faceFinie'; readonly face: Face; readonly joueurs: number; readonly duree: number; readonly meilleur: number }
        /** « Rejouer la face B » ; une autre playlist, prise en cours de partie. */
        | { readonly genre: 'rejouer' | 'autrePlaylist' }
        /** La room s'en va : combien de temps elle a vécu, de pistes jouées, de joueurs au plus, et si une partie y a été lancée. */
        | { readonly genre: 'fermee'; readonly duree: number; readonly pistes: number; readonly joueursAuPlus: number; readonly lancee: boolean }
      ));

/** Un fait d'une room, sans ce que la room y met elle-même (son code, son mode, sa playlist). */
export type FaitDUneRoom = Exclude<FaitDuJeu, { readonly genre: 'refus' }>;
type SansLaRoom<F> = F extends unknown ? Omit<F, keyof DeLaRoom> : never;
export type FaitSansLaRoom = SansLaRoom<FaitDUneRoom>;

/** De quoi raconter ce qui se passe : rien, si personne n'écoute. */
export type Raconter = (fait: FaitDuJeu) => void;
