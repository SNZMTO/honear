/**
 * Le registre des modes de jeu : ajouter un mode, c'est un fichier, et une ligne ici ; son nom dans les textes.
 * L'ordre du registre est celui des crans du sélecteur.
 */

import type { ModeDeJeu } from './contrat';
import { LIBRE } from './libre';
import { PREMIER_ARRIVE } from './premier';
import { PREMIERE_NOTE } from './premiere-note';
import { QUATRE_CHOIX } from './quatre-choix';

export const MODES = {
  libre: LIBRE,
  quatreChoix: QUATRE_CHOIX,
  premierArrive: PREMIER_ARRIVE,
  premiereNote: PREMIERE_NOTE,
} as const satisfies Readonly<Record<string, ModeDeJeu>>;
export type CleDeMode = keyof typeof MODES;

/** Les modes, dans l'ordre de leurs crans sur le sélecteur. */
export const MODES_PAR_CRAN: readonly ModeDeJeu[] = Object.values(MODES).sort((a, b) => a.cran - b.cran);

export type { ModeDeJeu, PisteDuMode, Proposition, PropositionDeLaPiste } from './contrat';
