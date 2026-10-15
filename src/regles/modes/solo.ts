/**
 * Le solo : on joue seul, sans attendre personne. On tape ce qu'on reconnaît comme en saisie libre, avec son barème ; la room
 * n'accueille que son hôte, qui lance seul ; et la piste s'arrête dès qu'il a tout trouvé, sans attendre la fin de l'extrait.
 */

import type { ModeDeJeu } from './contrat';
import { LIBRE } from './libre';

export const SOLO: ModeDeJeu = {
  ...LIBRE,
  cle: 'solo',
  cran: 1,
  joueurs: { auMoins: 1, auPlus: 1 },
  finitAuPremier: true,
};
