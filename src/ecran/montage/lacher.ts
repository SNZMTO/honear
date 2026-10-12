/**
 * Lâcher ce qu'on retire d'une scène montée : ses éléments quittent la page, et leurs toiles rendent ce qu'elles peuvent.
 */

/**
 * Lâche les toiles de ce qu'on retire de la page : ces éléments, et tout ce qu'ils contiennent. Une toile où l'on a peint rend
 * sa mémoire dès qu'elle n'a plus de taille. Une toile qui ne fait que montrer une image figée (voir toile.ts), elle, ne la rend
 * qu'au passage du ramasse-miettes : mesuré dans Chromium, où la mémoire de vingt scènes remontées coup sur coup ne revient qu'alors.
 */
export function lacherLesToiles(retires: readonly Element[]): void {
  const estUneToile = (element: Element): element is HTMLCanvasElement => element.tagName.toLowerCase() === 'canvas';
  for (const retire of retires) {
    const toiles = estUneToile(retire) ? [retire] : Array.from(retire.querySelectorAll('canvas'));
    for (const toile of toiles) toile.width = toile.height = 0;
  }
}

/** Retire des éléments de la page, et lâche leurs toiles. */
export function retirer(elements: readonly Element[]): void {
  lacherLesToiles(elements);
  for (const element of elements) element.remove();
}
