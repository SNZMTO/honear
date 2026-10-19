/**
 * Le tournoi : pas de pistes à deviner, mais des duels, comme une coupe. Deux titres par disque, un sur chaque face ; chacun
 * retourne le sien et l'écoute à sa guise, puis vote pour la face qu'il garde. La majorité l'emporte et passe au tour suivant,
 * jusqu'au disque d'or. On y joue seul ou à toute la tablée. Son déroulé est à part (`regles/tournoi.ts`) : le registre ne lui
 * donne que son nom, son cran, et ses joueurs. Rangé au-delà de la manette, il ne s'y choisit pas encore : sa place reste à dessiner.
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
