/**
 * Le registre des modes de jeu : ajouter un mode, c'est un fichier, et une ligne ici ; son nom dans les textes.
 * Les crans des modes sont les positions de la manette, dans l'ordre de la table de la platine ; un mode au-delà (les 4 choix,
 * dont le solo a pris la place, et le tournoi, qui se choisit par son cran à lui, sous la platine) reste au registre, mais ne s'y
 * choisit pas.
 */

import { PLATINE } from '../../ressources/platine';
import type { ModeDeJeu, ModeDuRegistre } from './contrat';
import { LIBRE } from './libre';
import { PREMIER_ARRIVE } from './premier';
import { PREMIERE_NOTE } from './premiere-note';
import { QUATRE_CHOIX } from './quatre-choix';
import { SOLO } from './solo';
import { TOURNOI, TOURNOI_SOLO } from './tournoi';

export const MODES = {
  libre: LIBRE,
  solo: SOLO,
  premierArrive: PREMIER_ARRIVE,
  premiereNote: PREMIERE_NOTE,
  quatreChoix: QUATRE_CHOIX,
  tournoi: TOURNOI,
  tournoiSolo: TOURNOI_SOLO,
} as const satisfies Readonly<Record<string, ModeDuRegistre>>;
export type CleDeMode = keyof typeof MODES;

/** Les modes de la manette, dans l'ordre de leurs crans : un par position ; ceux d'au-delà ne s'y choisissent pas. */
export const MODES_PAR_CRAN: readonly ModeDuRegistre[] = Object.values(MODES)
  .filter((m: ModeDuRegistre) => m.cran < PLATINE.commandes.interrupteur.manette.directions.length)
  .sort((a, b) => a.cran - b.cran);

/** Les modes du tournoi, tels que la manette les montre quand on ouvre un tournoi : en solo à gauche, à plusieurs à droite. */
export const MODES_DU_TOURNOI: readonly ModeDuRegistre[] = [TOURNOI_SOLO, TOURNOI];

/** Vrai si ce mode se joue en duels (le tournoi), et non en pistes à deviner. */
export const enDuels = (cle: CleDeMode): boolean => MODES[cle].deroule === 'duels';

/** Le mode de blind test qu'est ce mode, s'il en est un : de quoi juger, compter, régler l'extrait ; rien pour le tournoi. */
export function modeADeviner(cle: CleDeMode): ModeDeJeu | undefined {
  const mode: ModeDuRegistre = MODES[cle];
  return mode.deroule === 'duels' ? undefined : mode;
}

export type { ModeDeJeu, ModeDuRegistre, ModeEnDuels, PisteDuMode, Proposition, PropositionDeLaPiste } from './contrat';
