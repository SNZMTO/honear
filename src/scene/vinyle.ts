/**
 * Le vinyle d'un disque : un plot sombre dont le dessus est fait d'anneaux. Du bord vers le centre : le bourrelet,
 * la plage d'entrée, les plages gravées et leurs entre-plages, la plage de sortie, et le vinyle nu sous l'étiquette.
 * Ses facettes rayonnent depuis le centre, et ses deux secteurs clairs restent fixes sous la lampe : il ne tourne jamais,
 * c'est son étiquette qui tourne. Il se dessine à l'échelle qu'on veut : sur la platine, et en grand derrière le logo.
 */

import { auRang } from '../lowpoly/boucle';
import { cercle } from '../lowpoly/contours';
import type { Maille } from '../lowpoly/facette';
import type { Anneau } from '../lowpoly/formes/disque';
import { plot } from '../lowpoly/formes/plot';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Densite } from '../ressources/densites';
import { ETIQUETTE } from '../ressources/etiquette';
import { PLATINE } from '../ressources/platine';

const D = PLATINE.disque;

export interface Vinyle {
  readonly centre: Vec2;
  /** Hauteur de sa face du dessus au-dessus du bois, en px visibles. */
  readonly dessus: number;
  /** Sa taille par rapport au disque de la platine : 1 par défaut. */
  readonly echelle?: number;
  /**
   * Pour une face dont le centre n'est pas fait comme d'ordinaire : le rayon où finissent les sillons,
   * et celui de ce qui tient lieu d'étiquette, à l'échelle du disque de la platine.
   */
  readonly centreDeFace?: { readonly sortie: number; readonly etiquette: number };
}

/**
 * Une plage gravée : des anneaux de sillons, que séparent des passages plus serrés, fins et un ton plus sombre.
 * Quelques anneaux de tons voisins suffisent à suggérer les sillons. D'une plage à la suivante, les passages changent de place.
 */
function anneauxDUnePlage(de: number, largeur: number, passages: number, rang: number, echelle: number): Anneau[] {
  const poids = Array.from({ length: passages + 1 }, (_, i) => auRang(D.sillons, i + rang));
  const total = poids.reduce((somme, p) => somme + p, 0);
  const serre = D.passageSerre * echelle;
  const grave = largeur - passages * serre;
  const anneaux: Anneau[] = [];
  let rayon = de;
  poids.forEach((part, i) => {
    const vers = rayon - (grave * part) / total;
    anneaux.push({ de: rayon, a: vers, teinte: 'vinyle', fini: 'sillons' });
    rayon = vers;
    if (i < passages) {
      anneaux.push({ de: rayon, a: rayon - serre, teinte: 'vinyle', fini: 'sillons', nuance: -1 });
      rayon -= serre;
    }
  });
  return anneaux;
}

/** Les anneaux du dessus, à partir du rayon où finit le chanfrein du bord. */
function anneauxDuDessus(densite: Densite, rayonDuDessus: number, echelle: number, centre: { sortie: number; etiquette: number }): Anneau[] {
  if (densite.plages > D.plages.length) throw new Error(`Le disque n'a que ${D.plages.length} plages : la densité en demande ${densite.plages}.`);
  const durees = D.plages.slice(0, densite.plages);
  const total = durees.reduce((somme, duree) => somme + duree, 0);
  const entrePlages = D.entrePlages * echelle;
  const grave = (D.entree - centre.sortie) * echelle - entrePlages * (densite.plages - 1);
  const anneaux: Anneau[] = [
    // Le bourrelet du bord est mat : il fait la transition entre la tranche et le vinyle qui brille.
    { de: rayonDuDessus, a: D.bourrelet * echelle, teinte: 'vinyle' },
    { de: D.bourrelet * echelle, a: D.entree * echelle, teinte: 'vinyle', fini: 'vinyleLisse' },
  ];
  let rayon = D.entree * echelle;
  durees.forEach((duree, rang) => {
    const largeur = (grave * duree) / total;
    anneaux.push(...anneauxDUnePlage(rayon, largeur, densite.passagesSerres, rang, echelle));
    rayon -= largeur;
    if (rang < durees.length - 1) {
      anneaux.push({ de: rayon, a: rayon - entrePlages, teinte: 'vinyle', fini: 'sillons', nuance: -1 });
      rayon -= entrePlages;
    }
  });
  const sousLePapier = centre.etiquette * ETIQUETTE.recouvrement * echelle;
  anneaux.push({ de: centre.sortie * echelle, a: sousLePapier, teinte: 'vinyle', fini: 'vinyleLisse' }, { de: sousLePapier, a: 0, teinte: 'vinyle' });
  return anneaux;
}

/** Contour au sol d'un vinyle : le même sert à son volume et à son ombre. */
export const contourDuVinyle = (v: Pick<Vinyle, 'centre' | 'echelle'>, densite: Densite): Vec2[] =>
  cercle(v.centre, D.rayon * (v.echelle ?? 1), densite.pansDeDisque);

export function vinyle(v: Vinyle, densite: Densite): Maille {
  const echelle = v.echelle ?? 1;
  const epaisseur = D.epaisseur * echelle;
  return plot({
    centre: v.centre,
    base: v.dessus - epaisseur,
    epaisseur,
    rayon: D.rayon * echelle,
    pans: densite.pansDeDisque,
    chanfrein: D.chanfrein * echelle,
    teinte: 'vinyle',
    dessus: (rayon) => anneauxDuDessus(densite, rayon, echelle, v.centreDeFace ?? { sortie: D.sortie, etiquette: D.etiquette }),
  });
}
