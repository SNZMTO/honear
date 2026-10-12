/**
 * La pastille de disquaire : un petit rond de papier miel, collé de travers. Un message court, ou un point marqué.
 * Elle est plate : pas de tranche. Elle arrive un peu plus grande et d'un peu plus haut, puis claque ; son ombre est un calque à part.
 */

import { cercle } from '../lowpoly/contours';
import { tonAPlat } from '../lowpoly/ombrage';
import type { Polygone } from '../lowpoly/polygones';
import { grossissement, surLEcran } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import { PASTILLES } from '../ressources/pastilles';
import type { Echelon, RoleDeTexte } from '../ressources/typo';
import { aplat, calque, type Calque, type Dessin, type Mesure } from './calque';
import { ligneDeBaseSous, ligneSurMiel } from './encre';
import { uneFoisParNombre } from './memoire';
import { ombre, reglerUneOmbre, type OmbreMobile } from './ombre';
import { deformation, glissement, visibilite, type Reglage } from './reglage';
import { mettreEnLignes } from './texte';

/** Le papier d'une pastille, autour de son centre : miel, avec un liseré un ton plus sombre. */
export function papierDePastille(rayon: number): Dessin[] {
  const contour = cercle([0, 0], rayon, PASTILLES.pans);
  return [aplat([contour], 'miel', tonAPlat(-1)), aplat([cercle([0, 0], rayon * (1 - PASTILLES.lisere), PASTILLES.pans)], 'miel', tonAPlat())];
}

/**
 * Une face de pastille qui dit quelque chose : une ligne ou deux, centrées, au plus grand corps qui tient dans la pastille.
 * @param auPlus l'échelon d'où l'on part : le texte descend l'échelle s'il ne tient pas.
 */
export function faceEcrite(contenu: string, role: RoleDeTexte, rayon: number, auPlus: Echelon, mesurer: Mesure): Dessin[] {
  const { lignes, corps } = mettreEnLignes(mesurer, { contenu, role }, 2 * rayon * PASTILLES.ecrit, auPlus, 1, PASTILLES.lignes);
  // Le bloc des lignes, centré en hauteur : du haut de la première capitale au pied de la dernière.
  const pas = ligneDeBaseSous(0, corps) + corps * PASTILLES.interligne;
  const haut = -((lignes.length - 1) * pas + ligneDeBaseSous(0, corps)) / 2;
  return lignes.map((ligne, rang) => ligneSurMiel(ligne, role, corps, ligneDeBaseSous(haut + rang * pas, corps)));
}

export interface Pastille {
  /** Nom du calque. */
  readonly nom: `pastille-${string}`;
  /** Où elle est collée sur le meuble, et la hauteur de la surface qui la porte, en px visibles. */
  readonly en: Vec2;
  readonly support: number;
  /** Elle est toujours de travers : son angle, en degrés. */
  readonly angle: number;
  readonly rayon: number;
  /** Ce qu'elle peut montrer, une face à la fois, dessiné autour de son centre : un chiffre du décompte, par exemple. */
  readonly faces: Readonly<Record<string, readonly Dessin[]>>;
  /** La face qu'elle montre, ou rien : elle n'est alors pas là. */
  readonly montre: string | undefined;
  /** Tant qu'elle n'est pas collée : sa hauteur au-dessus de sa place, en px visibles, et sa taille par rapport à sa taille posée. */
  readonly enLAir?: { readonly hauteur: number; readonly echelle: number };
  /**
   * La hauteur de ce qu'elle survole, au-dessus du bois, si ce n'est plus la surface qui la portait : décollée, elle peut filer
   * au-delà de son bord, et son ombre tombe alors plus bas.
   */
  readonly survole?: number;
}

export interface PastilleDessinee {
  readonly ombre: Calque;
  readonly pastille: Calque;
}

/** Ce qui bouge d'une pastille : sa place, ce qu'elle montre, et si elle est encore en l'air. */
export type PoseDePastille = Pick<Pastille, 'nom' | 'en' | 'support' | 'rayon' | 'montre' | 'enLAir' | 'survole'>;

const COLLEE = { hauteur: 0, echelle: 1 } as const;

/** Le rond d'une pastille de ce rayon, dans le plan du meuble : c'est lui qui fait son ombre. Le même à chaque image. */
const silhouettesDePastille: (rayon: number) => readonly Polygone[] = uneFoisParNombre((rayon) => [cercle([0, 0], rayon, PASTILLES.pans)]);

/** L'ombre d'une pastille : collée, il ne lui reste que l'épaisseur de son papier ; au-dessus d'une surface plus basse, elle tombe d'autant plus loin. */
function ombreDePastille(p: PoseDePastille): OmbreMobile {
  const recoit = p.survole ?? p.support;
  return {
    en: p.en,
    silhouettes: silhouettesDePastille(p.rayon),
    // Ce dont elle est plus haute que ce qui reçoit son ombre : rien de plus tant qu'elle est au-dessus de ce qui la portait.
    hauteur: PASTILLES.epaisseur + (p.enLAir ?? COLLEE).hauteur + (p.support - recoit),
    support: recoit,
    paliers: 2,
  };
}

export function dessinerUnePastille(p: Pastille): PastilleDessinee {
  const { hauteur, echelle } = p.enLAir ?? COLLEE;
  const presente = p.montre !== undefined ? 1 : 0;
  const portee = ombre(`${p.nom}/ombre`, ombreDePastille(p));
  const papier = [
    ...papierDePastille(p.rayon),
    ...Object.entries(p.faces).map(([cle, face]) => calque(`${p.nom}/face-${cle}`, face, { opacite: cle === p.montre ? 1 : 0 })),
  ];
  return {
    ombre: { ...portee, opacite: presente },
    // Elle grossit autour de son centre ; son papier est couché dans le plan du meuble, de travers.
    pastille: calque(
      p.nom,
      [
        calque(`${p.nom}/papier`, [calque(`${p.nom}/papier/tourne`, papier, { transformations: [{ genre: 'tourner', de: p.angle }] })], {
          transformations: [{ genre: 'ecraser' }],
        }),
      ],
      {
        role: 'mobile',
        opacite: presente,
        transformations: [
          { genre: 'glisser', de: surLEcran(p.en, p.support + hauteur) },
          { genre: 'deformer', par: grossissement(echelle) },
        ],
      },
    ),
  };
}

/**
 * Ce que le mouvement règle sur une pastille déjà dessinée : sa place et sa taille, son ombre, et la face qu'elle montre.
 * @param faces les clés de toutes ses faces.
 */
export function reglerUnePastille(p: PoseDePastille, faces: readonly string[]): Reglage[] {
  const { hauteur, echelle } = p.enLAir ?? COLLEE;
  const presente = p.montre !== undefined;
  return [
    ...reglerUneOmbre(`${p.nom}/ombre`, ombreDePastille(p)),
    visibilite(`${p.nom}/ombre`, presente),
    glissement(p.nom, 0, surLEcran(p.en, p.support + hauteur)),
    deformation(p.nom, 1, grossissement(echelle)),
    visibilite(p.nom, presente),
    ...faces.map((cle) => visibilite(`${p.nom}/face-${cle}`, cle === p.montre)),
  ];
}
