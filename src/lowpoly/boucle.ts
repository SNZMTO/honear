/**
 * Lecture d'une liste en boucle : le rang après le dernier est le premier.
 * C'est ce qu'il faut pour parcourir les sommets d'un polygone, qui se referme sur lui-même.
 */

/** Élément d'une liste à ce rang, compté en boucle. Jamais indéfini. */
export function auRang<T>(liste: readonly T[], rang: number): T {
  const n = liste.length;
  const valeur = liste[((rang % n) + n) % n];
  if (valeur === undefined) throw new Error('Liste vide : aucun élément à lire.');
  return valeur;
}
