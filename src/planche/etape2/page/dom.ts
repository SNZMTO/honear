/**
 * La page, vue du script : retrouver les éléments que le gabarit y a écrits, par leurs ancres, et y écrire un texte.
 * Ce qu'on y cherche doit y être, tel qu'on l'attend : sinon le gabarit et le script ne parlent plus de la même page, et on le dit.
 */

import { TEXTES } from '../../../ressources/textes.fr';
import { remplir } from '../../../scene/phrases';
import { espacer } from '../../../scene/typographie';

/** @throws si la page n'a pas d'élément de ce nom. */
export function element(id: string): HTMLElement {
  const trouve = document.getElementById(id);
  if (trouve === null) throw new Error(`La page n'a pas d'élément « ${id} ».`);
  return trouve;
}

/** Une touche de la page, et la valeur qu'elle tient : un moment, une vitesse, un verso. */
export interface ToucheDeValeur<V> {
  readonly valeur: V;
  readonly touche: HTMLElement;
}

/**
 * Range des touches par la valeur que chacune tient : une touche par valeur attendue, ni plus ni moins.
 * @param sorte ce que sont ces touches, pour le dire si elles ne sont pas celles qu'on attend.
 * @param ecrite ce que le gabarit écrit dans la page pour une touche (`String`, comme lui).
 * @throws si une touche porte ce qu'on ne sait pas brancher, si une valeur n'a pas sa touche, ou en a deux.
 */
function unePar<V extends string | number, T>(
  sorte: string,
  attendues: readonly V[],
  trouvees: readonly T[],
  ecrite: (trouvee: T) => string | null,
): readonly (T & { readonly valeur: V })[] {
  for (const trouvee of trouvees)
    if (!attendues.some((attendue) => String(attendue) === ecrite(trouvee)))
      throw new Error(`La page a une touche « ${sorte} » qu'on ne sait pas brancher : ${ecrite(trouvee)}.`);
  return attendues.map((valeur) => {
    const [laSienne, ...deTrop] = trouvees.filter((trouvee) => ecrite(trouvee) === String(valeur));
    if (laSienne === undefined) throw new Error(`La page n'a pas de touche « ${sorte} » pour « ${valeur} ».`);
    if (deTrop.length > 0) throw new Error(`La page a ${deTrop.length + 1} touches « ${sorte} » pour « ${valeur} ».`);
    return { ...laSienne, valeur };
  });
}

/** Les touches de la page qui portent cet attribut, dans l'ordre des valeurs attendues : chacune a la sienne, une seule. */
export function touchesQuiPortent<V extends string | number>(attribut: string, attendues: readonly V[]): readonly ToucheDeValeur<V>[] {
  const touches = Array.from(document.querySelectorAll<HTMLElement>(`[${attribut}]`)).map((touche) => ({ touche }));
  return unePar(attribut, attendues, touches, ({ touche }) => touche.getAttribute(attribut));
}

/** Un cran : un bouton radio caché, et son libellé, qui est la touche qu'on presse. */
export interface Cran<V> extends ToucheDeValeur<V> {
  readonly bouton: HTMLInputElement;
}

/** Les crans d'un groupe de boutons radio, dans l'ordre des valeurs attendues : chacune a le sien, un seul, et son libellé autour de lui. */
export function cransDuGroupe<V extends string | number>(groupe: string, attendues: readonly V[]): readonly Cran<V>[] {
  const crans = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${groupe}"]`)).map((bouton) => {
    const touche = bouton.closest('label');
    if (touche === null) throw new Error(`Un cran « ${groupe} » de la page n'a pas de libellé : ${bouton.value}.`);
    return { bouton, touche };
  });
  return unePar(groupe, attendues, crans, ({ bouton }) => bouton.value);
}

/** Une phrase à trous de l'atelier, remplie, avec les espaces que le français ne coupe pas. */
export const dire = (modele: string, valeurs: Readonly<Record<string, string | number>> = {}): string =>
  espacer(remplir(modele, valeurs), TEXTES.typographie);

/** Écrit un texte dans un élément, seulement s'il a changé : la page n'est pas remise en forme pour rien. */
export function ecrireDans(cible: Element | null, texte: string): void {
  if (cible !== null && cible.textContent !== texte) cible.textContent = texte;
}
