/**
 * La première note : on n'entend que le tout début de l'extrait, une seconde, puis on cherche dans le silence jusqu'au bout de la
 * piste. On répond comme en saisie libre, et le barème est le sien.
 */

import { DEROULE } from '../../ressources/reglages';
import type { ModeDeJeu } from './contrat';
import { LIBRE } from './libre';

export const PREMIERE_NOTE: ModeDeJeu = {
  ...LIBRE,
  cle: 'premiereNote',
  cran: 3,
  son: DEROULE.premiereNote,
};
