/**
 * La chute freinée : ce qui descend sous son poids, retenu par un amortisseur. C'est le bras qu'on lâche sur son levier :
 * il part sans à-coup, prend une vitesse lente qu'il garde, et touche à cette vitesse.
 * Comme le ressort et le volant, elle se calcule d'un coup pour n'importe quelle durée.
 */

export interface Amortisseur {
  /** La vitesse de descente quand le poids et le frein s'équilibrent, par seconde. */
  readonly vitesse: number;
  /** Le temps propre de la mise en vitesse, en secondes : plus il est court, plus la descente part franchement. */
  readonly elan: number;
}

/** Ce dont il est descendu au bout d'une durée, et la vitesse à laquelle il descend alors. */
export function descendre(a: Amortisseur, duree: number): { readonly chemin: number; readonly vitesse: number } {
  const t = Math.max(0, duree);
  const pris = 1 - Math.exp(-t / a.elan);
  return { chemin: a.vitesse * (t - a.elan * pris), vitesse: a.vitesse * pris };
}

/** Le temps qu'il met à descendre d'une hauteur donnée. */
export function tempsDeDescente(a: Amortisseur, hauteur: number): number {
  if (hauteur <= 0) return 0;
  // La descente ne fait que s'accélérer vers sa vitesse d'équilibre : partie de cette borne, la méthode de Newton tombe juste en quelques pas.
  let t = hauteur / a.vitesse + a.elan;
  for (let pas = 0; pas < 8; pas++) {
    const { chemin, vitesse } = descendre(a, t);
    t -= (chemin - hauteur) / vitesse;
  }
  return t;
}
