/**
 * La partition d'une piste : ce que suit le moteur de mouvement. Elle se déduit des gestes de la piste, et donne la consigne
 * de chaque grandeur à tout instant de l'horloge du serveur : un téléphone en retard y lit où en sont les choses,
 * sans rejouer ce qu'il a manqué.
 */

import { partitionDe } from '../../mouvement/choregraphie';
import type { Partition } from '../../mouvement/moteur';
import type { PisteEnScene } from './etat';
import { gestesDeLaPiste } from './gestes';
import { AVEC_TOUT, type Grandeur, type OptionsDeGestes } from './gestes/vocabulaire';

export function partitionDeLaPiste(scene: PisteEnScene, o: OptionsDeGestes = AVEC_TOUT): Partition<Grandeur> {
  const { roles, coups } = gestesDeLaPiste(scene, o);
  return partitionDe(roles, coups);
}
