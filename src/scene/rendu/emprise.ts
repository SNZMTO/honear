/**
 * L'emprise d'un dessin : le rectangle de l'écran qu'il occupe. C'est ce qui dit quelle taille donner à la toile
 * où on le fige, et ce qu'un regard laisse voir de lui.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Dessin, Mesure, Texte } from '../calque';
import { affineDeToutes, appliquer, composer, SANS_EFFET, type Affine } from './transformation';

export interface Emprise {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

/**
 * La place d'une ligne de texte autour de sa ligne de base, en parts du corps : de quoi loger les plus hautes lettres
 * et les jambages ; et, à chaque bout, un empattement qui déborde de la largeur mesurée.
 */
const AU_DESSUS = 1;
const AU_DESSOUS = 0.35;
const AUX_BOUTS = 0.1;

/** Les coins de ce qu'un texte occupe, dans le repère de son calque : large plutôt que juste. */
function coinsDUnTexte(texte: Texte, mesurer: Mesure): Vec2[] {
  if (texte.arc !== undefined) {
    // Un texte en arc tient dans le cercle de sa ligne de base, agrandi de la hauteur de ses lettres.
    const { centre, rayon } = texte.arc;
    const r = rayon + texte.corps * AU_DESSUS;
    return [
      [centre[0] - r, centre[1] - r],
      [centre[0] + r, centre[1] - r],
      [centre[0] + r, centre[1] + r],
      [centre[0] - r, centre[1] + r],
    ];
  }
  const largeur = mesurer(texte);
  const depart = texte.en[0] - (texte.ancrage === 'milieu' ? largeur / 2 : texte.ancrage === 'fin' ? largeur : 0);
  const [gauche, droite] = [depart - texte.corps * AUX_BOUTS, depart + largeur + texte.corps * AUX_BOUTS];
  const [haut, bas] = [texte.en[1] - texte.corps * AU_DESSUS, texte.en[1] + texte.corps * AU_DESSOUS];
  return [
    [gauche, haut],
    [droite, haut],
    [droite, bas],
    [gauche, bas],
  ];
}

/**
 * Le rectangle qu'occupent des dessins, une fois posés sous une transformation ; rien, s'ils ne dessinent rien.
 * @param avecLesCaches vrai pour compter aussi les calques cachés : ce qu'un dessin pourra occuper quand ils se montreront.
 */
export function empriseDe(dessins: readonly Dessin[], mesurer: Mesure, sous: Affine = SANS_EFFET, avecLesCaches = false): Emprise | undefined {
  /** Le rectangle que couvrent des points une fois posés sous une transformation. */
  const boiteDe = (points: readonly Vec2[], m: Affine): Emprise | undefined => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of points) {
      const [x, y] = appliquer(m, p);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return x1 < x0 ? undefined : { x: x0, y: y0, largeur: x1 - x0, hauteur: y1 - y0 };
  };
  const visiter = (dessin: Dessin, m: Affine): Emprise | undefined => {
    switch (dessin.genre) {
      case 'peinture':
        return boiteDe(
          dessin.facettes.flatMap((f) => f.contour),
          m,
        );
      case 'aplat':
        return boiteDe(dessin.contours.flat(), m);
      case 'texte':
        return boiteDe(coinsDUnTexte(dessin, mesurer), m);
      case 'calque': {
        if (!avecLesCaches && (dessin.opacite ?? 1) <= 0) return undefined;
        const dessous = composer(m, affineDeToutes(dessin.transformations ?? []));
        const contenu = dessin.contenu.reduce((cumul: Emprise | undefined, d) => reunir(cumul, visiter(d, dessous)), undefined);
        if (dessin.decoupe === undefined || contenu === undefined) return contenu;
        // Rien ne se voit hors de la découpe, qui est donnée avant les transformations du calque.
        const fenetre = boiteDe(dessin.decoupe.flat(), m);
        return fenetre === undefined ? undefined : croiser(contenu, fenetre);
      }
    }
  };
  return dessins.reduce((cumul: Emprise | undefined, dessin) => reunir(cumul, visiter(dessin, sous)), undefined);
}

/** Le plus petit rectangle qui en contient deux. */
export function reunir(a: Emprise | undefined, b: Emprise | undefined): Emprise | undefined {
  if (a === undefined || b === undefined) return a ?? b;
  const [x, y] = [Math.min(a.x, b.x), Math.min(a.y, b.y)];
  return { x, y, largeur: Math.max(a.x + a.largeur, b.x + b.largeur) - x, hauteur: Math.max(a.y + a.hauteur, b.y + b.hauteur) - y };
}

/** Ce que deux rectangles ont en commun ; rien, s'ils ne se touchent pas. */
export function croiser(a: Emprise, b: Emprise): Emprise | undefined {
  const [x, y] = [Math.max(a.x, b.x), Math.max(a.y, b.y)];
  const [largeur, hauteur] = [Math.min(a.x + a.largeur, b.x + b.largeur) - x, Math.min(a.y + a.hauteur, b.y + b.hauteur) - y];
  return largeur > 0 && hauteur > 0 ? { x, y, largeur, hauteur } : undefined;
}

/** Le même rectangle, avec une marge tout autour. */
export const agrandir = (e: Emprise, marge: number): Emprise => ({
  x: e.x - marge,
  y: e.y - marge,
  largeur: e.largeur + 2 * marge,
  hauteur: e.hauteur + 2 * marge,
});
