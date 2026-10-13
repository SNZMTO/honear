/**
 * Les vraies pochettes, au téléphone : l'image que la source donne d'un titre, posée dans une couche de la page par-dessus ce qu'on a
 * dessiné à sa place (sa vignette, en attendant), de travers et écrasée comme lui ; à la révélation, au milieu du disque retourné,
 * et sur le dos des titres joués. Chacune ne se montre qu'une fois chargée ; si elle ne vient pas, la vignette reste.
 */

import { couleur } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Regard } from '../../scene/meuble';

/**
 * Une image posée par-dessus la scène : son adresse, son centre et son côté en px dans le regard, ses coins, son angle, son écrasement ;
 * et le trou de l'axe, en part de son côté, si elle est posée sur un disque.
 */
export interface ImagePosee {
  readonly adresse: string;
  readonly centre: Vec2;
  readonly cote: number;
  readonly coin?: number;
  readonly angle?: number;
  readonly ecrasement: number;
  readonly trou?: number;
}

/** Une part d'une longueur, en pourcentage, pour poser une image dans le cadre quelle que soit sa taille. */
const part = (longueur: number, totale: number): string => `${(longueur / totale) * 100}%`;

/** Le trou de l'axe, en part du côté de l'image : son masque se donne en part du rayon. */
const DIAMETRE = 200;

/**
 * Les images d'une couche, qui ne prend pas le doigt : à chaque appel, celles qu'on veut, dans ce regard, à la place des précédentes ;
 * celles qui étaient déjà là ne se rechargent pas.
 */
export function poserDesImages(couche: HTMLElement): (posees: readonly ImagePosee[], r: Regard) => void {
  couche.style.pointerEvents = 'none';
  const images: HTMLImageElement[] = [];
  /** Une image de plus, cachée tant qu'elle n'a pas chargé celle qu'on lui demande. */
  function nouvelleImage(): HTMLImageElement {
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.hidden = true;
    image.addEventListener('load', () => {
      image.hidden = image.getAttribute('src') !== image.dataset['pour'];
    });
    image.addEventListener('error', () => {
      image.hidden = true;
    });
    couche.append(image);
    images.push(image);
    return image;
  }
  return (posees, r) => {
    const voulues = posees.filter((p) => p.adresse.startsWith('https://'));
    for (const [rang, p] of voulues.entries()) {
      const image = images[rang] ?? nouvelleImage();
      const { centre, cote, coin = 0, angle = 0, ecrasement, trou } = p;
      // Le trou de l'axe : l'axe de la platine passe au travers de l'image, comme au travers du papier.
      const plein = couleur('vinyle');
      const masque =
        trou !== undefined ? `radial-gradient(circle closest-side,transparent ${trou * DIAMETRE}%,${plein} ${trou * DIAMETRE}%)` : undefined;
      const style =
        `position:absolute;left:${part(centre[0] - cote / 2, r.largeur)};top:${part(centre[1] - cote / 2, r.hauteur)};` +
        `width:${part(cote, r.largeur)};height:${part(cote, r.hauteur)};border-radius:${part(coin, cote)};object-fit:cover;` +
        `transform:scaleY(${ecrasement}) rotate(${angle}deg);transform-origin:50% 50%;` +
        (masque !== undefined ? `-webkit-mask-image:${masque};mask-image:${masque};` : '');
      if (image.dataset['pour'] === p.adresse && image.dataset['place'] === style) continue;
      image.dataset['place'] = style;
      image.style.cssText = style;
      if (image.dataset['pour'] === p.adresse) continue;
      image.hidden = true;
      image.dataset['pour'] = p.adresse;
      image.src = p.adresse;
    }
    for (const image of images.slice(voulues.length)) {
      image.hidden = true;
      image.removeAttribute('src');
      delete image.dataset['pour'];
      delete image.dataset['place'];
    }
  };
}
