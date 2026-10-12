/**
 * Les chutes d'une piste : ce qui descend sur un amortisseur et que ce qui le reçoit arrête net. La consigne d'une grandeur
 * qui tombe ainsi, et le coup qui l'arrête.
 */

import { descendre, tempsDeDescente, type Amortisseur } from '../../../mouvement/chute';
import { trajectoire, type Consigne } from '../../../mouvement/moteur';
import type { Ressort } from '../../../mouvement/ressort';
import type { Porteur } from './vocabulaire';

/** Ce qui descend sur un amortisseur, de tant de px, et que ce qui le reçoit arrête net : le bras sur le disque, la pastille sur le socle. */
export interface Chute {
  readonly amortisseur: Amortisseur;
  readonly hauteur: number;
}

export const porteParSaChute = (chute: Chute): Porteur => ({ genre: 'chute', ...chute });

/**
 * La consigne d'une grandeur qui suit une chute depuis un instant, d'une valeur à une autre. Elle n'y est pas arrêtée :
 * c'est ce qui la reçoit qui l'arrête, d'un coup, et sa vitesse d'arrivée se lit ainsi jusqu'au dernier instant.
 */
export function quiTombe(chute: Chute, depuis: number, de: number, a: number, suit: Ressort): Consigne {
  const parPx = (a - de) / chute.hauteur;
  return trajectoire(
    (t) => de + parPx * descendre(chute.amortisseur, t - depuis).chemin,
    suit,
    (t) => parPx * descendre(chute.amortisseur, t - depuis).vitesse,
  );
}

/** La vitesse qu'il faut rendre à cette grandeur, à son arrivée, pour qu'elle s'arrête net : l'opposée de celle où sa chute l'a menée. */
export const pourLArreterNet = (chute: Chute, de: number, a: number): number =>
  ((de - a) / chute.hauteur) * descendre(chute.amortisseur, tempsDeDescente(chute.amortisseur, chute.hauteur)).vitesse;
