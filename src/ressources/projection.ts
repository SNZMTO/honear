/**
 * La projection : une seule pour tout le meuble, sans point de fuite.
 * Une vue de dessus écrasée d'environ 12 % en hauteur, qui laisse voir l'épaisseur des objets.
 */

export const PROJECTION = {
  /** Ce que devient 1 px de profondeur du meuble à l'écran : un cercle devient une ellipse de 1 × 0,88. */
  ecrasement: 0.88,
} as const;
