/**
 * Le disque : un objet à part entière, qui sort de sa pochette, se pose sur la platine, tourne et se retourne.
 * Son vinyle est figé en image et ne tourne jamais : ce sont son étiquette et ses arcs qui tournent.
 * Ses deux faces sont dessinées à l'avance ; on passe de l'une à l'autre en le retournant. Son ombre est un calque à part.
 * Au tournoi, le disque d'un duel porte un titre sur chaque face, son recto dessiné d'avance comme un verso.
 */

import { cercle, rectangleArrondi } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { tonAPlat, tonDeFacette, tonDuFlanc } from '../../lowpoly/ombrage';
import { decalagesParPxDeHauteur, ombreDUnDisqueRetourne } from '../../lowpoly/ombrePortee';
import { enveloppeConvexe, type Polygone } from '../../lowpoly/polygones';
import { hauteurPour, retournement, surLEcran, type Matrice } from '../../lowpoly/projection';
import { radians, type Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { ETIQUETTE } from '../../ressources/etiquette';
import { LAMPE } from '../../ressources/lampe';
import { PLATINE } from '../../ressources/platine';
import { aplat, calque, peinture, type Calque, type Dessin } from '../calque';
import { COPIES_DE_LA_TRAINEE, fonduDUneFace, type FaceDEtiquette, type FonduDEtiquette } from '../etiquette/fondu';
import { uneFoisPar } from '../memoire';
import { ombre, ombreDePile, reglerUneOmbre, type OmbreMobile } from '../ombre';
import { pile, type Etage } from '../pile';
import { deformation, glissement, opacite, rotation, visibilite, type Reglage } from '../reglage';
import { contourDuVinyle, vinyle } from '../vinyle';
import { ICI } from './centre';

const D = PLATINE.disque;

export type { FaceDEtiquette } from '../etiquette/fondu';

export interface EtiquetteDeDisque {
  /** Angle du papier, de son texte et de ses arcs courts, en degrés. À l'arrêt il vaut 0 : l'étiquette est à l'endroit. */
  readonly angle: number;
  /** Angle des arcs longs : à pleine vitesse on ne sait plus où est le texte, ils tournent pour leur compte. */
  readonly angleDesArcs?: number;
  /** Le papier, puis ce qui est écrit dessus, dessinés autour du centre de l'étiquette. */
  readonly papier: readonly Dessin[];
  readonly texte: readonly Dessin[];
  /** Les arcs qui remplacent le texte quand le disque tourne : absents, l'étiquette ne montre jamais que son texte. */
  readonly arcs?: { readonly courts: readonly Dessin[]; readonly longs: readonly Dessin[] };
  readonly montre: FaceDEtiquette;
  /**
   * Ce qu'on voit de chacun de ses dessins pendant qu'elle passe de son texte à ses arcs, ou revient : la vitesse emporte les lettres
   * en traînée, puis les fond en arcs. Sans lui, on ne voit que le dessin de `montre`, d'un coup.
   */
  readonly fondu?: FonduDEtiquette;
}

export interface Disque {
  /** Où est son centre sur le meuble. */
  readonly en: Vec2;
  /** Hauteur de son dessous au-dessus du bois, et de la surface qui reçoit son ombre, en px visibles. */
  readonly hauteur: number;
  readonly support: number;
  readonly etiquette: EtiquetteDeDisque;
  /**
   * Son verso, dessiné comme on le verra une fois le disque retourné et posé, autour de son centre : son fond, puis ce qu'on y lit,
   * qui peut n'arriver que plus tard. Absent : le disque n'a qu'un côté.
   */
  readonly verso?: { readonly fond: readonly Dessin[]; readonly reponse: readonly Dessin[] };
  /** De combien il est retourné, en degrés : 0, il montre son recto ; 180, son verso. */
  readonly retourne?: number;
  /** Hauteur de l'étiquette au-dessus du vinyle, en px visibles : collée, elle vaut 0. Seule la vue éclatée la décolle. */
  readonly etiquetteDecollee?: number;
}

/** Une face dessinée d'avance, comme un verso : son fond, le vinyle, puis ce qu'on y lit, autour du centre du disque posé à plat. */
export interface FaceDessinee {
  readonly fond: readonly Dessin[];
  readonly reponse: readonly Dessin[];
}

/**
 * Un disque dont chaque face porte un titre, dessinée d'avance comme un verso : celui d'un duel, au tournoi. Son recto n'a ni
 * étiquette qui tourne ni arcs : on lit ce qu'il porte, des deux côtés.
 */
export interface DisqueADeuxFaces extends Omit<Disque, 'etiquette' | 'verso' | 'etiquetteDecollee'> {
  readonly recto: FaceDessinee;
  readonly verso: FaceDessinee;
}

export interface DisqueDessine {
  readonly ombre: Calque;
  readonly disque: Calque;
}

/** Ce que le mouvement règle sur un disque : où il est, de combien il est retourné, ce que fait son étiquette. */
export interface PoseDeDisque extends Pick<Disque, 'en' | 'hauteur' | 'support'> {
  readonly retourne: number;
  readonly etiquette: Required<Pick<EtiquetteDeDisque, 'angle' | 'angleDesArcs' | 'montre' | 'fondu'>>;
}

/** La silhouette du disque posé à plat, telle qu'on la voit : son dessus, et l'épaisseur de sa tranche dessous. */
function silhouetteALEcran(densite: Densite): Vec2[] {
  const contour = contourDuVinyle({ centre: ICI }, densite);
  return enveloppeConvexe([...contour.map((p) => surLEcran(p)), ...contour.map((p) => surLEcran(p, D.epaisseur))]);
}

/** Les calques de la traînée, de la copie la plus proche des lettres à la plus lointaine. */
const TRAINEE = Array.from({ length: COPIES_DE_LA_TRAINEE }, (_, rang) => `etiquette/trainee-${rang + 1}` as const);

/**
 * L'étiquette : son papier, son texte, sa traînée et ses arcs courts tournent ensemble ; ses arcs longs, pour leur compte.
 * La traînée, ce sont des copies du texte, dessous, chacune tournée en arrière de la précédente : la vitesse les écarte.
 */
function dessinerLEtiquette(e: EtiquetteDeDisque, hauteur: number): Calque {
  const fondu = e.fondu ?? fonduDUneFace(e.montre);
  const arcs = e.arcs;
  const etages: Etage[] = [
    {
      nom: 'papier',
      hauteur,
      contenu: [
        ...e.papier,
        ...(arcs !== undefined
          ? TRAINEE.map((nom, rang) =>
              calque(nom, e.texte, { transformations: [{ genre: 'tourner', de: -fondu.ecart * (rang + 1) }], opacite: fondu.trainee[rang] ?? 0 }),
            )
          : []),
        calque('etiquette/texte', e.texte, { opacite: fondu.texte }),
        ...(arcs !== undefined ? [calque('etiquette/arcs-courts', arcs.courts, { opacite: fondu.arcsCourts })] : []),
      ],
    },
    ...(arcs !== undefined
      ? [
          {
            nom: 'arcs',
            hauteur,
            angle: e.angleDesArcs ?? e.angle,
            contenu: [calque('etiquette/arcs-longs', arcs.longs, { opacite: fondu.arcsLongs })],
          },
        ]
      : []),
  ];
  return pile('etiquette', { role: 'mobile', centre: ICI, angle: e.angle, etages });
}

/**
 * La tranche du disque, qu'on ne voit que lorsqu'il se présente de profil en se retournant : un trait de son épaisseur.
 * Elle reste dessous, à plat, et les deux faces la recouvrent le reste du temps.
 */
function dessinerLaTranche(): Calque {
  const epaisseur = hauteurPour(D.epaisseur);
  const demi = D.rayon - 1;
  const trait = rectangleArrondi(-demi, -epaisseur / 2 - D.epaisseur / 2, 2 * demi, epaisseur, epaisseur / 2, 3);
  return calque('disque/tranche', [aplat([trait], 'vinyle', tonDuFlanc())], { role: 'image' });
}

/**
 * Les deux calques du verso dont un écran peut changer le contenu : son fond, quand on change de façon de montrer la réponse ;
 * et la réponse, qui n'arrive qu'à la révélation.
 */
export const CALQUES_DU_VERSO = { fond: 'disque/verso/image', reponse: 'disque/verso/reponse' } as const;

/** Le plus de voiles d'ombre qu'un verso peut porter : deux tons de moins que posé à plat. */
const VOILES = 2;
/** Leurs calques, du premier qu'on montre au dernier. */
const VOILES_DU_VERSO = Array.from({ length: VOILES }, (_, rang) => `disque/verso/ombre/voile-${rang + 1}` as const);

/** Ce dont le palier le plus lointain de l'ombre du disque s'éloigne par px de hauteur : c'est lui qui dit comment elle se déforme. */
const PENTE_DE_L_OMBRE: Vec2 = (() => {
  const pentes = decalagesParPxDeHauteur(D.epaisseur);
  const lointaine = pentes[pentes.length - 1];
  if (lointaine === undefined) throw new Error('L’ombre du disque n’a pas de palier.');
  return lointaine;
})();

/** La profondeur du disque posé à plat, telle qu'on la voit : de son bord du fond à son bord le plus proche. */
const PROFONDEUR_A_L_ECRAN = 2 * surLEcran([0, D.rayon])[1];

/**
 * Ce qu'on voit d'un disque retourné d'un angle donné (0 : son recto, 180 : son verso) : la déformation de ses faces,
 * laquelle on voit, le nombre de voiles d'ombre que porte le verso tant qu'il tourne le dos à la lampe (c'est la fonction
 * d'ombrage qui le dit, comme pour une facette), et son ombre : sa déformation, la même pour tous ses paliers, qui passent
 * donc ensemble par le trait ; et si elle se montre, ce qu'elle ne fait pas tant qu'elle n'est qu'une lame.
 */
function vueDuDisqueRetourne(angle: number): {
  readonly faces: Matrice;
  readonly montreLeVerso: boolean;
  readonly voiles: number;
  readonly ombre: { readonly par: Matrice; readonly seMontre: boolean };
} {
  const { aplatissement } = retournement(angle);
  const montreLeVerso = aplatissement < 0;
  // La normale du verso : à l'opposé de celle du recto, dont le bord proche du joueur se lève.
  const a = radians(angle);
  const tonDuVerso = tonDeFacette({ normale: [0, Math.sin(a), -Math.cos(a)] });
  const par = ombreDUnDisqueRetourne(angle, PENTE_DE_L_OMBRE);
  return {
    faces: [1, 0, 0, aplatissement],
    montreLeVerso,
    voiles: montreLeVerso ? Math.min(VOILES, Math.max(0, tonAPlat() - tonDuVerso)) : 0,
    ombre: { par, seMontre: Math.abs(par[3]) * PROFONDEUR_A_L_ECRAN >= LAMPE.ombre.lame },
  };
}

/** Vrai dès qu'un disque retourné de cet angle montre son verso : il a passé sa tranche, telle qu'on la voit d'ici. */
export const montreSonVerso = (retourne: number): boolean => vueDuDisqueRetourne(retourne).montreLeVerso;

/**
 * Le verso, sous un miroir : retourné, le disque le remet à l'endroit. Par-dessus, deux voiles d'ombre, de la même encre
 * que les ombres portées : on en montre deux, un, puis aucun, à mesure que cette face se tourne vers la lampe.
 */
function faceVerso(verso: NonNullable<Disque['verso']>, retourne: number, densite: Densite): Calque {
  const silhouette = silhouetteALEcran(densite);
  const voile = aplat([silhouette], LAMPE.ombre.teinte, LAMPE.ombre.ton, LAMPE.ombre.opacite);
  const vue = vueDuDisqueRetourne(retourne);
  return calque(
    'disque/verso',
    [
      calque(CALQUES_DU_VERSO.fond, verso.fond, { role: 'image' }),
      // La réponse reste en polygones : une pochette, deux lignes. La poser à la révélation ne demande aucune image à figer.
      calque(CALQUES_DU_VERSO.reponse, verso.reponse, { role: 'mobile' }),
      calque(
        'disque/verso/ombre',
        VOILES_DU_VERSO.map((nom, rang) => calque(nom, [voile], { opacite: rang < vue.voiles ? 1 : 0 })),
        { role: 'ombre' },
      ),
    ],
    { transformations: [{ genre: 'deformer', par: [1, 0, 0, -1] }], opacite: vue.montreLeVerso ? 1 : 0 },
  );
}

/** La silhouette du disque posé à plat, dans le plan du meuble : c'est elle qui fait son ombre. La même à chaque image. */
const silhouettesDuDisque: (densite: Densite) => readonly Polygone[] = uneFoisPar((densite) => [contourDuVinyle({ centre: ICI }, densite)]);

/** Le nombre de paliers de l'ombre du disque. */
const PALIERS = 3;

/**
 * L'ombre du disque : sa silhouette posée à plat, que ses paliers déforment tous de la même façon quand il se retourne.
 * @param par la déformation que donne `vueDuDisqueRetourne`.
 */
function ombreDuDisque(disque: Pick<Disque, 'en' | 'hauteur' | 'support'>, par: Matrice, densite: Densite): OmbreMobile {
  return {
    en: disque.en,
    silhouettes: silhouettesDuDisque(densite),
    hauteur: D.epaisseur + disque.hauteur - disque.support,
    support: disque.support,
    paliers: PALIERS,
    deformations: Array.from({ length: PALIERS }, () => par),
  };
}

/** Le recto d'un disque à deux faces : sa face dessinée d'avance, son fond en image, ce qu'on y lit en polygones. */
const faceRecto = (face: FaceDessinee, montreLeVerso: boolean): Calque =>
  calque(
    'disque/recto',
    [calque('disque/recto/image', face.fond, { role: 'image' }), calque('disque/recto/reponse', face.reponse, { role: 'mobile' })],
    { opacite: montreLeVerso ? 0 : 1 },
  );

export function dessinerLeDisque(disque: Disque | DisqueADeuxFaces, densite: Densite): DisqueDessine {
  const pans = densite.pansDeDisque;
  const retourne = disque.retourne ?? 0;
  const vue = vueDuDisqueRetourne(retourne);
  const recto =
    'recto' in disque
      ? faceRecto(disque.recto, vue.montreLeVerso)
      : calque(
          'disque/recto',
          [
            // Le vinyle ne change jamais de facettes : il est figé en image.
            calque('disque/vinyle', [peinture(peindre(vinyle({ centre: ICI, dessus: D.epaisseur }, densite)))], { role: 'image' }),
            // L'étiquette porte son ombre sur le vinyle : collée, elle la cache ; décollée, elle la découvre. Ronde, cette ombre n'a pas à tourner.
            ombreDePile('etiquette/ombre', {
              en: ICI,
              angle: 0,
              silhouettes: [cercle(ICI, D.etiquette, pans)],
              hauteur: ETIQUETTE.colle + (disque.etiquetteDecollee ?? 0),
              support: D.epaisseur,
            }),
            dessinerLEtiquette(disque.etiquette, D.epaisseur + ETIQUETTE.colle + (disque.etiquetteDecollee ?? 0)),
          ],
          { opacite: vue.montreLeVerso ? 0 : 1 },
        );

  return {
    ombre: { ...ombre('disque/ombre', ombreDuDisque(disque, vue.ombre.par, densite)), opacite: vue.ombre.seMontre ? 1 : 0 },
    disque: calque(
      'disque',
      [
        dessinerLaTranche(),
        calque('disque/faces', [recto, ...(disque.verso !== undefined ? [faceVerso(disque.verso, retourne, densite)] : [])], {
          transformations: [{ genre: 'deformer', par: vue.faces }],
        }),
      ],
      { transformations: [{ genre: 'glisser', de: surLEcran(disque.en, disque.hauteur) }] },
    ),
  };
}

/**
 * Ce que le mouvement règle sur un disque à deux faces (celui d'un duel) : sa place et celle de son ombre, la face qu'il montre et
 * l'ombre qu'elle porte. Il n'a pas d'étiquette qui tourne.
 */
export function reglerLeDisqueADeuxFaces(pose: Omit<PoseDeDisque, 'etiquette'>, densite: Densite): Reglage[] {
  const vue = vueDuDisqueRetourne(pose.retourne);
  return [
    ...reglerUneOmbre('disque/ombre', ombreDuDisque(pose, vue.ombre.par, densite)),
    visibilite('disque/ombre', vue.ombre.seMontre),
    glissement('disque', 0, surLEcran(pose.en, pose.hauteur)),
    deformation('disque/faces', 0, vue.faces),
    visibilite('disque/recto', !vue.montreLeVerso),
    visibilite('disque/verso', vue.montreLeVerso),
    ...VOILES_DU_VERSO.map((nom, rang) => visibilite(nom, rang < vue.voiles)),
  ];
}

/**
 * Ce que le mouvement règle sur un disque déjà dessiné avec ses arcs et son verso : sa place et celle de son ombre,
 * la face qu'il montre et l'ombre qu'elle porte, l'angle de son étiquette et ce qu'elle laisse lire.
 */
export function reglerLeDisque(pose: PoseDeDisque, densite: Densite): Reglage[] {
  const vue = vueDuDisqueRetourne(pose.retourne);
  const { angle, angleDesArcs, fondu } = pose.etiquette;
  return [
    ...reglerUneOmbre('disque/ombre', ombreDuDisque(pose, vue.ombre.par, densite)),
    visibilite('disque/ombre', vue.ombre.seMontre),
    glissement('disque', 0, surLEcran(pose.en, pose.hauteur)),
    deformation('disque/faces', 0, vue.faces),
    visibilite('disque/recto', !vue.montreLeVerso),
    visibilite('disque/verso', vue.montreLeVerso),
    ...VOILES_DU_VERSO.map((nom, rang) => visibilite(nom, rang < vue.voiles)),
    rotation('etiquette/papier/tourne', 0, angle),
    rotation('etiquette/arcs/tourne', 0, angleDesArcs),
    ...TRAINEE.flatMap((nom, rang) => [rotation(nom, 0, -fondu.ecart * (rang + 1)), opacite(nom, fondu.trainee[rang] ?? 0)]),
    opacite('etiquette/texte', fondu.texte),
    opacite('etiquette/arcs-courts', fondu.arcsCourts),
    opacite('etiquette/arcs-longs', fondu.arcsLongs),
  ];
}
