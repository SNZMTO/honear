/**
 * Une chorégraphie : pour chaque grandeur, la suite de ses étapes, écrite une seule fois. La partition que suit le moteur
 * s'en déduit : la consigne de chaque grandeur à tout instant, et les instants où il doit s'arrêter.
 */

import type { Consigne, Coup, Partition } from './moteur';

/** Une étape : à partir d'un instant, la consigne d'une grandeur. Un instant qu'on ne connaît pas encore est rejeté à jamais. */
export interface Etape {
  readonly a: number;
  readonly consigne: Consigne;
}

/** Le rôle d'une grandeur : sa consigne avant que rien ne commence, puis ses étapes, dans l'ordre où elles arrivent. */
export interface Role<E extends Etape = Etape> {
  readonly depart: Consigne;
  readonly etapes: readonly E[];
}

/** La consigne d'un rôle à l'instant t : celle de la dernière de ses étapes qui a commencé. */
export function consigneDuRole(role: Role, t: number): Consigne {
  let consigne = role.depart;
  for (const etape of role.etapes) {
    if (etape.a > t) break;
    consigne = etape.consigne;
  }
  return consigne;
}

/**
 * La partition d'une chorégraphie. Elle rend à chaque instant les consignes mêmes de ses étapes, jamais des copies :
 * le moteur sait ainsi, d'un coup d'œil, lesquelles ont changé.
 * @param coups les coups donnés en chemin ; ceux dont on ne connaît pas encore l'instant sont laissés de côté.
 */
export function partitionDe<N extends string>(roles: Readonly<Record<N, Role>>, coups: readonly Coup<N>[] = []): Partition<N> {
  const noms = Object.keys(roles) as N[];
  const instants = noms.flatMap((nom) => roles[nom].etapes.map((etape) => etape.a)).filter(Number.isFinite);
  return {
    consignes: (t) => {
      const consignes = {} as Record<N, Consigne>;
      for (const nom of noms) consignes[nom] = consigneDuRole(roles[nom], t);
      return consignes;
    },
    instants: [...new Set(instants)].sort((a, b) => a - b),
    coups: coups.filter((coup) => Number.isFinite(coup.a)),
  };
}
