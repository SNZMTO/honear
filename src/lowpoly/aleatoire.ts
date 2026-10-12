/**
 * Hasard reproductible : le même germe redonne toujours le même dessin.
 * Aucun appel à Math.random dans le rendu, sinon recharger la page changerait le meuble.
 */

export interface Hasard {
  /** Nombre dans [0, 1[. */
  suivant(): number;
  /** Nombre dans [min, max[. */
  entre(min: number, max: number): number;
}

export function hasard(germe: number): Hasard {
  let etat = germe >>> 0;
  const suivant = (): number => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { suivant, entre: (min, max) => min + (max - min) * suivant() };
}
