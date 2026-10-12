/**
 * La trame d'une piste : ce que chaque pièce a besoin d'en savoir pour écrire ses gestes, et de quoi les dater depuis un signal.
 */

import type { Consigne } from '../../../mouvement/moteur';
import type { Course } from '../../../mouvement/volant';
import type { Piste } from '../../../regles/piste';
import type { PisteEnScene } from '../etat';
import { instantsDeLaPiste, type InstantsDeLaPiste, type Signal } from '../instants';
import { regimeDuPlateau } from '../plateau';
import { rayuresDeLaPiste, type Rayure } from '../rayures';
import type { CoupDeLaPiste, Depart, Geste, Grandeur, NomDeGeste, OptionsDeGestes, Porteur } from './vocabulaire';

/** Un signal de la piste : la rayure n'en est pas un, elle a le sien à chaque mauvaise réponse. */
type SignalDeLaPiste = Exclude<Signal, 'rayure'>;

/**
 * La trame d'une piste : ce que chaque pièce a besoin d'en savoir pour écrire ses gestes. Ses instants, ses rayures, son plateau,
 * et de quoi dater un geste ou un coup depuis un signal : comptés de la même façon, les deux tombent au même instant, exactement.
 */
export interface Trame extends OptionsDeGestes {
  readonly piste: Piste;
  readonly T: InstantsDeLaPiste;
  readonly rayures: readonly Rayure[];
  /** Ce que fait le plateau à l'instant t. */
  readonly plateau: (t: number) => Course;
  /** Un geste qui part tant de secondes après un signal. */
  readonly au: (signal: SignalDeLaPiste, apres: number, consigne: Consigne, nom?: NomDeGeste, porte?: Porteur) => Geste;
  /** Un coup donné tant de secondes après un signal. */
  readonly coupAu: (signal: SignalDeLaPiste, apres: number, grandeur: Grandeur, vitesse: number, nom?: NomDeGeste) => CoupDeLaPiste;
}

export function tramer(scene: PisteEnScene, piste: Piste, o: OptionsDeGestes): Trame {
  const T = instantsDeLaPiste(piste);
  const depart = (signal: SignalDeLaPiste, apres: number, nom?: NomDeGeste): Depart & { readonly a: number } => ({
    a: T[signal] + apres,
    signal,
    apres,
    ...(nom !== undefined ? { nom } : {}),
  });
  return {
    ...o,
    piste,
    T,
    rayures: rayuresDeLaPiste(scene),
    plateau: (t) => regimeDuPlateau(piste, t),
    au: (signal, apres, consigne, nom, porte) => ({ ...depart(signal, apres, nom), consigne, ...(porte !== undefined ? { porte } : {}) }),
    coupAu: (signal, apres, grandeur, vitesse, nom) => ({ ...depart(signal, apres, nom), grandeur, vitesse }),
  };
}

/** Les gestes qu'une rayure ajoute à une grandeur, de sa prise à la rayure suivante, qui lui coupe court. */
export const aChaqueRayure = (
  rayures: readonly Rayure[],
  gestes: (rayure: Rayure) => readonly (readonly [apres: number, consigne: Consigne, nom: NomDeGeste])[],
): Geste[] =>
  rayures.flatMap((rayure) =>
    gestes(rayure)
      .map(([apres, consigne, nom]): Geste => ({ a: rayure.a + apres, consigne, signal: 'rayure', apres, nom }))
      .filter((geste) => geste.a < rayure.jusqua),
  );
