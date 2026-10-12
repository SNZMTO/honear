/**
 * Le volant : une masse qui tourne, qu'un moteur lance et que le frottement arrête. C'est le plateau et son disque.
 * Sa vitesse et l'angle qu'il parcourt se calculent d'un seul coup pour n'importe quelle durée :
 * un téléphone en retard retrouve le plateau où il doit être, sans rejouer ce qu'il a manqué.
 */

export interface Volant {
  /** Vitesse de croisière, en degrés par seconde. */
  readonly croisiere: number;
  /**
   * Le moteur : il pousse de tout son couple (une accélération, en degrés par seconde carrée) tant qu'il est loin
   * de sa vitesse, puis s'y accroche en douceur. `accrochage` est le temps propre de cette fin de course, en secondes.
   */
  readonly moteur: { readonly couple: number; readonly accrochage: number };
  /** Le frottement, moteur coupé : une part sèche (degrés par seconde carrée), qui l'arrête pour de bon, et une part visqueuse (par seconde). */
  readonly frottement: { readonly sec: number; readonly visqueux: number };
}

/** Ce qu'un volant a fait au bout d'une durée : sa vitesse (degrés par seconde), et l'angle parcouru depuis le départ (degrés). */
export interface Course {
  readonly vitesse: number;
  readonly angle: number;
}

/** Moteur en marche, en partant d'une vitesse donnée : plein couple, puis accrochage. Il ne dépasse jamais sa croisière. */
export function entrainer(volant: Volant, vitesse: number, duree: number): Course {
  const { croisiere, moteur } = volant;
  const t = Math.max(0, duree);
  // En dessous de ce seuil, le moteur donne tout son couple ; au-dessus, il s'accroche.
  const seuil = croisiere - moteur.couple * moteur.accrochage;
  const pleinCouple = vitesse < seuil ? Math.min(t, (seuil - vitesse) / moteur.couple) : 0;
  const auSeuil = vitesse + moteur.couple * pleinCouple;
  const lance = vitesse * pleinCouple + (moteur.couple * pleinCouple * pleinCouple) / 2;
  const reste = t - pleinCouple;
  if (reste <= 0) return { vitesse: auSeuil, angle: lance };
  // L'accrochage : l'écart à la croisière fond comme une exponentielle.
  const ecart = croisiere - auSeuil;
  const fonte = Math.exp(-reste / moteur.accrochage);
  return { vitesse: croisiere - ecart * fonte, angle: lance + croisiere * reste - ecart * moteur.accrochage * (1 - fonte) };
}

/** Un volant est dit lancé quand il a pris cette part de sa croisière : c'est ce qui permet de lire sa mise en vitesse en secondes. */
export const PART_DE_CROISIERE = 0.99;

/** Le temps que le moteur met à amener le volant, depuis l'arrêt, à cette part de sa croisière. */
export function tempsDeMiseEnVitesse(volant: Volant, part = PART_DE_CROISIERE): number {
  const { croisiere, moteur } = volant;
  const seuil = croisiere - moteur.couple * moteur.accrochage;
  if (part * croisiere <= seuil) return (part * croisiere) / moteur.couple;
  return seuil / moteur.couple + moteur.accrochage * Math.log((croisiere - seuil) / ((1 - part) * croisiere));
}

/** Le temps que le frottement met à faire tomber la vitesse d'une valeur à une autre, plus basse. */
export function tempsPourRalentir(volant: Volant, de: number, a = 0): number {
  const { sec, visqueux } = volant.frottement;
  if (a >= de) return 0;
  return visqueux === 0 ? (de - a) / sec : Math.log((de + sec / visqueux) / (a + sec / visqueux)) / visqueux;
}

/** Moteur coupé : le frottement use la vitesse, puis le volant s'arrête pour de bon, sans jamais repartir en arrière. */
export function laisserFiler(volant: Volant, vitesse: number, duree: number): Course {
  const { sec, visqueux } = volant.frottement;
  const t = Math.min(Math.max(0, duree), tempsPourRalentir(volant, vitesse));
  if (visqueux === 0) return { vitesse: vitesse - sec * t, angle: vitesse * t - (sec * t * t) / 2 };
  const plancher = sec / visqueux;
  const fonte = Math.exp(-visqueux * t);
  return { vitesse: Math.max(0, (vitesse + plancher) * fonte - plancher), angle: ((vitesse + plancher) * (1 - fonte)) / visqueux - plancher * t };
}
