/**
 * Le plan : la scène à sa taille, posée dans un cadre de la page qui la montre à l'échelle de sa propre largeur.
 * Le cadre peut changer de largeur à tout moment (un téléphone qu'on tourne, une fenêtre qu'on étire) : le plan le suit.
 */

export interface Plan {
  /** L'élément à poser dans le cadre : c'est en lui qu'on monte la scène. */
  readonly element: HTMLElement;
  /**
   * Remet le plan à l'échelle du cadre, s'il a changé de largeur : à appeler à chaque image.
   * @returns l'échelle à laquelle le cadre montre la scène.
   */
  suivreLeCadre(): number;
}

/** @param taille celle de la scène, en px : le cadre en garde les proportions. */
export function poserUnPlan(cadre: HTMLElement, taille: { readonly largeur: number; readonly hauteur: number }): Plan {
  const element = document.createElement('div');
  element.style.cssText = `position:absolute;left:0;top:0;width:${taille.largeur}px;height:${taille.hauteur}px;transform-origin:0 0;`;
  // Le cadre porte le nom de la scène pour qui ne la voit pas : ses toiles et ses tracés n'ont rien à dire de plus.
  element.setAttribute('aria-hidden', 'true');
  let echelle: number | undefined;
  return {
    element,
    suivreLeCadre() {
      // Un cadre qui n'est pas encore dans la page n'a pas de largeur : la scène s'y montre à sa taille.
      const lue = cadre.clientWidth > 0 ? cadre.clientWidth / taille.largeur : 1;
      if (lue !== echelle) {
        echelle = lue;
        element.style.transform = `scale(${lue})`;
      }
      return lue;
    },
  };
}
