/**
 * La glissade : ce qu'on lance sur le bois et que le frottement sec arrête net. Une pochette qui arrive, une étiquette qu'on tend,
 * la vraie pochette qui sort de sous la kraft. Elle part vite, perd sa vitesse à un rythme constant, et s'arrête d'un coup :
 * pas de ressort, pas de retour. Plus elle va loin, plus elle met de temps, mais moins que le double pour le double de chemin.
 * Comme le ressort et le volant, elle se calcule d'un coup pour n'importe quel instant.
 */

/** Le frottement sec d'une matière sur le bois : ce qu'il ôte à sa vitesse chaque seconde, en px par seconde carrée. */
export interface Frottement {
  readonly frein: number;
}

export interface Glissade {
  /** Le temps qu'elle met à s'arrêter, en secondes. */
  readonly duree: number;
  /** Ce qui la freine, en px/s² : ce qu'elle perd de vitesse à chaque seconde. */
  readonly frein: number;
  /** Le chemin fait à l'instant t depuis son départ, dans le sens du lancer : rien avant, tout après l'arrêt. */
  chemin(t: number): number;
  /** Sa vitesse à l'instant t : nulle avant le départ et après l'arrêt ; au départ, celle où on la lance. */
  vitesse(t: number): number;
  /** La part du chemin faite à l'instant t, de 0 à 1. */
  part(t: number): number;
}

/** Ce qu'il faut pour qu'une glissade, freinée par ce frottement, s'arrête au bout de ce chemin (qui peut être négatif). */
export function glisser(f: Frottement, distance: number): Glissade {
  const loin = Math.abs(distance);
  const sens = Math.sign(distance);
  const duree = Math.sqrt((2 * loin) / f.frein);
  const lancee = f.frein * duree;
  const fait = (t: number): number => (t <= 0 ? 0 : t >= duree ? loin : lancee * t - (f.frein * t * t) / 2);
  return {
    duree,
    frein: f.frein,
    chemin: (t) => sens * fait(t),
    vitesse: (t) => (t < 0 || t >= duree ? 0 : sens * (lancee - f.frein * t)),
    part: (t) => (loin === 0 ? 1 : fait(t) / loin),
  };
}
