/**
 * Le bras de lecture : c'est le chrono. Il pivote autour de son axe, tous ses étages du même angle.
 * Il est dessiné vu de dessus, couché le long de l'axe pivot → pointe, puis empilé en étages :
 * les étages du bas lui donnent son épaisseur quel que soit son angle.
 * Son pied, qui ne bouge pas, est dessiné à part (voir piedDuBras.ts).
 */

import { arc, cercle, rectangle, rectangleArrondi } from '../../lowpoly/contours';
import { facetteAPlat, peindre, type Maille, type Vue } from '../../lowpoly/facette';
import { prisme } from '../../lowpoly/formes/boite';
import { contourDeCylindre, cylindreCouche, type Cylindre } from '../../lowpoly/formes/cylindre';
import { disque } from '../../lowpoly/formes/disque';
import { surLEcran } from '../../lowpoly/projection';
import { radians, type Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { aplat, peinture, type Calque, type Dessin } from '../calque';
import { uneFoisPar } from '../memoire';
import { ombreDePile, reglerUneOmbreDePile, type OmbreDePile } from '../ombre';
import { pile, reglerUnePile, tranche, type Etage, type Penche } from '../pile';
import type { Reglage } from '../reglage';
import { ANGLE_DE_LUMIERE_DU_BRAS, CENTRE_DU_PLATEAU, HAUTEURS, LONGUEUR_DU_TUBE, PIVOT_DU_BRAS, surLaTete, surLeTube } from './emplacements';
import { dansLOmbreDuPlateau, empriseDuPlateau } from './plateau';
import { dessusDuSocle } from './socle';

const B = PLATINE.bras;

/** Le bras prend sa lumière une fois pour toutes, au milieu de sa course. */
const VUE: Vue = { genre: 'dessus', orientation: ANGLE_DE_LUMIERE_DU_BRAS };

/** Bandes d'un cylindre mince (col, tige, bague), et le plus que peut en porter le tube. */
const BANDES = { mince: 3, tube: 5 } as const;

/** Contour de la coquille de la tête, autour de la pointe : étroite au col, large ensuite, le nez en demi-rond. Aucun angle vif. */
function contourDeLaTete(): Vec2[] {
  const { longueur, largeur, pointe, col, nez } = B.tete;
  const l = largeur / 2;
  const centreDuNez = longueur - pointe - nez.longueur;
  // Le nez : un demi-rond, d'un flanc à l'autre.
  const arrondi = arc([0, 0], 1, -90, 90, nez.pans).map(([x, y]) => surLaTete(centreDuNez + x * nez.longueur, y * l));
  return [
    surLaTete(-pointe + col.depart, -l * col.largeur),
    surLaTete(-pointe + col.fin, -l),
    ...arrondi,
    surLaTete(-pointe + col.fin, l),
    surLaTete(-pointe + col.depart, l * col.largeur),
  ];
}

/** Le doigt de levage : une petite patte qui dépasse de la tête, du côté opposé au plateau. */
function contourDuDoigt(): Vec2[] {
  const flanc = -B.tete.largeur / 2;
  return B.tete.doigt.map(([long, depasse]) => surLaTete(long, flanc - depasse));
}

/** La cellule, sous la tête : un pavé aux coins ronds, qui avance un peu devant la pointe. */
function contourDeLaCellule(): Vec2[] {
  const { longueur, largeur, rayon, avance } = B.cellule;
  return rectangleArrondi(avance - longueur, -largeur / 2, longueur, largeur, rayon, 2).map(([long, travers]) => surLaTete(long, travers));
}

/** Les deux fentes de réglage de la cellule, sur la tête. */
function fentesDeLaTete(): Vec2[][] {
  const { de, a, ecart, largeur } = B.tete.fentes;
  return [-1, 1].map((cote) => rectangle(de, cote * ecart - largeur / 2, a - de, largeur).map(([long, travers]) => surLaTete(long, travers)));
}

interface CylindresDuBras {
  readonly contrepoids: Cylindre;
  readonly cadran: Cylindre;
  readonly col: Cylindre;
  readonly tige: Cylindre;
  readonly tube: Cylindre;
  readonly bague: Cylindre;
}

/** Les cylindres couchés du bras, du contrepoids à la bague de la tête. */
function cylindres(densite: Densite): CylindresDuBras {
  const { debut, fin, rayon, cadran, col, rayonDuCol, tige } = B.contrepoids;
  const { bague } = B.tete;
  const bandes = densite.bandesDeCylindre;
  return {
    contrepoids: { de: [debut, 0], a: [fin - cadran, 0], rayonDe: rayon, rayonA: rayon, bandes, teinte: 'alu' },
    // Le cadran gradué du contrepoids, en crème.
    cadran: { de: [fin - cadran, 0], a: [fin, 0], rayonDe: rayon, rayonA: rayon, bandes, teinte: 'creme' },
    col: { de: [fin, 0], a: [fin + col, 0], rayonDe: rayon * rayonDuCol, rayonA: rayon * rayonDuCol, bandes: BANDES.mince, teinte: 'expresso' },
    // La tige disparaît sous le cardan.
    tige: { de: [fin + col, 0], a: [-B.cardan.rayon / 2, 0], rayonDe: tige, rayonA: tige, bandes: BANDES.mince, teinte: 'alu' },
    tube: {
      de: surLeTube(B.tube.depart),
      a: surLeTube(LONGUEUR_DU_TUBE - B.tube.retrait),
      rayonDe: B.tube.rayon * B.tube.affinement[0],
      rayonA: B.tube.rayon * B.tube.affinement[1],
      bandes: Math.min(BANDES.tube, bandes),
      teinte: 'alu',
    },
    bague: {
      // La bague serre le bout du tube contre la tête.
      de: surLeTube(LONGUEUR_DU_TUBE + bague.de),
      a: surLeTube(LONGUEUR_DU_TUBE + bague.a),
      rayonDe: bague.rayon,
      rayonA: bague.rayon,
      bandes: BANDES.mince,
      teinte: 'expresso',
    },
  };
}

/** Les graduations du cadran : de petits traits, plus fins vers les bords, comme sur le tour d'un cylindre. */
function graduations(): Vec2[][] {
  const { fin, rayon, cadran, graduations: g } = B.contrepoids;
  return g.angles.map((angle) => {
    const travers = rayon * Math.sin(radians(angle));
    const largeur = g.largeur * Math.max(g.auBord, Math.cos(radians(angle)));
    return rectangle(fin - cadran * g.a, travers - largeur / 2, cadran * (g.a - g.de), largeur);
  });
}

export interface BrasDessine {
  /** Son ombre sur le socle : elle se dessine sous le plateau. */
  readonly ombre: Calque;
  /** Son ombre sur le plateau : elle se dessine sur le disque. */
  readonly ombreSurLePlateau: Calque;
  readonly bras: Calque;
}

const CALQUES = { ombre: 'bras/ombre', ombreSurLePlateau: 'bras/ombre/plateau' } as const;

/** Le bras, tel qu'on le pose : son angle, et de combien sa tête est levée. */
export interface PoseDuBras {
  /** Angle du bras sur le meuble, en degrés (0° vers la droite, 90° vers le joueur). */
  readonly angle: number;
  /** Ce dont la pointe est levée au-dessus de sa hauteur de lecture, en px visibles : le bras bascule autour de son pivot. */
  readonly leve: number;
}

/** Ce que le pivot du bras ne fait pas bouger : il se penche, sa tête monte, son contrepoids descend d'autant moins qu'il est court. */
const pencheDuBras = (pose: PoseDuBras): Penche => ({ vers: pose.angle, de: pose.leve / B.longueur });

/** Les silhouettes au sol des pièces du bras, couché le long de son axe : elles font son ombre. */
function silhouettesDuBras(densite: Densite): {
  readonly cylindres: Readonly<Record<keyof CylindresDuBras, Vec2[]>>;
  readonly cardan: Vec2[];
  readonly tete: Vec2[];
  readonly doigt: Vec2[];
} {
  const c = cylindres(densite);
  return {
    cylindres: {
      contrepoids: contourDeCylindre(c.contrepoids),
      cadran: contourDeCylindre(c.cadran),
      col: contourDeCylindre(c.col),
      tige: contourDeCylindre(c.tige),
      tube: contourDeCylindre(c.tube),
      bague: contourDeCylindre(c.bague),
    },
    cardan: cercle([0, 0], B.cardan.rayon, B.cardan.pans),
    tete: contourDeLaTete(),
    doigt: contourDuDoigt(),
  };
}

/** Le joint de la tête : un petit rond là où la bague rejoint le col de la coquille. Sans lui, un jour passerait dans l'ombre, entre les deux. */
const jointDeLaTete = (): Vec2[] => cercle(surLaTete(-B.tete.pointe, 0), B.tete.bague.rayon, 8);

/**
 * Ce qui fait l'ombre du bras, couché le long de son axe : le bras entier, pour l'ombre qu'il porte sur le socle ; et ce qui peut
 * avancer au-dessus du plateau (le tube, la bague, la tête), pour celle qu'il porte sur lui. Ces silhouettes ne dépendent
 * que de la densité : on ne les redessine pas à chaque image.
 */
const silhouettesDOmbre: (densite: Densite) => { readonly entier: readonly Vec2[][]; readonly avant: readonly Vec2[][] } = uneFoisPar((densite) => {
  const s = silhouettesDuBras(densite);
  const { contrepoids, cadran, col, tige, tube, bague } = s.cylindres;
  const avant = [tube, bague, jointDeLaTete(), s.tete, s.doigt];
  return { entier: [contrepoids, cadran, col, tige, s.cardan, ...avant], avant };
});

/** Le bord du dessus du plateau, tel qu'on le voit : l'ombre que le bras porte sur le plateau s'arrête là. */
const bordDuPlateau: (densite: Densite) => readonly Vec2[][] = uneFoisPar((densite) => [
  cercle(CENTRE_DU_PLATEAU, PLATINE.plateau.rayon, densite.pansDeDisque).map((p) => surLEcran(p, HAUTEURS.plateau - PLATINE.plateau.monte)),
]);

/** Les deux ombres du bras : celle qu'il porte sur le socle, et celle qu'il porte sur le plateau et ce qui s'y trouve. */
export interface OmbresDuBras {
  readonly surLeSocle: OmbreDePile;
  readonly surLePlateau: OmbreDePile;
}

/**
 * Les ombres du bras dans une pose donnée : c'est ce que le dessin pose, et ce que le mouvement règle ensuite.
 * Sur le socle, le bras entier porte la sienne, sauf ce qui survole le plateau : une seule lampe ne donne pas deux ombres
 * à la tête. Elle s'efface aussi dans l'ombre que le plateau porte lui-même sur le socle, et s'arrête au bord du socle :
 * le contrepoids, quand le bras avance vers l'étiquette, passe au-dessus de ce bord. Sur le plateau, elle tombe plus près
 * de lui, parce qu'il est plus haut, et elle s'arrête à son bord : au bord, l'ombre fait une marche, et c'est elle qui dit la hauteur.
 * @param souleve hauteur ajoutée au bras entier, en px visibles : seule la vue éclatée s'en sert.
 * @param surLePlateau hauteur, au-dessus du bois, de ce que le plateau présente au bras : sa feutrine, ou un disque.
 */
export function ombresDuBras(pose: PoseDuBras, densite: Densite, souleve = 0, surLePlateau: number = HAUTEURS.feutrine): OmbresDuBras {
  const { entier, avant } = silhouettesDOmbre(densite);
  const commun = { en: PIVOT_DU_BRAS, angle: pose.angle, penche: pencheDuBras(pose) };
  return {
    surLeSocle: {
      ...commun,
      silhouettes: entier,
      hauteur: B.hauteur + souleve,
      support: HAUTEURS.socle,
      surface: dessusDuSocle(densite),
      saufDans: dansLOmbreDuPlateau(densite),
      saufAuDessusDe: empriseDuPlateau(densite),
    },
    surLePlateau: {
      ...commun,
      silhouettes: avant,
      hauteur: HAUTEURS.bras + souleve - surLePlateau,
      support: surLePlateau,
      surface: bordDuPlateau(densite),
    },
  };
}

/**
 * @param souleve hauteur ajoutée au bras entier, en px visibles : seule la vue éclatée s'en sert.
 * @param surLePlateau hauteur de ce que le plateau présente au bras. Voir `ombresDuBras`.
 */
export function dessinerLeBras(pose: PoseDuBras, densite: Densite, souleve = 0, surLePlateau: number = HAUTEURS.feutrine): BrasDessine {
  const { angle } = pose;
  const c = cylindres(densite);
  const h = HAUTEURS.bras + souleve;
  const { cylindres: silhouettes, cardan, tete, doigt } = silhouettesDuBras(densite);
  const cellule = contourDeLaCellule();

  // Vues de dessus. Les pièces qui se recouvrent sont peintes l'une après l'autre.
  const peint = (maille: Maille): Dessin => peinture(peindre(maille, VUE));
  const dessus: Dessin[] = [
    peint([...cylindreCouche(c.contrepoids), ...cylindreCouche(c.cadran), ...cylindreCouche(c.col), ...cylindreCouche(c.tige)]),
    aplat(graduations(), 'expresso'),
    peint(cylindreCouche(c.tube)),
    // Le doigt est trop menu pour porter un chanfrein.
    peint(prisme({ contour: doigt, base: 0, epaisseur: B.tete.epaisseur, chanfrein: 0, teinte: 'alu' })),
    peint(prisme({ contour: tete, base: 0, epaisseur: B.tete.epaisseur, chanfrein: B.tete.chanfrein, teinte: 'alu' })),
    // Les fentes sont en creux : un ton sous celui de la tête.
    peint(fentesDeLaTete().map((fente) => facetteAPlat(fente, B.tete.epaisseur, 'alu', -1))),
    peint(cylindreCouche(c.bague)),
  ];
  const { rayon, monte, chapeau: bordDuChapeau, coeur, fente } = B.cardan;
  const chapeau: Dessin[] = [
    peint(
      disque({
        centre: [0, 0],
        hauteur: 0,
        pans: B.cardan.pans,
        anneaux: [
          { de: rayon, a: rayon * bordDuChapeau, teinte: 'expresso', monte },
          // Le chapeau d'aluminium monte un peu vers son milieu : ses facettes du côté de la lampe sont plus claires.
          { de: rayon * bordDuChapeau, a: rayon * coeur, teinte: 'alu', monte },
          { de: rayon * coeur, a: 0, teinte: 'alu' },
        ],
      }),
    ),
    // La fente de la vis du cardan.
    peint([facetteAPlat(rectangle(-fente.longueur / 2, -fente.largeur / 2, fente.longueur, fente.largeur), 0, 'alu', -1)]),
  ];

  // Les étages du dessous : les mêmes silhouettes, plus bas, dans le ton d'un flanc. C'est l'épaisseur du bras.
  const sousLaTete = h - B.cellule.retrait;
  const etages: Etage[] = [
    ...tranche({ de: sousLaTete - B.cellule.epaisseur, a: sousLaTete, silhouettes: [cellule], teinte: 'miel' }),
    ...tranche({ de: h - B.contrepoids.epaisseur, a: h, silhouettes: [silhouettes.contrepoids], teinte: 'alu' }),
    ...tranche({ de: h - B.contrepoids.epaisseur, a: h, silhouettes: [silhouettes.cadran], teinte: 'creme' }),
    ...tranche({ de: h - B.contrepoids.epaisseur, a: h, silhouettes: [silhouettes.col], teinte: 'expresso' }),
    ...tranche({ de: h - B.tube.epaisseur, a: h, silhouettes: [silhouettes.tige, silhouettes.tube, tete, doigt], teinte: 'alu' }),
    ...tranche({ de: h - B.tube.epaisseur, a: h, silhouettes: [silhouettes.bague], teinte: 'expresso' }),
    { nom: 'dessus', hauteur: h, contenu: dessus },
    ...tranche({ de: h - B.cardan.dessous, a: h + B.cardan.dessus, silhouettes: [cardan], teinte: 'expresso' }),
    { nom: 'chapeau', hauteur: h + B.cardan.dessus, contenu: chapeau },
  ];

  const ombres = ombresDuBras(pose, densite, souleve, surLePlateau);
  return {
    ombre: ombreDePile(CALQUES.ombre, ombres.surLeSocle),
    ombreSurLePlateau: ombreDePile(CALQUES.ombreSurLePlateau, ombres.surLePlateau),
    bras: pile('bras', { role: 'mobile', centre: PIVOT_DU_BRAS, angle, etages, penche: pencheDuBras(pose) }),
  };
}

/**
 * Ce que le mouvement règle sur le bras déjà dessiné : son angle, sa pente, et ses deux ombres qui les suivent.
 * @param surLePlateau hauteur de ce que le plateau présente au bras. Voir `ombresDuBras`.
 */
export function reglerLeBras(dessine: Calque, pose: PoseDuBras, densite: Densite, surLePlateau: number = HAUTEURS.feutrine): Reglage[] {
  const ombres = ombresDuBras(pose, densite, 0, surLePlateau);
  return [
    ...reglerUneOmbreDePile(CALQUES.ombre, ombres.surLeSocle),
    ...reglerUneOmbreDePile(CALQUES.ombreSurLePlateau, ombres.surLePlateau),
    ...reglerUnePile(dessine, { angle: pose.angle, penche: pencheDuBras(pose) }),
  ];
}
