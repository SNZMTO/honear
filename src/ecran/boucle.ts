/**
 * La boucle d'images : elle appelle ce qu'on lui confie une fois par image que le navigateur s'apprête à peindre.
 * Quand il n'y a plus rien à montrer, elle s'endort, et ne coûte plus rien ; on la réveille dès que quelque chose change.
 * Onglet caché, le navigateur ne peint plus et elle s'arrête d'elle-même ; au retour, c'est l'horloge qui dit où on en est.
 */

export interface Boucle {
  /** La relance si elle s'était endormie : à appeler dès que quelque chose a pu changer sans elle. Sans effet si elle tourne. */
  reveiller(): void;
  arreter(): void;
}

/** @param chaqueImage ce qu'il faut faire à chaque image. Rend faux quand tout est au repos : la boucle s'endort jusqu'à ce qu'on la réveille. */
export function lancerLaBoucle(chaqueImage: () => boolean): Boucle {
  let demande: number | undefined;
  let arretee = false;
  const demander = (): void => {
    if (demande === undefined && !arretee) demande = window.requestAnimationFrame(tourner);
  };
  const tourner = (): void => {
    demande = undefined;
    // Une image qui échoue ne fige pas la scène : on tentera la suivante.
    let encore = true;
    try {
      encore = chaqueImage();
    } finally {
      if (encore) demander();
    }
  };
  demander();
  return {
    reveiller: demander,
    arreter() {
      arretee = true;
      if (demande !== undefined) window.cancelAnimationFrame(demande);
      demande = undefined;
    },
  };
}
