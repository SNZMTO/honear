/**
 * Les polices embarquées dans une page : écrites en base 64 dans son script, elles se lisent sans rien demander au réseau.
 */

/**
 * @param enBase64 les polices, par nom de fichier : c'est la fabrication de la page qui les y met.
 * @returns de quoi lire une police par son nom, comme la scène le demande pour tracer ses textes.
 */
export function policesEmbarquees(enBase64: Readonly<Record<string, string>>): (fichier: string) => ArrayBuffer {
  return (fichier) => {
    const code = enBase64[fichier];
    if (code === undefined) throw new Error(`La police ${fichier} n'a pas été embarquée dans la page.`);
    const binaire = atob(code);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return octets.buffer;
  };
}
