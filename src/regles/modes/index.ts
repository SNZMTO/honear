/**
 * Le registre des modes de jeu : ajouter un mode, c'est un fichier, et une ligne ici ; son nom dans les textes.
 * Les crans des modes sont les positions de la manette, dans l'ordre de la table de la platine ; un mode au-delà (les 4 choix,
 * dont le solo a pris la place) reste au registre, ses écrans et ses leurres avec lui, mais ne se choisit plus.
 */

import { PLATINE } from '../../ressources/platine';
import type { ModeDeJeu } from './contrat';
import { LIBRE } from './libre';
import { PREMIER_ARRIVE } from './premier';
import { PREMIERE_NOTE } from './premiere-note';
import { QUATRE_CHOIX } from './quatre-choix';
import { SOLO } from './solo';

export const MODES = {
  libre: LIBRE,
  solo: SOLO,
  premierArrive: PREMIER_ARRIVE,
  premiereNote: PREMIERE_NOTE,
  quatreChoix: QUATRE_CHOIX,
} as const satisfies Readonly<Record<string, ModeDeJeu>>;
export type CleDeMode = keyof typeof MODES;

/** Les modes de la manette, dans l'ordre de leurs crans : un par position ; ceux d'au-delà ne s'y choisissent pas. */
export const MODES_PAR_CRAN: readonly ModeDeJeu[] = Object.values(MODES)
  .filter((m) => m.cran < PLATINE.commandes.interrupteur.manette.directions.length)
  .sort((a, b) => a.cran - b.cran);

export type { ModeDeJeu, PisteDuMode, Proposition, PropositionDeLaPiste } from './contrat';
