/**
 * Les contours de base : arc, cercle, anneau, ellipse, rectangle droit ou arrondi, trait épais.
 * Tout ce qui est rond est un polygone régulier, avec assez de pans pour le paraître.
 */

import { auRang } from './boucle';
import { orienter, sansDoublons, type Polygone } from './polygones';
import { direction, fois, moins, plus, radians, tourner, unitaire, type Vec2 } from './vecteurs';

/** Points d'un arc de cercle, extrémités comprises. Il a toujours au moins un segment. */
export function arc(centre: Vec2, rayon: number, debut: number, fin: number, segments: number): Vec2[] {
  const nombre = Math.max(1, Math.round(segments));
  const points: Vec2[] = [];
  for (let i = 0; i <= nombre; i++) {
    const angle = debut + ((fin - debut) * i) / nombre;
    points.push(plus(centre, fois(direction(angle), rayon)));
  }
  return points;
}

/** Polygone régulier inscrit dans un cercle : c'est ainsi qu'on dessine tout ce qui est rond. */
export function cercle(centre: Vec2, rayon: number, pans: number, dephasage = 0): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < pans; i++) {
    points.push(plus(centre, fois(direction(dephasage + (360 * i) / pans), rayon)));
  }
  return points;
}

/** Un anneau : son bord extérieur dans un sens, son bord intérieur dans l'autre. Dessinés ensemble, ils laissent un trou. */
export const anneau = (centre: Vec2, rayonDehors: number, rayonDedans: number, pans: number): Vec2[][] => [
  cercle(centre, rayonDehors, pans),
  cercle(centre, rayonDedans, pans).reverse(),
];

/**
 * Rayon d'un polygone régulier une fois ses côtés rentrés d'une distance donnée :
 * c'est le bord intérieur d'un chanfrein, là où commence le dessus d'un objet rond.
 */
export const rayonRentre = (rayon: number, retrait: number, pans: number): number => rayon - retrait / Math.cos(Math.PI / pans);

/** Ellipse dont le grand axe peut être incliné. */
export function ellipse(centre: Vec2, rayons: Vec2, pans: number, inclinaison = 0): Vec2[] {
  return cercle([0, 0], 1, pans).map((p) => plus(centre, tourner([p[0] * rayons[0], p[1] * rayons[1]], inclinaison)));
}

/** Rectangle droit, donné par un coin et ses deux côtés. */
export const rectangle = (x: number, y: number, largeur: number, profondeur: number): Vec2[] => [
  [x, y],
  [x + largeur, y],
  [x + largeur, y + profondeur],
  [x, y + profondeur],
];

/** Rectangle aux coins arrondis, chaque coin découpé en petits pans. */
export function rectangleArrondi(x: number, y: number, largeur: number, profondeur: number, rayon: number, pansParCoin: number): Vec2[] {
  const r = Math.min(rayon, largeur / 2, profondeur / 2);
  if (r <= 0) return rectangle(x, y, largeur, profondeur);
  return sansDoublons([
    ...arc([x + largeur - r, y + r], r, -90, 0, pansParCoin),
    ...arc([x + largeur - r, y + profondeur - r], r, 0, 90, pansParCoin),
    ...arc([x + r, y + profondeur - r], r, 90, 180, pansParCoin),
    ...arc([x + r, y + r], r, 180, 270, pansParCoin),
  ]);
}

/**
 * Épaissit une ligne brisée en une forme aux bouts ronds : un sourcil, une mèche, un trait de crayon gras.
 * Aucun bout pointu : chaque extrémité est fermée par trois petits pans.
 */
export function trait(points: Polygone, epaisseur: number): Vec2[] {
  const demi = epaisseur / 2;
  const tangentes = points.map((_, i) => unitaire(moins(auRang(points, Math.min(points.length - 1, i + 1)), auRang(points, Math.max(0, i - 1)))));
  const cote = (signe: number): Vec2[] => points.map((p, i) => plus(p, fois([-auRang(tangentes, i)[1], auRang(tangentes, i)[0]], signe * demi)));
  const bout = (i: number, sens: number): Vec2[] => {
    const t = fois(auRang(tangentes, i), sens);
    const n: Vec2 = [-t[1], t[0]];
    return [-45, 0, 45].map((angle) =>
      plus(auRang(points, i), plus(fois(t, demi * Math.cos(radians(angle))), fois(n, demi * Math.sin(radians(angle))))),
    );
  };
  const dernier = points.length - 1;
  return orienter([...cote(-1), ...bout(dernier, 1), ...cote(1).reverse(), ...bout(0, -1)]);
}
