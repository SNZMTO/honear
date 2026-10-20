/**
 * Le tournoi : pas de pistes à deviner, mais des duels, comme une coupe. Deux titres par disque, un sur chaque face ; chacun
 * retourne le sien et l'écoute à sa guise, puis vote pour la face qu'il garde. La majorité l'emporte et passe au tour suivant,
 * jusqu'au disque d'or. Il se joue à plusieurs, ou en solo. Son déroulé est à part (`regles/tournoi.ts`) : le registre ne lui
 * donne que son nom, son cran, et ses joueurs. Rangé au-delà de la manette du blind test : aux réglages, un cran sous la platine
 * (« Blind test », « Tournoi ») dit le jeu ; au tournoi, la manette n'a plus que deux noms, Solo et Multi.
 */

import { PARTIE } from '../../ressources/reglages';
import type { ModeEnDuels } from './contrat';

export const TOURNOI: ModeEnDuels = {
  cle: 'tournoi',
  cran: 8,
  reglages: {},
  deroule: 'duels',
  joueurs: { auMoins: 1, auPlus: PARTIE.joueurs.auPlus },
};

/** Le tournoi en solo : on vote seul, chaque duel se clôt à son vote ; la room n'accueille que son hôte, comme le solo du blind test. */
export const TOURNOI_SOLO: ModeEnDuels = { ...TOURNOI, cle: 'tournoiSolo', cran: 9, joueurs: { auMoins: 1, auPlus: 1 } };
