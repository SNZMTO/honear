/**
 * Un compteur : la moyenne et le pire cas des dernières valeurs qu'on lui a notées. L'atelier s'en sert pour dire
 * ce que coûte une image, sans que la mesure d'il y a une minute pèse encore sur celle de maintenant.
 */

/** Le compte d'un compteur : sur combien de valeurs il porte, leur moyenne, et la plus grande. Sur aucune, il n'a rien à dire. */
export interface Compte {
  readonly sur: number;
  readonly moyenne: number;
  readonly auPire: number;
}

export interface Compteur {
  noter(valeur: number): void;
  /** Ce qu'il retient de ses dernières valeurs. */
  compte(): Compte;
}

const RIEN_DE_NOTE: Compte = { sur: 0, moyenne: 0, auPire: 0 };

/** @param fenetre le nombre de valeurs qu'il garde : les dernières. */
export function compteur(fenetre: number): Compteur {
  const valeurs: number[] = [];
  return {
    noter(valeur) {
      valeurs.push(valeur);
      if (valeurs.length > fenetre) valeurs.shift();
    },
    compte: () =>
      valeurs.length === 0
        ? RIEN_DE_NOTE
        : { sur: valeurs.length, moyenne: valeurs.reduce((somme, v) => somme + v, 0) / valeurs.length, auPire: Math.max(...valeurs) },
  };
}
