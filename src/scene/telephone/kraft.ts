/**
 * La pochette kraft du salon, telle que le téléphone la montre : le disque mystère dedans, et le QR code de la room imprimé dans
 * le tiers qu'on en voit. À part de la platine : seul le salon a besoin de quoi écrire un QR code.
 */

import { placer } from '../../lowpoly/polygones';
import { numeroDeLaPiste, type EtatDeLaPartie } from '../../regles/partie';
import { KRAFT } from '../../ressources/kraft';
import { TABLEE } from '../../ressources/tablee';
import { aplat, aPlatSurLeMeuble, type Calque } from '../calque';
import { dessinerLaPochetteKraft, surLaPochetteKraft } from '../kraft';
import { kraftDeLaPiste } from '../piste/pieces';
import { poseDeDepart } from '../piste/reglages';
import { bandesDuQr } from '../qr';
import type { Ecritoire } from './pieces';

const T = TABLEE.telephone;

/**
 * La pochette kraft du salon, le disque mystère dedans, et le QR code de la room imprimé dans le tiers qu'on en voit. Sa pastille
 * dit la piste qui vient, comme l'état de la room la donne.
 */
export function kraftDuSalon(a: Ecritoire, lien: string, etat: EtatDeLaPartie): Calque[] {
  const place = kraftDeLaPiste(poseDeDepart(false));
  const k = { ...place, piste: numeroDeLaPiste(etat) };
  const kraft = dessinerLaPochetteKraft(k, a.textes, a.encrier.largeur);
  const centre = surLaPochetteKraft(k, T.qr.en);
  const bandes = bandesDuQr(lien, T.qr.cote).map((b) => placer(b, { en: centre, angle: k.angle }));
  return [kraft.ombre, kraft.corps, kraft.devant, { ...aPlatSurLeMeuble('kraft-qr', KRAFT.tranche, [aplat(bandes, 'expresso', 1)]), role: 'decor' }];
}
