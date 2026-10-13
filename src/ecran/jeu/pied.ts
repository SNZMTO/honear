/**
 * Le pied de la page, au téléphone, à l'accueil et au compte : le tutoriel et les pages légales, sous le jeu. On fait glisser la
 * page vers le haut pour l'y trouver, vers le bas pour le ranger. C'est la page qui suit le doigt, pas le navigateur qui la fait
 * défiler : l'iPhone ne la faisait pas défiler. Lâchée, elle se pose ouverte ou fermée, du côté le plus proche ; un toucher sur le
 * jeu, le pied ouvert, la referme.
 */

import { TELEPHONE } from '../../ressources/ecran';

/** Les millisecondes d'une seconde : les transitions de la page comptent en millisecondes, nos tables en secondes. */
const MS_PAR_SECONDE = 1000;

export interface PiedDeLaPage {
  /** Range le pied sur-le-champ, sans glisser : l'écran a changé. */
  ranger(): void;
  fermer(): void;
}

/**
 * @param page ce qui glisse : le cadre du jeu, et le pied dessous.
 * @param actif vrai quand la page a un pied à montrer (l'accueil et le compte, au téléphone).
 * @param sobre vrai quand on a demandé moins d'animations : elle se pose sans glisser.
 */
export function brancherLePied(page: HTMLElement, actif: () => boolean, sobre: boolean): PiedDeLaPage {
  /** De combien la page est montée, en px : de rien (le pied caché) à tout le pied, au-dessus du bas de l'écran. */
  let monte = 0;
  /** Le doigt posé : d'où il est parti, la page montée de tant ; et s'il la fait glisser. */
  let doigt: { readonly id: number; readonly x: number; readonly y: number; readonly depart: number; glisse: boolean } | undefined;

  /** Ce que la page a de plus que l'écran : le pied, et ce que le jeu a sous la barre de Safari. */
  const auPlus = (): number => Math.max(0, page.getBoundingClientRect().height - window.innerHeight);
  const montrer = (): void => {
    page.style.transform = monte > 0 ? `translateY(${-monte}px)` : '';
  };
  /** Pose la page, ouverte de tant, en glissant jusque-là (ou pas). */
  const poser = (a: number, glisser: boolean): void => {
    page.style.transition = glisser && !sobre ? `transform ${TELEPHONE.pied.pose * MS_PAR_SECONDE}ms ease-out` : '';
    monte = Math.min(auPlus(), Math.max(0, a));
    montrer();
  };

  const poserLeDoigt = (ev: PointerEvent): void => {
    if (!ev.isPrimary || !actif()) return;
    doigt = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, depart: monte, glisse: false };
  };
  const glisser = (ev: PointerEvent): void => {
    const d = doigt;
    if (d === undefined || ev.pointerId !== d.id) return;
    const [dx, dy] = [ev.clientX - d.x, d.y - ev.clientY];
    if (!d.glisse) {
      if (Math.abs(dy) <= TELEPHONE.doigt.glisse || Math.abs(dy) < Math.abs(dx)) return;
      d.glisse = true;
    }
    poser(d.depart + dy, false);
  };
  const leverLeDoigt = (ev: PointerEvent): void => {
    const d = doigt;
    if (d === undefined || ev.pointerId !== d.id) return;
    doigt = undefined;
    const max = auPlus();
    if (d.glisse) poser(monte > max / 2 ? max : 0, true);
    // Un toucher, le pied ouvert : on revient au jeu.
    else if (monte > 0 && ev.type === 'pointerup') poser(0, true);
  };
  // La fenêtre change (la barre de Safari, le téléphone qu'on tourne) : la page ne monte pas plus haut que son pied.
  const suivre = (): void => {
    if (monte > auPlus()) poser(auPlus(), false);
  };

  page.addEventListener('pointerdown', poserLeDoigt);
  page.addEventListener('pointermove', glisser);
  page.addEventListener('pointerup', leverLeDoigt);
  page.addEventListener('pointercancel', leverLeDoigt);
  window.addEventListener('resize', suivre);
  return {
    ranger() {
      doigt = undefined;
      poser(0, false);
    },
    fermer() {
      page.removeEventListener('pointerdown', poserLeDoigt);
      page.removeEventListener('pointermove', glisser);
      page.removeEventListener('pointerup', leverLeDoigt);
      page.removeEventListener('pointercancel', leverLeDoigt);
      window.removeEventListener('resize', suivre);
    },
  };
}
