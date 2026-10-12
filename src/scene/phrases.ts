/**
 * Les phrases à trous : un modèle venu d'un fichier de textes, dont chaque nom entre accolades est remplacé par sa valeur.
 * « Piste {numero} » devient « Piste 3 ». Aucune phrase n'est assemblée morceau par morceau dans le code.
 */

export function remplir(modele: string, valeurs: Readonly<Record<string, string | number>>): string {
  return modele.replace(/\{(\w+)\}/g, (_, nom: string) => {
    const valeur = valeurs[nom];
    if (valeur === undefined) throw new Error(`Le modèle « ${modele} » demande « ${nom} », qui n'est pas donné.`);
    return String(valeur);
  });
}
