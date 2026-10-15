/**
 * La fenêtre du jeu, quelle que soit sa taille : le regard la remplit toujours. Deux dispositions, rien entre elles : une fenêtre
 * de téléphone (ou de tablette debout) montre l'écran du téléphone, élargi juste ce qu'il faut ; une fenêtre d'ordinateur (ou de
 * tablette couchée), le meuble entier, du bac à l'ampli, le même d'un écran à l'autre. Les écrans du téléphone y gardent leur place
 * sur le meuble ; ce qu'ils ne montrent pas du meuble (le bac, la platine, l'ampli) y est posé au repos, s'il se voit en entier ; et
 * sur un ordinateur, ce qu'on y touche se range sous le vinyle.
 */

import { surLEcran } from '../../lowpoly/projection';
import { BAC } from '../../ressources/bac';
import { GRAND_ECRAN, TELEPHONE } from '../../ressources/ecran';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import type { PlaceDuClassement } from '../classement';
import { regardSurLeMeuble, type Regard } from '../meuble';
import { CENTRE_DU_PLATEAU } from '../platine';
import { empriseDe } from '../rendu/emprise';
import type { Mesure } from '../calque';
import { ampliDessine, bacDessine, platineArretee } from './meuble';
import { SUR_LA_PLATINE, type Ecritoire } from './pieces';

const MEUBLE: Regard = regardSurLeMeuble();
/** Le haut du grand regard : celui du meuble entier, au-dessus des intercalaires du bac ; celui du téléphone s'il est plus haut. */
const HAUT = Math.min(MEUBLE.origine[1], SUR_LA_PLATINE.origine[1]);
/** Le bas du grand regard : celui du téléphone, sous ce qu'on touche. */
const BAS = SUR_LA_PLATINE.origine[1] + SUR_LA_PLATINE.hauteur;

/** La hauteur du regard sur un grand écran, en px de la scène. */
export const HAUTEUR_DU_GRAND_ECRAN = BAS - HAUT;
/** La largeur du meuble entier, avec ses marges. */
export const LARGEUR_DU_MEUBLE = MEUBLE.largeur;
/** Au téléphone, ce qu'on ne montre pas du bois au-dessus de la platine (voir `TELEPHONE.boisAuDessus`). */
const ROGNE = TELEPHONE.boisAuDessus;
/** Le regard de cet écran est-il celui du téléphone posé sur la platine (le seul qu'on rogne en haut) ? */
const surLaPlatine = (ecran: Regard): boolean => ecran.origine[0] === SUR_LA_PLATINE.origine[0] && ecran.origine[1] === SUR_LA_PLATINE.origine[1];
/** La proportion d'une fenêtre de téléphone : celle du regard du téléphone, rogné. */
export const PROPORTION_DU_TELEPHONE = SUR_LA_PLATINE.largeur / (SUR_LA_PLATINE.hauteur - ROGNE);

/** La disposition d'une fenêtre de cette proportion (sa largeur sur sa hauteur) : l'écran du téléphone, ou le meuble entier. */
export type Disposition = 'telephone' | 'ordinateur';
export const dispositionDe = (proportion: number): Disposition => (proportion >= GRAND_ECRAN.ordinateur ? 'ordinateur' : 'telephone');

/** Où en est une fenêtre de cette proportion : l'écran du téléphone (0) ou le meuble entier (1), jamais entre les deux. */
export const ouverture = (proportion: number): number => (dispositionDe(proportion) === 'ordinateur' ? 1 : 0);

/**
 * Le regard qui remplit une fenêtre de cette proportion, posé sur un écran du téléphone, sans bande nulle part. Au téléphone, il
 * commence sur la table, au-dessus de la platine ; une fenêtre plus étroite (un téléphone plus long) garde sa largeur, et descend
 * plus bas sur la table ; une plus large (une tablette debout) garde sa hauteur, et voit de la table de chaque côté. Sur un
 * ordinateur, le meuble entier : toute la hauteur du grand écran, le bas sous ce qu'on touche, le milieu celui du meuble ; une
 * fenêtre moins large que lui le voit en entier quand même, avec plus de table dessus et dessous.
 */
export function regardPourLaFenetre(proportion: number, ecran: Regard = SUR_LA_PLATINE): Regard {
  const rogne = surLaPlatine(ecran) ? ROGNE : 0;
  const visible = ecran.hauteur - rogne;
  if (dispositionDe(proportion) === 'telephone') {
    const haut = ecran.origine[1] + rogne;
    if (proportion < ecran.largeur / visible)
      return { origine: [ecran.origine[0], haut], largeur: ecran.largeur, hauteur: Math.round(ecran.largeur / proportion) };
    const largeur = Math.round(visible * proportion);
    return { origine: [ecran.origine[0] + ecran.largeur / 2 - largeur / 2, haut], largeur, hauteur: visible };
  }
  const milieu = MEUBLE.origine[0] + MEUBLE.largeur / 2;
  const bas = ecran.origine[1] + ecran.hauteur;
  const largeur = Math.max(ecran.largeur, Math.round(HAUTEUR_DU_GRAND_ECRAN * proportion));
  if (largeur >= LARGEUR_DU_MEUBLE)
    return { origine: [milieu - largeur / 2, bas - HAUTEUR_DU_GRAND_ECRAN], largeur, hauteur: HAUTEUR_DU_GRAND_ECRAN };
  const hauteur = LARGEUR_DU_MEUBLE / proportion;
  return {
    origine: [milieu - LARGEUR_DU_MEUBLE / 2, bas - HAUTEUR_DU_GRAND_ECRAN - (hauteur - HAUTEUR_DU_GRAND_ECRAN) / 2],
    largeur: LARGEUR_DU_MEUBLE,
    hauteur,
  };
}

/**
 * Sur un grand écran, la place du classement : en colonne sous le bac, là où le bois est libre pendant la partie, en px dans ce
 * regard ; rien s'il ne la montre pas tout entière (le classement reste alors avec ce qu'on touche).
 */
export function classementSousLeBac(regard: Regard): PlaceDuClassement | undefined {
  const G = TABLEE.telephone.classement.grand;
  const [x, devant] = surLEcran([BAC.position[0], BAC.position[1] + BAC.caisse.profondeur]);
  const gauche = x - regard.origine[0];
  const haut = devant + G.sousLeBac - regard.origine[1];
  const hauteur = regard.hauteur - G.bas - haut;
  const largeur = BAC.caisse.largeur;
  if (gauche < 0 || gauche + largeur > regard.largeur || hauteur < G.ligne * G.auMoins) return undefined;
  return { gauche, haut, largeur, hauteur, parColonne: G.parColonne, ligne: G.ligne };
}

/** Ce qui, sur un écran du téléphone, est le meuble lui-même : il ne bouge pas quand on range ce qu'on y touche. */
export const estDuMeuble = (c: Calque): boolean => c.nom === 'platine' || c.nom === 'bac' || c.nom === 'ampli' || c.nom.startsWith('kraft');

/**
 * Sur un grand écran, ce dont glisse ce qu'on touche et ce qu'on lit d'un écran posé sur la platine pour se ranger sous le vinyle :
 * d'autant plus que la fenêtre est large, jusqu'à ce que le milieu de ces objets soit celui du disque. Rien au téléphone, ni pour un
 * écran posé ailleurs que sur la platine.
 */
export function glissementSousLeDisque(objets: readonly Calque[], ecran: Regard, proportion: number, mesurer: Mesure): number {
  const t = ouverture(proportion);
  if (t === 0 || ecran.origine[0] !== SUR_LA_PLATINE.origine[0]) return 0;
  const e = empriseDe(
    objets.filter((c) => !estDuMeuble(c)),
    mesurer,
  );
  return e === undefined ? 0 : t * (CENTRE_DU_PLATEAU[0] - (e.x + e.largeur / 2));
}

/** Ces objets glissés de tant, d'un bloc ; le meuble ne bouge pas. */
export const glisserSousLeDisque = (objets: readonly Calque[], dx: number): Calque[] =>
  dx === 0
    ? [...objets]
    : objets.map((c) => (estDuMeuble(c) ? c : { ...c, transformations: [{ genre: 'glisser', de: [dx, 0] }, ...(c.transformations ?? [])] }));

/**
 * Sur un ordinateur, ce qu'on touche et ce qu'on lit d'un écran posé sur la platine se range sous le vinyle : on le glisse d'un
 * bloc, jusqu'à ce que son milieu soit celui du disque. Le meuble ne bouge pas.
 */
export const rangerSousLeDisque = (objets: readonly Calque[], ecran: Regard, proportion: number, mesurer: Mesure): Calque[] =>
  glisserSousLeDisque(objets, glissementSousLeDisque(objets, ecran, proportion, mesurer));

/**
 * Le meuble au repos autour d'un écran du téléphone, ce que ce regard en voit : le bac rangé, la platine à l'arrêt, l'ampli
 * allumé, chacun s'il n'y est pas déjà. Une piste dessine sa propre platine : on ne lui en ajoute pas.
 */
export function meubleAutour(
  a: Ecritoire,
  objets: readonly Calque[],
  regard: Regard,
  platine = true,
  aiguilles?: readonly [number, number],
  echelles?: readonly [readonly string[], readonly string[]],
): Calque[] {
  const deja = new Set(objets.map((objet) => objet.nom));
  const candidats = [
    ...(deja.has('bac') ? [] : [bacDessine(a)]),
    ...(deja.has('platine') || !platine ? [] : [platineArretee(a)]),
    ...(deja.has('ampli') ? [] : [ampliDessine(a, aiguilles, echelles)]),
  ];
  // Ce que le regard ne voit pas ne se dessine pas : une fenêtre de téléphone ne voit ni le bac ni l'ampli. Ni ce dont il ne voit
  // qu'un bord : au téléphone, une fenêtre un peu plus large que l'écran (Safari et ses barres) montrait une lisière de l'ampli, ou
  // la platine coupée à côté du bac ; la table continue, simplement.
  return candidats.filter((c) => {
    const e = empriseDe([c], a.encrier.largeur);
    if (e === undefined) return false;
    const vuEnLargeur = Math.min(e.x + e.largeur, regard.origine[0] + regard.largeur) - Math.max(e.x, regard.origine[0]);
    const vuEnHauteur = Math.min(e.y + e.hauteur, regard.origine[1] + regard.hauteur) - Math.max(e.y, regard.origine[1]);
    return vuEnLargeur >= e.largeur * PART_VUE_AU_MOINS && vuEnHauteur >= e.hauteur * PART_VUE_AU_MOINS;
  });
}

/**
 * La part de sa largeur et de sa hauteur qu'un meuble voisin doit montrer dans le regard pour s'y dessiner : presque tout. Un
 * meuble coupé au bord (la platine à moitié à côté du bac sur une tablette, le bas de la platine au-dessus de sa pochette sur un
 * ordinateur) ne se dessine pas ; la table continue.
 */
const PART_VUE_AU_MOINS = 0.9;
