/**
 * Le cadre de téléphone de la page, tenu ajusté à sa place : aussi grand qu'elle le permet, jamais plus que sa taille
 * de téléphone, toujours à ses proportions. La place ne dépend pas de lui : c'est la page qui la donne, et elle peut changer
 * à tout moment (un téléphone qu'on tourne, une fenêtre qu'on étire, un avis qui se retire).
 */

import { CADRAGES } from '../../../ressources/cadrages';
import { ANCRES } from '../ancres';

const { largeur: LARGEUR, hauteur: HAUTEUR } = CADRAGES.telephone;

export interface CadreAjuste {
  /** Cesse de l'ajuster, et lui rend la taille que la page lui donne d'elle-même : pour un cadre qui n'aura pas de scène. */
  lacher(): void;
}

/**
 * @param place l'élément qui dit la place : le cadre y est avec ce qui l'accompagne (ses bords, la ligne d'état sous lui).
 * @param auChangement appelé chaque fois que la place a pu changer, une fois le cadre ajusté.
 */
export function tenirLeCadreAjuste(place: HTMLElement, cadre: HTMLElement, auChangement: () => void): CadreAjuste {
  const ajuster = (): void => {
    // Ce que le cadre et ce qui l'accompagne prennent en plus de ce qu'il montre.
    const poste = cadre.parentElement ?? cadre;
    const autour = { enLarge: cadre.offsetWidth - cadre.clientWidth, enHaut: poste.offsetHeight - cadre.clientHeight };
    const auPlus = Math.min(LARGEUR, place.clientWidth - autour.enLarge, ((place.clientHeight - autour.enHaut) * LARGEUR) / HAUTEUR);
    // Une largeur entière : la scène s'y met à l'échelle sans laisser un filet vide sur son bord.
    place.style.setProperty(ANCRES.largeurDuCadre, `${Math.max(0, Math.floor(auPlus))}px`);
    auChangement();
  };
  ajuster();
  const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(ajuster) : undefined;
  if (observateur !== undefined) observateur.observe(place);
  else window.addEventListener('resize', ajuster);
  return {
    lacher() {
      if (observateur !== undefined) observateur.disconnect();
      else window.removeEventListener('resize', ajuster);
      place.style.removeProperty(ANCRES.largeurDuCadre);
    },
  };
}
