/**
 * L'ordre où une room joue les pistes de sa playlist : tiré au hasard à son ouverture, pour qu'une playlist ne se joue jamais
 * dans le même ordre. Les pistes se relisent à chaque lancer : l'ordre s'applique à la liste du moment.
 */

import type { Tirage } from '../regles/pochette';

/** Les rangs de 0 à n - 1, mélangés (Fisher-Yates). */
export function unOrdreAuHasard(n: number, tirage: Tirage): number[] {
  const ordre = Array.from({ length: n }, (_, rang) => rang);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(tirage() * (i + 1)));
    [ordre[i], ordre[j]] = [ordre[j] ?? j, ordre[i] ?? i];
  }
  return ordre;
}

/** Une liste dans cet ordre ; ce qu'elle a de plus que l'ordre ne connaît, à la suite. */
export function dansLOrdre<T>(liste: readonly T[], ordre: readonly number[]): T[] {
  const rangees = ordre.flatMap((rang) => (rang < liste.length ? [liste[rang] as T] : []));
  return [...rangees, ...liste.slice(ordre.length)];
}

/** L'ordre de la playlist elle-même : celui d'une partie écrite d'avance (le prototype), où l'on sait quelle piste vient. */
export const lOrdreDeLaPlaylist = (n: number): number[] => Array.from({ length: n }, (_, rang) => rang);
