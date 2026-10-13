/**
 * La touche pour quitter la partie : petite, au coin haut gauche du cadre, en miroir du bouton du volume. Elle est là sur les écrans
 * d'une room, et se dessine avec le volume, par-dessus l'écran ; chez l'hôte, « Autre playlist » la suit, qui ouvre le bac. Le bac
 * ouvert, ni l'une ni l'autre : il a son « Retour ». Avant la room, chaque étape a le sien, sur l'écran (voir `ecrans.ts`).
 */

import { depuisLEcran } from '../../lowpoly/projection';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import type { Regard } from '../meuble';
import { dessinerUneTouche, largeurDeLaTouche } from '../touche';
import { DENSITE, type Ecritoire } from './pieces';

const Q = TABLEE.telephone.quitter;

/** Un petit cran au coin haut gauche de ce regard, son bord gauche à tant du bord du cadre ; descendu de tant sous l'encoche. */
function cranDuCoin(a: Ecritoire, regard: Regard, nom: `touche-${string}`, libelle: string, gauche: number, sousLEncoche: number): Calque {
  const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
  const support = PLATINE.socle.epaisseur;
  const centre = depuisLEcran([regard.origine[0] + gauche + largeur / 2, regard.origine[1] + Q.en[1] + sousLEncoche], support);
  return dessinerUneTouche({ nom, genre: 'cran', libelle, centre, support, etat: 'repos', ajustee: true }, DENSITE, a.encrier.largeur);
}

/**
 * La touche « Quitter », au coin haut gauche de ce regard. Elle s'appelle « touche-quitter ».
 * @param sousLEncoche ce que l'encoche de l'écran cache en haut, en px du regard : la touche descend d'autant.
 */
export const toucheQuitter = (a: Ecritoire, regard: Regard, sousLEncoche = 0): Calque =>
  cranDuCoin(a, regard, 'touche-quitter', a.textes.partie.quitter, Q.en[0], sousLEncoche);

/** La touche de l'hôte, juste après « Quitter » : « Autre playlist » (« touche-autre-playlist »), qui ouvre le bac. */
export function toucheAutrePlaylist(a: Ecritoire, regard: Regard, sousLEncoche = 0): Calque {
  const quitter = largeurDeLaTouche({ genre: 'cran', libelle: a.textes.partie.quitter, ajustee: true }, a.encrier.largeur);
  return cranDuCoin(a, regard, 'touche-autre-playlist', a.textes.partie.autrePlaylist, Q.en[0] + quitter + Q.ecart, sousLEncoche);
}
