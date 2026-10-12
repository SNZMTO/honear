/**
 * Les disques de la finale : diamant pour le premier, platine pour le deuxième, or pour le troisième. Un disque d'apparat,
 * posé sur le bois, à cheval sur le coin de la pochette de celui qui le reçoit : sa matière en anneaux, son étiquette crème.
 * Le diamant, à la fin de son dernier tour, garde trois facettes allumées au ton le plus clair : c'est le seul éclat du jeu.
 */

import { cercle } from '../lowpoly/contours';
import { peindre, type FacettePeinte } from '../lowpoly/facette';
import { disque } from '../lowpoly/formes/disque';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Disque } from '../regles/partie';
import { RECOMPENSES } from '../ressources/recompenses';
import { calque, peinture, type Calque } from './calque';
import { ombre, ombreAuPied, reglerUneOmbre, type OmbreMobile } from './ombre';
import { glissement, visibilite, type Reglage } from './reglage';

export interface DisqueRemis {
  readonly ombre: Calque;
  readonly disque: Calque;
}

/** Ce qui bouge d'un disque qu'on remet : de combien il est encore en l'air (px visibles), et les facettes qu'un éclat allume. */
export interface PoseDuDisqueRemis {
  readonly leve?: number;
  /** Les rangs des facettes au ton le plus clair, de 0 au dernier pan ; par défaut, les trois du diamant arrêté. */
  readonly allumees?: readonly number[];
  /** Vrai pour un disque qu'on anime : il se règle sans se redessiner (voir `reglerUnDisqueRemis`). */
  readonly vivant?: boolean;
}

/** Le nombre de facettes de la couronne d'un disque remis : une par pan. L'éclat en fait le tour. */
export const FACETTES_DE_LA_COURONNE = RECOMPENSES.pans;

export function dessinerUnDisqueDeRecompense(
  genre: Disque,
  nom: `disque-${string}`,
  centre: Vec2,
  rayon: number,
  pose: PoseDuDisqueRemis = {},
): DisqueRemis {
  const R = RECOMPENSES;
  const matiere = R.matieres[genre];
  const maille = disque({
    centre,
    hauteur: R.epaisseur,
    pans: R.pans,
    anneaux: [
      { de: rayon, a: rayon * R.etiquette, teinte: matiere.teinte, fini: 'sillons' },
      { de: rayon * R.etiquette, a: 0, teinte: 'creme' },
    ],
  });
  let facettes: FacettePeinte[] = peindre(maille);
  // Le diamant garde trois facettes allumées, au ton le plus clair : celles qui font face à la lampe.
  // Pendant son dernier tour, c'est l'éclat qui dit lesquelles.
  const allumees = pose.allumees ?? (genre === 'diamant' ? R.eclats : []);
  const leve = pose.leve ?? 0;
  if (pose.vivant === true) {
    // Qu'on anime : chaque facette de la couronne a sa copie allumée, qu'on montre ou qu'on cache ; le disque descend d'un bloc,
    // et son ombre, mobile, se resserre à mesure.
    const allumables = facettes
      .slice(0, FACETTES_DE_LA_COURONNE)
      .map((f, rang) => calque(`${nom}/eclat-${rang}`, [peinture([{ ...f, ton: 4 }])], { opacite: allumees.includes(rang) ? 1 : 0 }));
    return {
      ombre: ombre(`${nom}/ombre`, ombreDuDisque(centre, rayon, leve)),
      disque: calque(nom, [peinture(facettes), ...allumables], { role: 'mobile', transformations: [{ genre: 'glisser', de: [0, -leve] }] }),
    };
  }
  if (allumees.length > 0) facettes = facettes.map((f, rang) => (allumees.includes(rang) ? { ...f, ton: 4 } : f));
  return {
    ombre: ombreAuPied(`${nom}/ombre`, { silhouettes: [cercle(centre, rayon, R.pans)], hauteur: R.epaisseur + leve, support: 0, paliers: 2 }),
    disque: calque(nom, [peinture(facettes)], { role: 'image', ...(leve !== 0 ? { transformations: [{ genre: 'glisser', de: [0, -leve] }] } : {}) }),
  };
}

/** L'ombre mobile d'un disque remis, à la hauteur où il est encore. */
const ombreDuDisque = (centre: Vec2, rayon: number, leve: number): OmbreMobile => ({
  en: centre,
  silhouettes: [cercle([0, 0], rayon, RECOMPENSES.pans)],
  hauteur: RECOMPENSES.epaisseur + leve,
  support: 0,
  paliers: 2,
});

/** Ce que le mouvement règle sur un disque remis dessiné vivant : sa hauteur, son ombre, et les facettes que l'éclat allume. */
export function reglerUnDisqueRemis(nom: `disque-${string}`, centre: Vec2, rayon: number, pose: PoseDuDisqueRemis): Reglage[] {
  const leve = pose.leve ?? 0;
  const allumees = pose.allumees ?? [];
  return [
    glissement(nom, 0, [0, -leve]),
    ...reglerUneOmbre(`${nom}/ombre`, ombreDuDisque(centre, rayon, leve)),
    ...Array.from({ length: FACETTES_DE_LA_COURONNE }, (_, rang) => visibilite(`${nom}/eclat-${rang}`, allumees.includes(rang))),
  ];
}
