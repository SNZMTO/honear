/**
 * Les vibrations, là où le téléphone le permet : une courte à une bonne réponse, une brève à chaque cran du gros bouton de l'ampli.
 * Des durées en millisecondes, tour à tour vibrées et tues, comme le téléphone les attend. Le jeu n'a pas d'autre bruit que la musique.
 */

export const VIBRATIONS = {
  bonneReponse: [24],
  cranDuVolume: [8],
  /** Une touche qu'on enfonce : un rien, sous le doigt. */
  touche: [6],
} as const satisfies Readonly<Record<string, readonly number[]>>;

export type CleDeVibration = keyof typeof VIBRATIONS;
