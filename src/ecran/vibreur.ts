/**
 * Le vibreur : le seul endroit qui fait vibrer le téléphone. Un navigateur qui ne sait pas vibrer ne fait rien, sans erreur.
 */

import { VIBRATIONS, type CleDeVibration } from '../ressources/vibrations';

/** Ce que le vibreur attend du navigateur : de quoi vibrer, s'il sait. */
export interface AvecVibreur {
  readonly vibrate?: (motif: number[]) => boolean;
}

export const creerLeVibreur = (navigateur: AvecVibreur) => ({
  vibrer(cle: CleDeVibration): void {
    navigateur.vibrate?.([...VIBRATIONS[cle]]);
  },
});
