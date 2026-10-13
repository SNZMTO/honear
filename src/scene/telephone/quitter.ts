/**
 * La touche pour quitter la partie : petite, au coin haut gauche du cadre, en miroir du bouton du volume. Elle est là sur tous les
 * écrans d'une room, et se dessine avec le volume, par-dessus l'écran. Chez l'hôte, une autre la suit : « Autre playlist », qui ouvre
 * le bac ; dans le bac, « Retour ». Avant la room, à sa place, « Retour » ramène à l'étape d'avant (sa pochette, le bac, les réglages).
 * Dans le bac, dont le haut est pris par la caisse, elles descendent entre la caisse et ses crans.
 */

import { depuisLEcran } from '../../lowpoly/projection';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import type { Regard } from '../meuble';
import { dessinerUneTouche, largeurDeLaTouche } from '../touche';
import { DENSITE, type Ecritoire } from './pieces';

const Q = TABLEE.telephone.quitter;

/**
 * Un petit cran au coin haut gauche de ce regard, son bord gauche à tant du bord du cadre ; descendu de tant sous l'encoche. Ou, si
 * l'écran le demande (le bac, dont le haut est pris), à cette hauteur de la scène.
 */
function cranDuCoin(
  a: Ecritoire,
  regard: Regard,
  nom: `touche-${string}`,
  libelle: string,
  gauche: number,
  sousLEncoche: number,
  hauteur?: number,
): Calque {
  const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
  const support = PLATINE.socle.epaisseur;
  const y = hauteur ?? regard.origine[1] + Q.en[1] + sousLEncoche;
  const centre = depuisLEcran([regard.origine[0] + gauche + largeur / 2, y], support);
  return dessinerUneTouche({ nom, genre: 'cran', libelle, centre, support, etat: 'repos', ajustee: true }, DENSITE, a.encrier.largeur);
}

/**
 * La touche « Quitter », au coin haut gauche de ce regard. Elle s'appelle « touche-quitter ».
 * @param sousLEncoche ce que l'encoche de l'écran cache en haut, en px du regard : la touche descend d'autant.
 * @param hauteur la hauteur de la scène où la poser, si l'écran n'a pas son coin libre (le bac).
 */
export const toucheQuitter = (a: Ecritoire, regard: Regard, sousLEncoche = 0, hauteur?: number): Calque =>
  cranDuCoin(a, regard, 'touche-quitter', a.textes.partie.quitter, Q.en[0], sousLEncoche, hauteur);

/** « Retour », au coin haut gauche de ce regard, à la place de « Quitter », avant la room. Elle s'appelle « touche-revenir ». */
export const toucheRevenir = (a: Ecritoire, regard: Regard, sousLEncoche = 0, hauteur?: number): Calque =>
  cranDuCoin(a, regard, 'touche-revenir', a.textes.partie.retour, Q.en[0], sousLEncoche, hauteur);

/**
 * La touche de l'hôte, juste après « Quitter » : « Autre playlist » (« touche-autre-playlist »), ou, le bac ouvert, « Retour »
 * (« touche-fermer-bac »).
 */
export function toucheDeLHote(a: Ecritoire, regard: Regard, bacOuvert: boolean, sousLEncoche = 0, hauteur?: number): Calque {
  const quitter = largeurDeLaTouche({ genre: 'cran', libelle: a.textes.partie.quitter, ajustee: true }, a.encrier.largeur);
  const gauche = Q.en[0] + quitter + Q.ecart;
  return bacOuvert
    ? cranDuCoin(a, regard, 'touche-fermer-bac', a.textes.partie.retour, gauche, sousLEncoche, hauteur)
    : cranDuCoin(a, regard, 'touche-autre-playlist', a.textes.partie.autrePlaylist, gauche, sousLEncoche, hauteur);
}
