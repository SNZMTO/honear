/**
 * Un duel du tournoi, sur la platine : le disque posé sur le plateau porte un titre sur chaque face, dessinée comme le verso d'une
 * piste (la pochette ronde au milieu, le titre en arc, l'interprète dessous) ; le bras lit la face qui est en haut, du bord vers
 * l'étiquette ; pour l'autre face, il se lève, le disque se retourne, il se repose. Le regard est celui de la révélation : on y voit
 * le disque entier, et la tête du bras. Ce module dessine une pose ; il ne sait pas qui la demande.
 */

import { depuisLEcran } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Reponse } from '../regles/piste';
import type { FaceDuDuel } from '../regles/tournoi';
import type { Densite } from '../ressources/densites';
import { AMPLEURS } from '../ressources/mouvement';
import type { Calque, Mesure } from './calque';
import { dessinerLeDisque, reglerLeDisqueADeuxFaces, type FaceDessinee } from './disque';
import { dessinerLeVerso } from './disque/verso';
import { seulement } from './etiquette/fondu';
import type { Regard } from './meuble';
import { HALTES_DU_DISQUE } from './piste/emplacements';
import { A_PLAT, angleDuDisqueRetourne, envolDuDisque } from './piste/gestes/retournement';
import { disqueDeLaPiste, platineDeLaPiste } from './piste/pieces';
import { POSE_AVANT_LA_PISTE, type PoseDeLaPiste } from './piste/pose';
import { regardDeLaPiste } from './piste/regard';
import { angleDuBrasAuRayon, dessinerLaPlatine, reglerLaPlatine, type EtatDesCommandes } from './platine';
import { calquesParNom, type Reglage } from './reglage';

/** Où en est le duel sur la platine, à un instant. */
export interface PoseDuDuel {
  /**
   * De combien le disque est retourné depuis sa face A, en degrés : 0, la face A en haut ; 180, la face B. Une main le retourne
   * toujours du même côté : de la face B, il repart vers 360, qui est encore la face A.
   */
  readonly retourne: number;
  /** Vrai pendant qu'une main le retourne : il est soulevé au-dessus du plateau, d'autant que son bord le demande. */
  readonly enLAir: boolean;
  /** Où en est l'extrait de la face du haut, de 0 à 1 : la place du bras, du bord du disque vers l'étiquette. */
  readonly avancement: number;
  /** Vrai quand le bras est levé : pendant que le disque se retourne, ou quand l'extrait de la face est fini. */
  readonly brasLeve: boolean;
}

/** La pose d'un duel qui commence : la face A en haut, le bras posé au bord. */
export const POSE_DU_DUEL: PoseDuDuel = { retourne: 0, enLAir: false, avancement: 0, brasLeve: false };

/** Un demi-tour, en degrés : d'une face à l'autre. */
const DEMI_TOUR = 180;

/** La face qui est en haut, pour un disque retourné de tant de degrés : celle qu'il montre, ou celle qu'il va montrer à plat. */
export function faceEnHaut(retourne: number): FaceDuDuel {
  const tour = ((retourne % (2 * DEMI_TOUR)) + 2 * DEMI_TOUR) % (2 * DEMI_TOUR);
  return tour < DEMI_TOUR / 2 || tour >= (3 * DEMI_TOUR) / 2 ? 'A' : 'B';
}

/** Le temps qu'une main met à retourner le disque d'un duel, jusqu'à ce qu'il retombe à plat : celui de la révélation. */
export const DUREE_DU_RETOURNEMENT: number = A_PLAT;

/**
 * Le disque d'un duel qu'une main retourne, tant de secondes après qu'elle l'a pris : de combien il a tourné depuis la face d'où il
 * part, de 0 à 180 ; il suit la main comme à la révélation.
 */
export const angleDuRetournement = (depuis: number): number => angleDuDisqueRetourne(Math.max(0, depuis));

/** Le regard d'un duel : celui de la révélation, posé sur le disque. */
export const REGARD_DU_DUEL: Regard = regardDeLaPiste({ regard: AMPLEURS.regardSurLaReponse });

/** Ce qui ne bouge pas pendant un duel : les commandes de la platine, sa marque. */
export interface DecorDuDuel {
  readonly commandes: EtatDesCommandes;
  readonly marque: string;
}

/** Une face du disque d'un duel : le titre de cette face, dessiné comme le verso d'une piste révélée. */
export const faceDuDuel = (reponse: Reponse, mesurer: Mesure, densite: Densite): FaceDessinee =>
  dessinerLeVerso({ genre: 'etiquette', reponse }, mesurer, densite);

/** La pose de la piste qui correspond à celle du duel : le disque sur le plateau, le bras sur sa course, le levier qui le tient levé. */
function poseDeLaPlatine(pose: PoseDuDuel): PoseDeLaPiste {
  const { surLePlateau } = HALTES_DU_DISQUE;
  const { de, a } = AMPLEURS.course;
  const avancement = Math.min(1, Math.max(0, pose.avancement));
  // Soulevé, il monte avec son bord, d'autant qu'il en est de son demi-tour, compté depuis la face d'où il part ; posé, il est sur la feutrine.
  const depuisSaFace = pose.retourne > DEMI_TOUR ? pose.retourne - DEMI_TOUR : pose.retourne;
  const envol = pose.enLAir ? envolDuDisque(depuisSaFace) : 0;
  return {
    ...POSE_AVANT_LA_PISTE,
    disque: {
      en: surLePlateau.en,
      hauteur: surLePlateau.hauteur + envol,
      retourne: pose.retourne,
      etiquette: { angle: 0, angleDesArcs: 0, ...seulement('texte') },
    },
    bras: { angle: angleDuBrasAuRayon(de + (a - de) * avancement), leve: pose.brasLeve ? AMPLEURS.brasLeve : 0 },
    levier: pose.brasLeve ? 1 : 0,
    regard: AMPLEURS.regardSurLaReponse,
  };
}

/**
 * La platine d'un duel, son disque sur le plateau : la face A au recto, la face B au verso.
 * @returns la platine, à confier au meuble.
 */
export function dessinerLeDuel(
  decor: DecorDuDuel,
  faces: Readonly<Record<FaceDuDuel, Reponse>>,
  pose: PoseDuDuel,
  mesurer: Mesure,
  densite: Densite,
): Calque {
  const piste = poseDeLaPlatine(pose);
  const { etiquette: _sansEtiquette, ...surLePlateau } = disqueDeLaPiste(piste);
  const disque = dessinerLeDisque(
    { ...surLePlateau, recto: faceDuDuel(faces.A, mesurer, densite), verso: faceDuDuel(faces.B, mesurer, densite) },
    densite,
  );
  return dessinerLaPlatine({ ...platineDeLaPiste(piste), ...decor }, densite, [disque.ombre, disque.disque]);
}

/**
 * De quoi régler la platine d'un duel déjà dessinée, d'image en image, sans la redessiner : le disque qui se retourne, le bras sur sa
 * course, levé ou posé, le levier.
 * @param dessinee la scène où le duel est dessiné, dans n'importe quelle pose.
 */
export function regleurDuDuel(dessinee: Calque, densite: Densite): (pose: PoseDuDuel) => Reglage[] {
  const bras = calquesParNom(dessinee).get('bras');
  if (bras === undefined) throw new Error('La scène à régler n’a pas de bras : ce n’est pas un duel.');
  return (pose) => {
    const piste = poseDeLaPlatine(pose);
    const { etiquette: _sansEtiquette, ...disque } = disqueDeLaPiste(piste);
    return [...reglerLeDisqueADeuxFaces(disque, densite), ...reglerLaPlatine(platineDeLaPiste(piste), densite, bras)];
  };
}

/**
 * La part de la face où se pose le bras quand on glisse le doigt sur le disque, à ce point de l'écran (en px de la scène) : sa
 * distance au centre du disque, sur le disque, du bord de la course du bras (0) à sa fin (1).
 */
export function partSousLeDoigt(point: Vec2): number {
  const { surLePlateau } = HALTES_DU_DISQUE;
  const [x, y] = depuisLEcran(point, surLePlateau.hauteur);
  const rayon = Math.hypot(x - surLePlateau.en[0], y - surLePlateau.en[1]);
  const { de, a } = AMPLEURS.course;
  return Math.min(1, Math.max(0, (rayon - de) / (a - de)));
}
