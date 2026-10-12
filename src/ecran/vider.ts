/**
 * Vider un élément de la page : le geste est écrit pour les navigateurs d'il y a cinq ans comme pour ceux d'aujourd'hui.
 */

/** Retire d'un élément tout ce qu'il contient, et le rend, prêt à recevoir autre chose. */
export function vider<E extends Element>(element: E): E {
  while (element.firstChild !== null) element.removeChild(element.firstChild);
  return element;
}
