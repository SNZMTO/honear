/**
 * Le rejeu : une chorégraphie suivie par le moteur depuis son début, jusqu'à un instant. C'est ce que fait un écran qui l'a vue
 * de bout en bout, image après image, et ce que regardent une pellicule ou un test. Un écran, lui, tient son moteur et avance.
 */

import { creerLeMoteur, type Partition, type Tolerances } from './moteur';

export interface Rejeu {
  readonly tolerances: Tolerances;
  /** Le pas sur lequel on rejoue, en secondes : bien plus fin que le plus vif des gestes. */
  readonly pas: number;
  /** Ce qu'on rejoue avant le premier instant de la partition, au repos. */
  readonly avant: number;
}

/** Où en est chaque grandeur à l'instant t, la partition suivie depuis son début. */
export function rejouer<N extends string>(partition: Partition<N>, t: number, r: Rejeu): Readonly<Record<N, number>> {
  const moteur = creerLeMoteur<N>(r.tolerances);
  const depart = Math.min(t, partition.instants[0] ?? t) - r.avant;
  moteur.poser(partition, depart);
  for (let instant = depart; instant < t;) {
    instant = Math.min(t, instant + r.pas);
    moteur.avancer(partition, instant);
  }
  const noms = Object.keys(partition.consignes(t)) as N[];
  return Object.fromEntries(noms.map((nom) => [nom, moteur.valeur(nom)])) as Record<N, number>;
}
