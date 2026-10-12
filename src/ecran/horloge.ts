/**
 * L'horloge : le seul endroit du site qui lit l'heure. Tout le reste reçoit un instant, en secondes, et ne sait pas d'où il vient :
 * de l'horloge du serveur en jeu, d'une horloge qu'on ralentit sur une planche.
 */

export interface Horloge {
  /**
   * L'instant présent, en secondes. Celle du navigateur ne recule jamais ; celle qu'on recale sur un serveur, ou qu'on remet
   * à l'heure pour rejouer, le peut : le moteur de mouvement sait l'un et l'autre (voir ses tolérances).
   */
  maintenant(): number;
}

/** L'horloge du navigateur : régulière, et sans rapport avec l'heure qu'il est. */
export const horlogeDuNavigateur = (): Horloge => ({ maintenant: () => performance.now() / 1000 });
