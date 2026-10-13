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
import { lesDerniers, uneFoisPar } from '../memoire';
import type { Ecritoire } from './pieces';

const T = TABLEE.telephone;

/**
 * La pochette kraft du salon, le disque mystère dedans, et le QR code de la room imprimé dans le tiers qu'on en voit. Sa pastille
 * dit la piste qui vient, comme l'état de la room la donne.
 */
export function kraftDuSalon(a: Ecritoire, lien: string, etat: EtatDeLaPartie): Calque[] {
  const piste = numeroDeLaPiste(etat);
  // Faite une fois pour ce lien et cette piste : un joueur qui arrive ne la fait pas repeindre.
  return kraftsDe(a)(JSON.stringify([lien, piste]), () => kraftFaite(a, lien, piste));
}

/** Combien de kraft de salon récentes on garde toutes faites. */
const GARDEES = 2;
const kraftsDe = uneFoisPar((_a: Ecritoire) => lesDerniers<Calque[]>(GARDEES));

function kraftFaite(a: Ecritoire, lien: string, piste: ReturnType<typeof numeroDeLaPiste>): Calque[] {
  const place = kraftDeLaPiste(poseDeDepart(false));
  const k = { ...place, piste };
  const kraft = dessinerLaPochetteKraft(k, a.textes, a.encrier.largeur);
  const centre = surLaPochetteKraft(k, T.qr.en);
  const bandes = bandesDuQr(lien, T.qr.cote).map((b) => placer(b, { en: centre, angle: k.angle }));
  return [kraft.ombre, kraft.corps, kraft.devant, { ...aPlatSurLeMeuble('kraft-qr', KRAFT.tranche, [aplat(bandes, 'expresso', 1)]), role: 'decor' }];
}

/** La pochette kraft telle qu'elle attend au début d'une piste : ce qu'elle occupe sur le meuble, pour qu'on ne pose rien dessus. */
export function kraftAuRepos(a: Ecritoire): Calque[] {
  const kraft = dessinerLaPochetteKraft({ ...kraftDeLaPiste(poseDeDepart(false)), piste: { numero: 1, sur: 1 } }, a.textes, a.encrier.largeur);
  return [kraft.ombre, kraft.corps, kraft.devant];
}
