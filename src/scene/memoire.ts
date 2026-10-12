/**
 * La mémoire de ce qui ne dépend que de ce qu'on lui donne : on le calcule la première fois qu'on le demande, et on le garde.
 * Une piste, une densité, un rayon ne changent jamais : ce qu'on en tire non plus.
 */

/** Pour ce qui dépend d'un objet : gardé tant que l'objet existe. */
export function uneFoisPar<C extends object, R>(calculer: (cle: C) => R): (cle: C) => R {
  const gardes = new WeakMap<C, { readonly valeur: R }>();
  return (cle) => {
    let garde = gardes.get(cle);
    if (garde === undefined) {
      garde = { valeur: calculer(cle) };
      gardes.set(cle, garde);
    }
    return garde.valeur;
  };
}

/** Pour ce qui dépend d'un nombre, quand il n'en vient qu'une poignée de différents : le rayon d'une pastille. */
export function uneFoisParNombre<R>(calculer: (cle: number) => R): (cle: number) => R {
  const gardes = new Map<number, { readonly valeur: R }>();
  return (cle) => {
    let garde = gardes.get(cle);
    if (garde === undefined) {
      garde = { valeur: calculer(cle) };
      gardes.set(cle, garde);
    }
    return garde.valeur;
  };
}
