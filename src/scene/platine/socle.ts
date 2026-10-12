/**
 * Le socle de la platine : une boîte en laque vert bouteille, ses vis, ses charnières, son ombre sur le bois.
 * Rien n'y bouge : tout part dans le décor.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { rectangle, rectangleArrondi } from '../../lowpoly/contours';
import { facetteAPlat, peindre } from '../../lowpoly/facette';
import { boiteChanfreinee, contourDeBoite, prisme } from '../../lowpoly/formes/boite';
import { disque } from '../../lowpoly/formes/disque';
import { orienter, placer, rentrer, type Polygone } from '../../lowpoly/polygones';
import { surLEcran } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { peinture, type Dessin } from '../calque';
import { uneFoisPar } from '../memoire';
import { ombreAuPied } from '../ombre';
import { HAUTEURS, surLeSocle } from './emplacements';

/**
 * Une vis à tête fendue : une couronne très légèrement bombée, un cœur plat, une fente en creux.
 * @param hauteur celle de la laque où elle est vissée : par défaut, le dessus du socle. L'ampli a les mêmes.
 */
export function vis(centre: Vec2, angleDeFente: number, densite: Densite, hauteur: number = HAUTEURS.socle): Dessin[] {
  const { rayon, monte, plat, fente } = PLATINE.vis;
  const tete = disque({
    centre,
    hauteur,
    pans: densite.pansDePetitRond,
    anneaux: [
      { de: rayon, a: rayon * plat, teinte: 'alu', monte },
      { de: rayon * plat, a: 0, teinte: 'alu' },
    ],
  });
  const longueur = rayon * fente.longueur;
  const creux = placer(rectangle(-longueur / 2, -fente.largeur / 2, longueur, fente.largeur), { en: centre, angle: angleDeFente });
  return [peinture(peindre(tete)), peinture(peindre([facetteAPlat(creux, hauteur + monte, 'alu', -1)]))];
}

/** Le contour du socle, dans le plan du meuble. */
const contourDuSocle: (densite: Densite) => Polygone = uneFoisPar((densite) => {
  const { socle } = PLATINE;
  const [x, y] = PLATINE.position;
  return rectangleArrondi(x, y, socle.largeur, socle.profondeur, socle.rayon, densite.pansDeCoin);
});

/**
 * Le dessus du socle, tel qu'on le voit : sa face plane, en deçà de son chanfrein. Une ombre portée sur le socle s'arrête là :
 * au-delà, c'est le bois, plus bas, et déjà dans l'ombre du socle.
 */
export const dessusDuSocle: (densite: Densite) => readonly Polygone[] = uneFoisPar((densite) => [
  rentrer(orienter(contourDuSocle(densite)), PLATINE.socle.chanfrein).map((p) => surLEcran(p, HAUTEURS.socle)),
]);

export function dessinerLeSocle(densite: Densite): Dessin[] {
  const { socle, charnieres } = PLATINE;
  const contour = contourDuSocle(densite);

  // Les fentes des vis ne sont jamais alignées : chacune a été serrée à la main.
  const tirage = hasard(PLATINE.vis.germe);
  const r = PLATINE.vis.retrait;
  const coins: Vec2[] = [
    [r, r],
    [socle.largeur - r, r],
    [r, socle.profondeur - r],
    [socle.largeur - r, socle.profondeur - r],
  ];

  const { axe } = charnieres;
  const boitesDeCharniere = charnieres.x.map((cx) => {
    const [bx, by] = surLeSocle([cx, charnieres.y]);
    return { x: bx, y: by, largeur: charnieres.largeur, profondeur: charnieres.profondeur, rayon: charnieres.rayon, pansParCoin: 2 };
  });
  /** L'axe d'une charnière, couché au milieu de sa platine. */
  const axeDe = (b: (typeof boitesDeCharniere)[number]): Dessin =>
    peinture(
      peindre(
        boiteChanfreinee({
          x: b.x + (b.largeur - axe.longueur) / 2,
          y: b.y + (b.profondeur - axe.profondeur) / 2,
          largeur: axe.longueur,
          profondeur: axe.profondeur,
          rayon: axe.rayon,
          pansParCoin: 2,
          base: HAUTEURS.socle + charnieres.epaisseur,
          epaisseur: axe.epaisseur,
          chanfrein: axe.chanfrein,
          teinte: 'alu',
        }),
      ),
    );

  return [
    ombreAuPied('socle/ombre', { silhouettes: [contour], hauteur: socle.epaisseur, support: 0 }),
    peinture(peindre(prisme({ contour, base: 0, epaisseur: socle.epaisseur, chanfrein: socle.chanfrein, teinte: 'laque' }))),
    ...coins.flatMap((coin) => vis(surLeSocle(coin), tirage.entre(0, 180), densite)),
    ...boitesDeCharniere.flatMap((b, i) => [
      ombreAuPied(`charniere-${i + 1}/ombre`, {
        silhouettes: [contourDeBoite(b)],
        hauteur: charnieres.epaisseur,
        support: HAUTEURS.socle,
        paliers: 2,
      }),
      peinture(
        peindre(
          boiteChanfreinee({ ...b, base: HAUTEURS.socle, epaisseur: charnieres.epaisseur, chanfrein: charnieres.chanfrein, teinte: 'expresso' }),
        ),
      ),
      axeDe(b),
    ]),
  ];
}
