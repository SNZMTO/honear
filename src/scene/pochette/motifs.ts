/**
 * Les motifs imprimés au fond des pochettes. Un motif est une entrée de ce registre : sa fonction de dessin,
 * et les nuances de la couleur de fond qu'il emploie. Il s'imprime à plat, en tons voisins.
 */

import { facetteAPlat, type Maille } from '../../lowpoly/facette';
import type { Nuance } from '../../lowpoly/ombrage';
import { placer } from '../../lowpoly/polygones';
import { polaire, type Vec2 } from '../../lowpoly/vecteurs';
import type { NomDeTeinte } from '../../ressources/palette';
import { DESSIN_DES_MOTIFS as D, type Motif } from '../../ressources/pochettes';

interface DessinDeMotif {
  /** Les nuances du fond que le motif emploie : un texte imprimé par-dessus doit se lire sur chacune. */
  readonly nuances: readonly Nuance[];
  /** Dessine le motif autour d'un centre, pour une pochette de ce côté centrée sur l'origine. Il sera rogné ensuite. */
  readonly dessiner: (fond: NomDeTeinte, centre: Vec2, cote: number) => Maille;
}

/**
 * Des rayons qui partent de derrière la tête, un sur deux un ton plus sombre.
 * Leur nombre ; d'où ils partent et jusqu'où ils vont, en parts du côté de la pochette. Ils démarrent d'un cœur plein : aucune pointe au centre.
 */
const RAYONS = { nombre: 16, coeur: 0.08, bord: 1.3 } as const;

const rayons: DessinDeMotif = {
  nuances: [0, -1],
  dessiner: (fond, centre, cote) =>
    Array.from({ length: RAYONS.nombre }, (_, i) => {
      const a0 = (360 * i) / RAYONS.nombre - 90 - 180 / RAYONS.nombre;
      const a1 = a0 + 360 / RAYONS.nombre;
      const [coeur, bord] = [cote * RAYONS.coeur, cote * RAYONS.bord];
      const contour = [polaire(centre, coeur, a0), polaire(centre, bord, a0), polaire(centre, bord, a1), polaire(centre, coeur, a1)];
      return facetteAPlat(contour, 0, fond, rayons.nuances[i % rayons.nuances.length]);
    }),
};

/** Deux nuances, une rangée sur deux : celles de tous les motifs. */
const NUANCES: readonly Nuance[] = [0, -1];

/** Des bandes droites, un peu penchées, une sur deux un ton plus sombre. */
const rayures: DessinDeMotif = {
  nuances: NUANCES,
  dessiner: (fond, centre, cote) => {
    const largeur = cote * D.rayure;
    const nombre = Math.ceil((cote * 1.6) / largeur);
    return Array.from({ length: nombre }, (_, i) => {
      const y = -cote * 0.8 + i * largeur;
      const bande: Vec2[] = [
        [-cote, y],
        [cote, y],
        [cote, y + largeur],
        [-cote, y + largeur],
      ];
      return facetteAPlat(placer(bande, { en: centre, angle: D.angleDesRayures }), 0, fond, NUANCES[i % NUANCES.length]);
    });
  },
};

/** Un damier droit : une case sur deux un ton plus sombre. */
const damier: DessinDeMotif = {
  nuances: NUANCES,
  dessiner: (fond, centre, cote) => {
    const c = cote * D.case;
    // Assez de cases pour couvrir la pochette autour de la tête, qui n'est pas tout à fait au centre.
    const n = Math.ceil((cote * D.etendue) / c);
    const cases = [];
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++) {
        const [x, y] = [centre[0] + i * c - c / 2, centre[1] + j * c - c / 2];
        const carre: Vec2[] = [
          [x, y],
          [x + c, y],
          [x + c, y + c],
          [x, y + c],
        ];
        cases.push(facetteAPlat(carre, 0, fond, NUANCES[(((i + j) % 2) + 2) % 2]));
      }
    return cases;
  },
};

/**
 * Des anneaux concentriques autour de la tête, un sur deux un ton plus sombre : chacun fait de quadrilatères, aucune pointe.
 * Seuls ceux qui tiennent entiers dans la pochette sont imprimés : un anneau rogné par le bord y laisserait des éclats.
 * La pochette est centrée sur l'origine ; au-delà du dernier anneau, il reste le fond.
 */
const cercles: DessinDeMotif = {
  nuances: NUANCES,
  dessiner: (fond, centre, cote) => {
    const largeur = cote * D.anneau;
    const place = cote / 2 - Math.max(Math.abs(centre[0]), Math.abs(centre[1]));
    const anneaux = Math.floor(place / largeur);
    const facettes = [];
    for (let k = 0; k < anneaux; k++) {
      const [r0, r1] = [Math.max(cote * RAYONS.coeur, k * largeur), (k + 1) * largeur];
      // Plus l'anneau est grand, plus il a de pans : chacun reste à peu près aussi long qu'il est large.
      const pans = Math.min(D.pansDesCercles, Math.max(D.pansAuMoins, Math.round((2 * Math.PI * r1) / (2 * largeur))));
      for (let i = 0; i < pans; i++) {
        const [a0, a1] = [(360 * i) / pans, (360 * (i + 1)) / pans];
        facettes.push(
          facetteAPlat([polaire(centre, r0, a0), polaire(centre, r1, a0), polaire(centre, r1, a1), polaire(centre, r0, a1)], 0, fond, NUANCES[k % 2]),
        );
      }
    }
    return facettes;
  },
};

export const MOTIFS: Readonly<Record<Motif, DessinDeMotif>> = { rayons, rayures, damier, cercles };
