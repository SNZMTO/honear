/**
 * La touche pour quitter la partie : petite, au coin haut gauche du cadre, en miroir du bouton du volume. Elle est là sur tous les
 * écrans d'une room, et se dessine avec le volume, par-dessus l'écran.
 */

import { depuisLEcran } from '../../lowpoly/projection';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import type { Regard } from '../meuble';
import { dessinerUneTouche, largeurDeLaTouche } from '../touche';
import { DENSITE, type Ecritoire } from './pieces';

const Q = TABLEE.telephone.quitter;

/** La touche « Quitter », au coin haut gauche de ce regard. Elle s'appelle « touche-quitter ». */
export function toucheQuitter(a: Ecritoire, regard: Regard): Calque {
  const libelle = a.textes.partie.quitter;
  const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
  const support = PLATINE.socle.epaisseur;
  const centre = depuisLEcran([regard.origine[0] + Q.en[0] + largeur / 2, regard.origine[1] + Q.en[1]], support);
  return dessinerUneTouche(
    { nom: 'touche-quitter', genre: 'cran', libelle, centre, support, etat: 'repos', ajustee: true },
    DENSITE,
    a.encrier.largeur,
  );
}
