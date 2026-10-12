/**
 * La touche pour quitter la partie : petite, au coin haut gauche du cadre, en miroir du bouton du volume. Elle est là sur tous les
 * écrans d'une room, et se dessine avec le volume, par-dessus l'écran. Chez l'hôte, une autre la suit : « Autre playlist », qui ouvre
 * le bac ; dans le bac, « Retour ».
 */

import { depuisLEcran } from '../../lowpoly/projection';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import type { Regard } from '../meuble';
import { dessinerUneTouche, largeurDeLaTouche } from '../touche';
import { DENSITE, type Ecritoire } from './pieces';

const Q = TABLEE.telephone.quitter;

/** Un petit cran au coin haut gauche de ce regard, son bord gauche à tant du bord du cadre. */
function cranDuCoin(a: Ecritoire, regard: Regard, nom: `touche-${string}`, libelle: string, gauche: number): Calque {
  const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
  const support = PLATINE.socle.epaisseur;
  const centre = depuisLEcran([regard.origine[0] + gauche + largeur / 2, regard.origine[1] + Q.en[1]], support);
  return dessinerUneTouche({ nom, genre: 'cran', libelle, centre, support, etat: 'repos', ajustee: true }, DENSITE, a.encrier.largeur);
}

/** La touche « Quitter », au coin haut gauche de ce regard. Elle s'appelle « touche-quitter ». */
export const toucheQuitter = (a: Ecritoire, regard: Regard): Calque => cranDuCoin(a, regard, 'touche-quitter', a.textes.partie.quitter, Q.en[0]);

/**
 * La touche de l'hôte, juste après « Quitter » : « Autre playlist » (« touche-autre-playlist »), ou, le bac ouvert, « Retour »
 * (« touche-fermer-bac »).
 */
export function toucheDeLHote(a: Ecritoire, regard: Regard, bacOuvert: boolean): Calque {
  const quitter = largeurDeLaTouche({ genre: 'cran', libelle: a.textes.partie.quitter, ajustee: true }, a.encrier.largeur);
  const gauche = Q.en[0] + quitter + Q.ecart;
  return bacOuvert
    ? cranDuCoin(a, regard, 'touche-fermer-bac', a.textes.partie.retour, gauche)
    : cranDuCoin(a, regard, 'touche-autre-playlist', a.textes.partie.autrePlaylist, gauche);
}
