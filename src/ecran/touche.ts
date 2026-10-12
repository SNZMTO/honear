/**
 * Les touches : ce qu'on a sous le doigt pour agir. L'action part à l'instant du toucher, l'animation suit ;
 * au clavier, elle part quand on valide.
 */

/**
 * Quand l'action d'une touche part.
 * « toucher » : dès que le doigt ou la souris se pose. C'est la règle des touches du jeu, dont les écrans ne défilent pas.
 * « toucherALaSouris » : dès que la souris se pose, mais quand le doigt se relève. Pour une touche posée sur une page qui défile :
 * un doigt qui s'y pose veut peut-être faire glisser la page, et l'on ne le sait qu'en le voyant se relever sur place.
 */
export type DepartDeTouche = 'toucher' | 'toucherALaSouris';

/** De quoi débrancher ce qu'on a branché : un écran qui s'en va ne laisse pas ses écouteurs derrière lui. */
export type Debrancher = () => void;

/** Écoute un événement sur une cible, et rend de quoi cesser de l'écouter. */
function ecouter<K extends keyof GlobalEventHandlersEventMap>(
  cible: GlobalEventHandlers,
  type: K,
  ecouteur: (evenement: GlobalEventHandlersEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Debrancher {
  cible.addEventListener(type, ecouteur, options);
  return () => cible.removeEventListener(type, ecouteur, options);
}

/** Branche une touche qu'on presse. */
export function brancherUneTouche(touche: HTMLElement, agir: () => void, depart: DepartDeTouche): Debrancher {
  if (typeof window.PointerEvent !== 'function') {
    // Un navigateur qui ne dit pas quand un doigt se pose : l'action part quand il se relève.
    return ecouter(touche, 'click', agir);
  }
  /** Vrai entre un toucher qui a déjà agi et le clic qui le suit : ce clic-là n'agit pas une seconde fois. */
  let dejaAgi = false;
  const auToucher = ecouter(touche, 'pointerdown', (toucher) => {
    // Un second doigt, un bouton droit : ce n'est pas un toucher de cette touche, et il ne change rien à celui qui est en cours.
    if (!toucher.isPrimary || toucher.button !== 0) return;
    dejaAgi = depart === 'toucher' || toucher.pointerType === 'mouse';
    if (dejaAgi) agir();
  });
  // Le clavier et les aides à la lecture valident sans pointeur : ce clic-là ne suit aucun toucher, et il agit toujours.
  const auClic = ecouter(touche, 'click', (clic) => {
    if (clic.detail === 0 || !dejaAgi) agir();
    dejaAgi = false;
  });
  return () => {
    auToucher();
    auClic();
  };
}

/**
 * Branche un cran : une touche qui est le libellé d'un bouton radio caché. Elle se presse comme une autre touche ; le clavier,
 * lui, passe par le bouton radio, qui dit lui-même quand il change. On retient le navigateur de lui donner le clavier à sa façon :
 * il ferait défiler la page pour le montrer, et elle sauterait sous le doigt.
 * @param choisir appelé chaque fois que ce cran est choisi, d'une façon ou d'une autre : parfois deux fois pour un seul geste.
 */
export function brancherUnCran(touche: HTMLElement, bouton: HTMLInputElement, choisir: () => void, depart: DepartDeTouche): Debrancher {
  const branches = [
    brancherUneTouche(touche, choisir, depart),
    ecouter(bouton, 'change', () => {
      if (bouton.checked) choisir();
    }),
    ecouter(touche, 'click', (clic) => {
      // Un clic né sur le bouton radio vient du clavier ou d'une aide à la lecture : le navigateur fait le reste, et bien.
      if (clic.target === bouton) return;
      clic.preventDefault();
      bouton.focus({ preventScroll: true });
    }),
  ];
  return () => branches.forEach((debrancher) => debrancher());
}

/**
 * Sur un téléphone, certains navigateurs ne montrent une touche enfoncée que si la page écoute les doigts qui se posent :
 * on écoute, sans rien faire. Une fois par page suffit.
 */
export const montrerLesTouchesEnfoncees = (): Debrancher => ecouter(document, 'touchstart', () => undefined, { passive: true });
