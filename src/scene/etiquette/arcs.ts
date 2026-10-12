/**
 * Les arcs d'une étiquette qui tourne : tant que le disque tourne, son texte est remplacé par des arcs concentriques
 * de longueurs inégales, comme une inscription emportée par la vitesse. Chaque ligne de texte s'étale le long de son cercle ;
 * ce qui tombe au même rayon se fond en un seul arc. Aucun arc ne fait le tour, et tous ont les bouts ronds.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { arc, trait } from '../../lowpoly/contours';
import { degres } from '../../lowpoly/vecteurs';
import { ETIQUETTE } from '../../ressources/etiquette';
import { HAUTEUR_DE_CAPITALE } from '../../ressources/typo';
import { aplat, type Aplat, type Mesure, type Texte } from '../calque';
import { CENTRE_DE_L_ETIQUETTE as CENTRE, echelleDEtiquette, type Etiquette } from './papier';

const A = ETIQUETTE.arcs;

/** Un arc de cercle autour du centre de l'étiquette : son rayon, et d'où à où il va, en degrés. */
interface Arc {
  readonly rayon: number;
  readonly de: number;
  readonly a: number;
}

/** Ce qu'une ligne de texte occupe sur l'étiquette : ses rayons, du pied au sommet de ses lettres, et son étendue autour du centre. */
interface Bande {
  readonly pied: number;
  readonly sommet: number;
  /** Angle où tombe le milieu de la ligne, et sa demi-étendue à un rayon donné, en degrés. */
  readonly milieu: number;
  readonly demiEtendue: (rayon: number) => number;
}

function bandeDUnTexte(texte: Texte, mesurer: Mesure): Bande {
  const largeur = mesurer(texte);
  const hauteur = texte.corps * (texte.role === 'titrage' ? A.minuscules : HAUTEUR_DE_CAPITALE);
  if (texte.arc !== undefined) {
    const { rayon, milieu, lecture } = texte.arc;
    const demi = degres(largeur / 2 / rayon);
    return { pied: rayon, sommet: lecture === 'dessus' ? rayon + hauteur : rayon - hauteur, milieu, demiEtendue: () => demi };
  }
  // Une ligne droite, centrée sur l'axe de l'étiquette : elle s'étale d'autant plus qu'elle est près du centre.
  const [, y] = texte.en;
  const vers = y <= 0 ? -1 : 1;
  const pied = Math.abs(y);
  return {
    pied,
    sommet: y <= 0 ? pied + hauteur : pied - hauteur,
    milieu: 90 * vers,
    demiEtendue: (rayon) => degres(Math.atan2(largeur / 2, rayon)),
  };
}

/** Réunit des intervalles d'angles qui se touchent, puis ôte au plus long ce qu'il faut pour qu'il ne fasse pas le tour. */
function reunir(intervalles: readonly (readonly [number, number])[]): [number, number][] {
  const ranges = [...intervalles].sort((p, q) => p[0] - q[0]);
  const reunis: [number, number][] = [];
  for (const [de, a] of ranges) {
    const dernier = reunis[reunis.length - 1];
    if (dernier !== undefined && de <= dernier[1]) dernier[1] = Math.max(dernier[1], a);
    else reunis.push([de, a]);
  }
  // Un intervalle qui déborde sur le premier en faisant le tour se fond avec lui.
  const [premier, dernier] = [reunis[0], reunis[reunis.length - 1]];
  if (premier !== undefined && dernier !== undefined && reunis.length > 1 && dernier[1] - 360 >= premier[0]) {
    premier[0] = dernier[0] - 360;
    reunis.pop();
  }
  return reunis.map(([de, a]): [number, number] => {
    const trop = a - de - (360 - A.jour);
    return trop > 0 ? [de + trop / 2, a - trop / 2] : [de, a];
  });
}

/**
 * Les arcs qui tiennent lieu des textes d'une étiquette.
 * @param allonge de combien chaque arc s'allonge de chaque côté de sa ligne, en degrés : [au moins, au plus].
 */
export function enArcs(e: Etiquette, textes: readonly Texte[], mesurer: Mesure, allonge: readonly [number, number]): Aplat[] {
  const echelle = echelleDEtiquette(e);
  const tirage = hasard(A.germe);
  // Les rayons où un arc peut passer : ceux que demande chaque ligne, puis ce qui tombe au même rayon se fond.
  const parRayon = new Map<number, { epaisseur: number; intervalles: [number, number][] }>();
  for (const texte of textes) {
    const bande = bandeDUnTexte(texte, mesurer);
    const hauteur = Math.abs(bande.sommet - bande.pied);
    const epaisseur = Math.max(A.epaisseur.auMoins * echelle, A.epaisseur.part * hauteur);
    for (const place of A.places) {
      // Deux lignes voisines partagent leurs rayons : on les arrondit sur une grille, et ce qui tombe au même rayon se fond.
      const pas = A.grille * echelle;
      const rayon = Math.round((bande.pied + (bande.sommet - bande.pied) * place) / pas) * pas;
      const demi = bande.demiEtendue(rayon);
      const piste = parRayon.get(rayon) ?? { epaisseur: 0, intervalles: [] };
      piste.epaisseur = Math.max(piste.epaisseur, epaisseur);
      piste.intervalles.push([bande.milieu - demi - tirage.entre(...allonge), bande.milieu + demi + tirage.entre(...allonge)]);
      parRayon.set(rayon, piste);
    }
  }
  const arcs: (Arc & { epaisseur: number })[] = [...parRayon].flatMap(([rayon, piste]) =>
    reunir(piste.intervalles).map(([de, a]) => ({ rayon, de, a, epaisseur: piste.epaisseur })),
  );
  if (arcs.length === 0) return [];
  // Un segment tous les six degrés au plus : l'arc reste rond, même au bord de l'étiquette.
  const contours = arcs.map((c) => trait(arc(CENTRE, c.rayon, c.de, c.a, Math.ceil((c.a - c.de) / 6)), c.epaisseur));
  const [premier] = textes;
  return premier === undefined ? [] : [aplat(contours, premier.teinte, premier.ton)];
}
