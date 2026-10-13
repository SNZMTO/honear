/**
 * Les phrases à trous : un modèle venu d'un fichier de textes, dont chaque nom entre accolades est remplacé par sa valeur.
 * « Piste {numero} » devient « Piste 3 ». Aucune phrase n'est assemblée morceau par morceau dans le code.
 */

import type { Textes } from '../ressources/textes';

export function remplir(modele: string, valeurs: Readonly<Record<string, string | number>>): string {
  return modele.replace(/\{(\w+)\}/g, (_, nom: string) => {
    const valeur = valeurs[nom];
    if (valeur === undefined) throw new Error(`Le modèle « ${modele} » demande « ${nom} », qui n'est pas donné.`);
    return String(valeur);
  });
}

/** Des points, écrits avec leur unité : au singulier jusqu'à un (« 0 pt », « 1 pt »), au pluriel ensuite (« 2 pts »). */
export const pointsEcrits = (textes: Textes, points: number): string =>
  remplir(Math.abs(points) <= 1 ? textes.partie.unPoint : textes.partie.points, { points });
