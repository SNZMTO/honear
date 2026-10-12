/**
 * La fenêtre du jeu, quelle que soit sa taille : le regard la remplit toujours, sans changer d'échelle. Une fenêtre de téléphone
 * montre l'écran du téléphone, élargi juste ce qu'il faut ; plus elle s'élargit, plus le regard s'ouvre sur le meuble, jusqu'au
 * meuble entier, du bac à l'ampli, sur un ordinateur. Les écrans du téléphone y gardent leur place sur le meuble ; ce qu'ils ne
 * montrent pas du meuble (le bac, la platine, l'ampli) y est posé au repos, pour que rien ne paraisse coupé ; et sur un grand écran,
 * ce qu'on y touche se range sous le vinyle.
 */

import { surLEcran } from '../../lowpoly/projection';
import { BAC } from '../../ressources/bac';
import { TELEPHONE } from '../../ressources/ecran';
import { TABLEE } from '../../ressources/tablee';
import { dessinerLAmpli } from '../ampli';
import { dessinerLeBac } from '../bac';
import type { Calque } from '../calque';
import type { PlaceDuClassement } from '../classement';
import { regardSurLeMeuble, type Regard } from '../meuble';
import { CENTRE_DU_PLATEAU } from '../platine';
import { empriseDe } from '../rendu/emprise';
import type { Mesure } from '../calque';
import { ampliDuSalon, bacDesPlaylistsPretes, platineArretee } from './meuble';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire } from './pieces';

const MEUBLE: Regard = regardSurLeMeuble();
/** Le haut du grand regard : celui du meuble entier, au-dessus des intercalaires du bac ; celui du téléphone s'il est plus haut. */
const HAUT = Math.min(MEUBLE.origine[1], SUR_LA_PLATINE.origine[1]);
/** Le bas du grand regard : celui du téléphone, sous ce qu'on touche. */
const BAS = SUR_LA_PLATINE.origine[1] + SUR_LA_PLATINE.hauteur;

/** La hauteur du regard sur un grand écran, en px de la scène. */
export const HAUTEUR_DU_GRAND_ECRAN = BAS - HAUT;
/** La largeur du meuble entier, avec ses marges. */
export const LARGEUR_DU_MEUBLE = MEUBLE.largeur;
/** Au téléphone, le bois au-dessus de la platine ne se montre pas : le haut de l'écran est le bord de la platine. */
const ROGNE = TELEPHONE.boisAuDessus;
/** Le regard de cet écran est-il celui du téléphone posé sur la platine (le seul qu'on rogne en haut) ? */
const surLaPlatine = (ecran: Regard): boolean => ecran.origine[0] === SUR_LA_PLATINE.origine[0] && ecran.origine[1] === SUR_LA_PLATINE.origine[1];
/** La proportion d'une fenêtre de téléphone (celle du regard du téléphone, rogné), et celle où le regard montre le meuble entier. */
export const PROPORTION_DU_TELEPHONE = SUR_LA_PLATINE.largeur / (SUR_LA_PLATINE.hauteur - ROGNE);
const PROPORTION_DU_MEUBLE = LARGEUR_DU_MEUBLE / HAUTEUR_DU_GRAND_ECRAN;

/** Où en est une fenêtre de cette proportion, du téléphone (0) au meuble entier (1). */
export const ouverture = (proportion: number): number =>
  Math.min(1, Math.max(0, (proportion - PROPORTION_DU_TELEPHONE) / (PROPORTION_DU_MEUBLE - PROPORTION_DU_TELEPHONE)));

/**
 * Le regard qui remplit une fenêtre de cette proportion (sa largeur sur sa hauteur), posé sur un écran du téléphone, sans bande
 * nulle part : à mesure que la fenêtre s'élargit, il grandit du regard de l'écran jusqu'à la hauteur du grand écran, et son milieu
 * glisse de celui de l'écran vers celui du meuble ; son bas reste celui de l'écran, sous ce qu'on y touche. Au téléphone, il commence
 * au bord de la platine ; une fenêtre plus étroite (un téléphone plus long) garde sa largeur, et descend plus bas sur la table.
 */
export function regardPourLaFenetre(proportion: number, ecran: Regard = SUR_LA_PLATINE): Regard {
  const rogne = surLaPlatine(ecran) ? ROGNE : 0;
  const visible = ecran.hauteur - rogne;
  if (proportion < ecran.largeur / visible) {
    return { origine: [ecran.origine[0], ecran.origine[1] + rogne], largeur: ecran.largeur, hauteur: Math.round(ecran.largeur / proportion) };
  }
  const t = ouverture(proportion);
  const hauteur = visible + t * (HAUTEUR_DU_GRAND_ECRAN - visible);
  const largeur = Math.max(ecran.largeur, Math.round(hauteur * proportion));
  const milieuDeLEcran = ecran.origine[0] + ecran.largeur / 2;
  const milieu = milieuDeLEcran + t * (MEUBLE.origine[0] + MEUBLE.largeur / 2 - milieuDeLEcran);
  const bas = ecran.origine[1] + ecran.hauteur;
  // Son haut reste celui de l'écran (au téléphone, le bord de la platine), et le bas descend d'autant : pas de bois au-dessus de la
  // platine, que Safari prendrait pour la couleur de sa barre. Il ne s'en détache qu'à mesure qu'il s'ouvre sur le meuble entier.
  const haut = ecran.origine[1] + rogne;
  const tire = bas - hauteur;
  return { origine: [milieu - largeur / 2, tire + (1 - t) * Math.max(0, haut - tire)], largeur, hauteur };
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
const estDuMeuble = (c: Calque): boolean => c.nom === 'platine' || c.nom === 'bac' || c.nom === 'ampli' || c.nom.startsWith('kraft');

/**
 * Sur un grand écran, ce qu'on touche et ce qu'on lit d'un écran posé sur la platine se range sous le vinyle : on le glisse d'un
 * bloc, d'autant plus que la fenêtre est large, jusqu'à ce que son milieu soit celui du disque. Le meuble ne bouge pas.
 */
export function rangerSousLeDisque(objets: readonly Calque[], ecran: Regard, proportion: number, mesurer: Mesure): Calque[] {
  const t = ouverture(proportion);
  if (t === 0 || ecran.origine[0] !== SUR_LA_PLATINE.origine[0]) return [...objets];
  const aRanger = objets.filter((c) => !estDuMeuble(c));
  const e = empriseDe(aRanger, mesurer);
  if (e === undefined) return [...objets];
  const dx = t * (CENTRE_DU_PLATEAU[0] - (e.x + e.largeur / 2));
  return objets.map((c) => (estDuMeuble(c) ? c : { ...c, transformations: [{ genre: 'glisser', de: [dx, 0] }, ...(c.transformations ?? [])] }));
}

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
    ...(deja.has('bac') ? [] : [dessinerLeBac(bacDesPlaylistsPretes(a.textes), DENSITE, a.encrier.largeur)]),
    ...(deja.has('platine') || !platine ? [] : [platineArretee(a)]),
    ...(deja.has('ampli') ? [] : [dessinerLAmpli(ampliDuSalon(a.textes, true, aiguilles, echelles), DENSITE)]),
  ];
  // Ce que le regard ne voit pas ne se dessine pas : une fenêtre de téléphone ne voit ni le bac ni l'ampli.
  return candidats.filter((c) => {
    const e = empriseDe([c], a.encrier.largeur);
    return (
      e !== undefined &&
      e.x < regard.origine[0] + regard.largeur &&
      e.x + e.largeur > regard.origine[0] &&
      e.y < regard.origine[1] + regard.hauteur &&
      e.y + e.hauteur > regard.origine[1]
    );
  });
}
