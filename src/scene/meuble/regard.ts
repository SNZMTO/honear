/**
 * Le regard : la portion du meuble qu'un écran laisse voir. On ne change jamais de page, on déplace le regard.
 */

import { depuisLEcran, surLEcran } from '../../lowpoly/projection';
import { moins, type Vec2 } from '../../lowpoly/vecteurs';
import { AMPLI } from '../../ressources/ampli';
import { BAC } from '../../ressources/bac';
import { CADRAGES } from '../../ressources/cadrages';
import { PLATINE } from '../../ressources/platine';
import type { Zone } from './noyer';

export interface Regard {
  /** Coin haut-gauche de ce qu'on voit, en px écran de la scène. */
  readonly origine: Vec2;
  readonly largeur: number;
  readonly hauteur: number;
}

/**
 * Le regard posé sur la platine, au téléphone : elle occupe la moitié haute, le disque sort du cadre par la gauche,
 * l'étiquette et la course du bras restent dedans. Le coin arrière droit du socle tombe aux marges du cadrage.
 */
export function regardSurLaPlatine(): Regard {
  const { largeur, hauteur, platine } = CADRAGES.telephone;
  const coin = surLEcran([PLATINE.position[0] + PLATINE.socle.largeur, PLATINE.position[1]], PLATINE.socle.epaisseur);
  return { origine: moins(coin, [largeur - platine.aDroite, platine.enHaut]), largeur, hauteur };
}

/** Le regard de l'écran de l'hôte : le meuble entier, du bord gauche du bac au bord droit de l'ampli, centré. Il ne glisse jamais. */
export function regardSurLeMeuble(): Regard {
  const { largeur, hauteur, haut } = CADRAGES.hote;
  const milieu = (BAC.position[0] + AMPLI.position[0] + AMPLI.coffre.largeur) / 2;
  return { origine: [milieu - largeur / 2, haut], largeur, hauteur };
}

/** Un point donné en px dans un regard, ramené sur le bois du meuble. */
export const surLeBois = (regard: Regard, x: number, y: number): Vec2 => depuisLEcran([regard.origine[0] + x, regard.origine[1] + y]);

/** La portion du bois qu'un regard laisse voir, avec une marge : c'est ce qu'il faut en dessiner. */
export function zoneVisible(regard: Regard, marge = 24): Zone {
  const coin = surLeBois(regard, -marge, -marge);
  const coinOppose = surLeBois(regard, regard.largeur + marge, regard.hauteur + marge);
  return { x: coin[0], y: coin[1], largeur: coinOppose[0] - coin[0], profondeur: coinOppose[1] - coin[1] };
}

/** Le même regard, élargi de ce dont il pourra glisser vers la gauche (négatif) ou vers la droite : toute l'étendue qu'il parcourra. */
export function etendueDuRegard(regard: Regard, glisse: number): Regard {
  return {
    origine: [regard.origine[0] + Math.min(0, glisse), regard.origine[1]],
    largeur: regard.largeur + Math.abs(glisse),
    hauteur: regard.hauteur,
  };
}
