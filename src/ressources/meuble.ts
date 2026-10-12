/**
 * Le meuble : son dessus en noyer. Trois teintes selon la lumière qu'il reçoit, et le réglage de son veinage.
 */

import type { NomDeTeinte } from './palette';

export const MEUBLE = {
  /** Le bois : nu, loin de la lampe, et celui que la nappe de lumière pose dessus, en fondu, vers son cœur. */
  noyer: { nu: 'noyerSombre', eclaire: 'noyerClair' } satisfies Readonly<Record<string, NomDeTeinte>>,

  /** Le veinage : de longues facettes couchées dans la longueur du meuble. L'écart entre deux rangées vient de la densité. */
  veinage: {
    longueur: [80, 300],
    ecart: [60, 240],
    /** Épaisseur d'une veine, en part de l'écart entre deux rangées, et ses bornes en px. */
    epaisseur: { part: [0.13, 0.25], bornes: [2.2, 6.2] },
    /** Une veine n'est jamais tout à fait à sa place : écart d'une rangée (en part du pas), d'une veine dans sa rangée (en px), et inclinaison (en degrés), au plus. */
    flottement: { rangee: 0.28, veine: 1.5, inclinaison: 0.6 },
    /** Part des veines plus claires que le bois ; les autres sont plus sombres. */
    claires: 0.5,
    /** Le germe du hasard qui les place : le changer redessine tout le veinage, le garder le garde à l'identique. */
    germe: 13,
  },
} as const;
