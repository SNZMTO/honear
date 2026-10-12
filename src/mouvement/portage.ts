/**
 * Le portage : une pièce lourde qu'une main mène de place en place. La main va vers chaque place comme un ressort qu'on lâche ;
 * la pièce la suit avec son inertie, par son propre ressort. Elle part donc sans à-coup, sa vitesse monte peu à peu, et elle arrive
 * sans heurt. Ses trajets s'ajoutent : si la main repart avant qu'elle soit arrivée, elle finit sa course tout en prenant la suivante,
 * et son chemin s'arrondit. Comme le ressort, tout se calcule d'un coup, pour n'importe quel instant.
 */

import { estCritique, FINESSE, pulsation, SEUIL_D_ARRIVEE, type Ressort } from './ressort';

/** Un trajet : à partir d'un instant, la main mène la pièce de tant plus loin (ou moins loin, si c'est négatif), par ce ressort. */
export interface Trajet {
  readonly a: number;
  readonly de: number;
  readonly main: Ressort;
}

/** Où est une pièce portée à chaque instant, et à quelle vitesse elle y passe. */
export interface Portage {
  readonly position: (t: number) => number;
  readonly vitesse: (t: number) => number;
}

/** Deux pulsations plus proches que cette part l'une de l'autre sont tenues pour égales : la formule générale y perd sa précision. */
const PRESQUE_EGALES = 1e-3;

/** La pulsation d'un ressort de portage : il doit rejoindre sa place au plus vite sans la dépasser, comme une main qui pose. */
function pulsationCritique(r: Ressort): number {
  if (!estCritique(r))
    throw new Error('Un portage ne connaît que des ressorts amortis au plus juste : une main qui porte ne dépasse pas, et ne traîne pas.');
  return pulsation(r);
}

/**
 * Ce qui reste d'un trajet, en part de sa longueur, `duree` secondes après son départ, et la vitesse à laquelle ce reste fond
 * (par seconde) : la réponse de deux ressorts à la suite, la main puis la pièce, de pulsations `a` et `b`.
 */
function resteDuTrajet(a: number, b: number, duree: number): { readonly reste: number; readonly fonte: number } {
  if (duree <= 0) return { reste: 1, fonte: 0 };
  if (Math.abs(a - b) <= PRESQUE_EGALES * Math.max(a, b)) {
    const w = (a + b) / 2;
    const x = w * duree;
    const e = Math.exp(-x);
    return { reste: e * (1 + x + (x * x) / 2 + (x * x * x) / 6), fonte: (-w * e * x * x * x) / 6 };
  }
  // Décomposition en éléments simples de a²b² / (s (s + a)² (s + b)²).
  const d = b - a;
  const [c1, c2] = [(b * b * (3 * a - b)) / (d * d * d), (-a * b * b) / (d * d)];
  const [d1, d2] = [(-a * a * (3 * b - a)) / (d * d * d), (-a * a * b) / (d * d)];
  const [ea, eb] = [Math.exp(-a * duree), Math.exp(-b * duree)];
  return {
    reste: -((c1 + c2 * duree) * ea + (d1 + d2 * duree) * eb),
    fonte: -((c2 - a * (c1 + c2 * duree)) * ea + (d2 - b * (d1 + d2 * duree)) * eb),
  };
}

/**
 * @param depart où est la pièce avant le premier trajet.
 * @param trajets ce que la main lui fait faire, dans l'ordre où elle part.
 * @param suit le ressort par lequel la pièce suit la main : plus il est mou, plus elle est lourde à lancer.
 */
export function porter(depart: number, trajets: readonly Trajet[], suit: Ressort): Portage {
  const b = pulsationCritique(suit);
  const menes = trajets.map((trajet) => ({ ...trajet, pulsation: pulsationCritique(trajet.main) }));
  return {
    position: (t) => menes.reduce((place, trajet) => place + trajet.de * (1 - resteDuTrajet(trajet.pulsation, b, t - trajet.a).reste), depart),
    vitesse: (t) => menes.reduce((vitesse, trajet) => vitesse - trajet.de * resteDuTrajet(trajet.pulsation, b, t - trajet.a).fonte, 0),
  };
}

/**
 * Le temps qu'il faut à une pièce portée pour arriver au bout d'un trajet : après lui, il lui en reste moins que `seuil`,
 * en part de sa longueur.
 */
export function tempsDArriveeDuPortage(main: Ressort, suit: Ressort, seuil = SEUIL_D_ARRIVEE): number {
  const [a, b] = [pulsationCritique(main), pulsationCritique(suit)];
  // Le reste ne fait que fondre : on cherche par moitiés l'instant où il passe sous le seuil.
  let [tot, tard] = [0, 40 / Math.min(a, b)];
  for (let pas = 0; pas < 60; pas++) {
    const milieu = (tot + tard) / 2;
    if (resteDuTrajet(a, b, milieu).reste > seuil) tot = milieu;
    else tard = milieu;
  }
  return tard;
}

/** Le temps qu'une pièce portée met à prendre sa plus grande vitesse : partie sans à-coup, elle ne va au plus vite qu'après. */
export function tempsDePointeDuPortage(main: Ressort, suit: Ressort): number {
  const [a, b] = [pulsationCritique(main), pulsationCritique(suit)];
  const jusqua = tempsDArriveeDuPortage(main, suit);
  let [pointe, plusVite] = [0, 0];
  for (let t = jusqua * FINESSE; t < jusqua; t += jusqua * FINESSE) {
    const fonte = -resteDuTrajet(a, b, t).fonte;
    if (fonte > plusVite) [plusVite, pointe] = [fonte, t];
  }
  return pointe;
}
