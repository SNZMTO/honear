/**
 * La pile : un objet posé à plat qui peut tourner sur lui-même (une étiquette, une pochette, le bras).
 * Il est fait d'étages dessinés vus de dessus et empilés du bas vers le haut ; ceux du bas lui donnent son épaisseur.
 * Tous ses étages tournent du même angle : pour tourner la pile, on règle cet angle sur chacun de ses calques « tourne ».
 */

import type { NomDeCalque } from '../lexique';
import { tonDuFlanc } from '../lowpoly/ombrage';
import type { Polygone } from '../lowpoly/polygones';
import { penchement, surLEcran, type Matrice } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { NomDeTeinte } from '../ressources/palette';
import { aplat, calque, type Calque, type Dessin, type RoleDeCalque, type Transformation } from './calque';
import { deformation, glissement, rotation, type Reglage } from './reglage';

/** Un étage : du contenu dessiné vu de dessus, posé à une hauteur donnée. Sans nom, c'est un niveau d'une tranche. */
export interface Etage {
  readonly nom?: string;
  /** Hauteur au-dessus du bois, en px visibles. */
  readonly hauteur: number;
  readonly contenu: readonly Dessin[];
  /** Un étage qui tourne pour son compte, d'un autre angle que la pile : les arcs d'une étiquette, emportés par la vitesse. */
  readonly angle?: number;
}

/** Écart entre deux niveaux d'une tranche, en px : assez serré pour que le flanc paraisse lisse à l'échelle du téléphone. */
const PAS_DE_TRANCHE = 0.75;
/** Deux étages plus proches que ça sont à la même hauteur. */
const MEME_HAUTEUR = 1e-6;

/**
 * L'épaisseur d'une pièce qui tourne : sa silhouette répétée de niveau en niveau, du haut vers le bas, dans le ton
 * que la lampe donne à un flanc tourné vers le joueur. La tranche descend ainsi droit vers le bas de l'écran,
 * quel que soit l'angle de la pièce. Les niveaux sont comptés depuis le haut : deux tranches de même sommet les partagent.
 */
export function tranche(e: { de: number; a: number; silhouettes: readonly Polygone[]; teinte: NomDeTeinte }): Etage[] {
  const flanc = aplat(e.silhouettes, e.teinte, tonDuFlanc());
  const niveaux: Etage[] = [];
  for (let rang = 1; e.a - rang * PAS_DE_TRANCHE > e.de + MEME_HAUTEUR; rang++)
    niveaux.push({ hauteur: e.a - rang * PAS_DE_TRANCHE, contenu: [flanc] });
  niveaux.push({ hauteur: e.de, contenu: [flanc] });
  return niveaux.reverse();
}

/** Range des étages du bas vers le haut, et réunit les niveaux sans nom qui sont à la même hauteur. */
function empiler(etages: readonly Etage[]): Etage[] {
  const ranges = etages.map((etage, rang) => ({ etage, rang })).sort((a, b) => a.etage.hauteur - b.etage.hauteur || a.rang - b.rang);
  const empiles: Etage[] = [];
  for (const { etage } of ranges) {
    const dessous = empiles[empiles.length - 1];
    const reunir = dessous !== undefined && dessous.nom === undefined && etage.nom === undefined && etage.hauteur - dessous.hauteur < MEME_HAUTEUR;
    if (reunir) empiles[empiles.length - 1] = { hauteur: dessous.hauteur, contenu: [...dessous.contenu, ...etage.contenu] };
    else empiles.push(etage);
  }
  return empiles;
}

/**
 * Une pile penchée autour de son centre : son bout, dans la direction `vers` (en degrés, dans le plan du meuble),
 * monte de `de` px visibles par px de distance au centre. C'est le bras, quand sa tête se lève. À 0, la pile est à plat.
 */
export interface Penche {
  readonly vers: number;
  readonly de: number;
}

/** La déformation d'un étage d'une pile penchée : chaque point monte droit à l'écran, d'autant plus qu'il est loin du centre. */
const deformationDePile = (penche: Penche): Matrice => penchement(penche.vers, [0, -penche.de]);

export interface Pile {
  readonly centre: Vec2;
  /** Angle de la pile, en degrés. */
  readonly angle: number;
  readonly etages: readonly Etage[];
  readonly role?: RoleDeCalque;
  /** Pour une pile qu'on peut pencher : chaque étage garde alors, entre son déplacement et son écrasement, la place de cette déformation. */
  readonly penche?: Penche;
}

/**
 * Une pile, autour d'un point du meuble. La rotation est sur le calque enfant de chaque étage, l'écrasement
 * sur son parent : l'objet tourne rond avant d'être écrasé.
 */
export function pile(nom: NomDeCalque, p: Pile): Calque {
  let niveau = 0;
  const penche: Transformation[] = p.penche !== undefined ? [{ genre: 'deformer', par: deformationDePile(p.penche) }] : [];
  return calque(
    nom,
    empiler(p.etages).map((etage) => {
      const sousCalque: NomDeCalque = `${nom}/${etage.nom ?? `niveau-${++niveau}`}`;
      const tourne = calque(`${sousCalque}/tourne`, etage.contenu, { transformations: [{ genre: 'tourner', de: etage.angle ?? p.angle }] });
      return calque(sousCalque, [tourne], {
        transformations: [{ genre: 'glisser', de: surLEcran(p.centre, etage.hauteur) }, ...penche, { genre: 'ecraser' }],
      });
    }),
    p.role !== undefined ? { role: p.role } : {},
  );
}

/** Ce que le mouvement règle sur une pile déjà dessinée, dont tous les étages tournent ensemble : leur angle, et sa pente si elle peut se pencher. */
export function reglerUnePile(dessinee: Calque, p: Pick<Pile, 'angle' | 'penche'>): Reglage[] {
  return dessinee.contenu.flatMap((etage): Reglage[] => {
    if (etage.genre !== 'calque') return [];
    return [
      // La pente se glisse entre le déplacement de l'étage et son écrasement.
      ...(p.penche !== undefined ? [deformation(etage.nom, 1, deformationDePile(p.penche))] : []),
      rotation(`${etage.nom}/tourne`, 0, p.angle),
    ];
  });
}

/**
 * Ce que le mouvement règle sur une pile déjà dessinée qui glisse sur le meuble, monte, et tourne : chaque étage passe d'où il a été
 * dessiné à sa nouvelle place, d'un même écart à l'écran, et tourne de l'angle de la pile.
 * @param dessineeA la place à l'écran où la pile a été dessinée, sa hauteur comprise ; `a`, celle où elle est.
 */
export function reglerUnePileQuiGlisse(dessinee: Calque, dessineeA: Vec2, a: Vec2, angle: number): Reglage[] {
  const [dx, dy] = [a[0] - dessineeA[0], a[1] - dessineeA[1]];
  return dessinee.contenu.flatMap((etage): Reglage[] => {
    if (etage.genre !== 'calque') return [];
    const place = etage.transformations?.[0];
    if (place?.genre !== 'glisser') throw new Error(`L'étage « ${etage.nom} » n'est pas posé par un glissement : il ne peut pas glisser.`);
    return [glissement(etage.nom, 0, [place.de[0] + dx, place.de[1] + dy]), rotation(`${etage.nom}/tourne`, 0, angle)];
  });
}
