/**
 * Ce qu'un écran sait d'une piste : son déroulé, tel que le serveur le donne, et les rayures de ce joueur.
 * C'est tout ce que la scène lit pour la montrer ; elle ne le modifie jamais.
 */

import type { Piste } from '../../regles/piste';

export interface PisteEnScene {
  /** Absente : la piste n'est pas lancée, le disque attend dans sa pochette. */
  readonly piste?: Piste;
  /** Les instants où ce joueur a donné une mauvaise réponse : à chacun, une rayure. */
  readonly rayuresA: readonly number[];
}
