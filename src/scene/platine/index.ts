/**
 * La platine : la manche. Ce module assemble ses pièces à partir de l'état qu'on lui donne
 * et ne lit rien d'autre. Il ne modifie jamais le jeu.
 *
 * Ordre des calques, du fond vers l'avant : le socle et ce qu'il porte (figés), l'ombre que le bras y porte, puis le plateau,
 * qui la cache là où il est, et son axe ; les repères du plateau, les commandes, le levier ; ce qu'on lui confie pour passer
 * entre le plateau et le bras (le disque, et ce qui l'accompagne) ; enfin la pointe de l'axe, qui dépasse d'un disque posé,
 * l'ombre que le bras porte sur le plateau, et le bras. Chaque pièce mobile a son ombre sous elle.
 */

import type { Densite } from '../../ressources/densites';
import { calque, type Calque, type Dessin } from '../calque';
import type { Reglage } from '../reglage';
import { dessinerLAxe, reglerLAxe } from './axe';
import { dessinerLeBras, reglerLeBras, type PoseDuBras } from './bras';
import { dessinerLesCommandes, type EtatDesCommandes } from './commandes';
import { HAUTEURS } from './emplacements';
import { dessinerLeLevier, reglerLeLevier } from './levier';
import { dessinerLePiedDuBras } from './piedDuBras';
import { dessinerLePlateau, dessinerLesReperes, reglerLesReperes } from './plateau';
import { dessinerLeSocle } from './socle';

export { pointeQuiDepasse } from './axe';
export { ombresDuBras, type PoseDuBras } from './bras';
export type { EtatDesCommandes } from './commandes';
export { angleDuBrasAuRayon, CENTRE_DU_PLATEAU, HAUTEURS, PIVOT_DU_BRAS, surLeSocle, surLeTube } from './emplacements';

/** Ce que la platine a besoin de savoir pour se dessiner. */
export interface EtatDeLaPlatine {
  /** Angle des repères du plateau, en degrés. */
  readonly reperes: number;
  /** Le bras : son angle (voir `angleDuBrasAuRayon` pour sa course sur le disque), et de combien sa tête est levée. */
  readonly bras: PoseDuBras;
  /** Le levier : 0, il est baissé et le bras est posé ; 1, il est levé et tient le bras en l'air. */
  readonly levier: number;
  readonly commandes: EtatDesCommandes;
  /** Nom gravé sur la plaque de marque du socle. */
  readonly marque: string;
  /** Ce dont la pointe de l'axe dépasse du disque enfilé sur lui, en px visibles (voir `pointeQuiDepasse`) : rien si le plateau est vide. */
  readonly pointeDeLAxe: number;
}

/**
 * Hauteur ajoutée à chaque pièce mobile, en px visibles. Tout à zéro : la platine telle qu'elle est.
 * La vue éclatée de la planche de rendu s'en sert pour montrer chaque calque à part.
 */
export interface Soulevements {
  readonly reperes: number;
  readonly bras: number;
  readonly levier: number;
  readonly boutons: number;
  readonly interrupteurs: number;
}

const POSEE: Soulevements = { reperes: 0, bras: 0, levier: 0, boutons: 0, interrupteurs: 0 };

/** La hauteur de ce que le plateau présente au bras : son disque s'il en porte un, enfilé sur l'axe, sinon sa feutrine. */
const dessusDuPlateau = (pointeDeLAxe: number): number => (pointeDeLAxe > 0 ? HAUTEURS.disque : HAUTEURS.feutrine);

/**
 * @param entre ce qui se dessine entre le plateau et le bras : le disque et son ombre, et ce qui passe avec lui.
 * @param souleve hauteur de chaque pièce mobile au-dessus de sa place. Par défaut, tout est posé.
 */
export function dessinerLaPlatine(etat: EtatDeLaPlatine, densite: Densite, entre: readonly Calque[] = [], souleve: Soulevements = POSEE): Calque {
  const axe = dessinerLAxe(densite, etat.pointeDeLAxe);
  const bras = dessinerLeBras(etat.bras, densite, souleve.bras, dessusDuPlateau(etat.pointeDeLAxe));
  const levier = dessinerLeLevier(etat.levier, densite, souleve.levier);
  const commandes = dessinerLesCommandes(etat.commandes, etat.marque, densite, souleve);

  const decor: Dessin[] = [...dessinerLeSocle(densite), ...commandes.decor, ...levier.embase, ...dessinerLePiedDuBras(densite)];
  return calque('platine', [
    calque('platine/decor', decor, { role: 'decor' }),
    // L'ombre que le bras porte sur le socle passe sous le plateau, qui la cache.
    bras.ombre,
    calque('plateau', dessinerLePlateau(densite), { role: 'decor' }),
    axe.axe,
    dessinerLesReperes(etat.reperes, densite, souleve.reperes),
    ...commandes.mobiles,
    levier.ombre,
    levier.levier,
    ...entre,
    axe.pointe,
    // Celle qu'il porte sur le plateau, et sur son disque, s'arrête au bord du plateau.
    bras.ombreSurLePlateau,
    bras.bras,
  ]);
}

/** Ce qui bouge sur la platine pendant qu'on joue : ses repères, son bras, son levier, la pointe de son axe. */
export type PoseDeLaPlatine = Pick<EtatDeLaPlatine, 'reperes' | 'bras' | 'levier' | 'pointeDeLAxe'>;

/**
 * Ce que le mouvement règle sur la platine déjà dessinée.
 * @param bras le calque du bras, tel qu'il a été dessiné : c'est lui qui sait le nom de ses étages.
 */
export function reglerLaPlatine(pose: PoseDeLaPlatine, densite: Densite, bras: Calque): Reglage[] {
  return [
    ...reglerLAxe(pose.pointeDeLAxe, densite),
    ...reglerLesReperes(pose.reperes),
    ...reglerLeLevier(pose.levier),
    ...reglerLeBras(bras, pose.bras, densite, dessusDuPlateau(pose.pointeDeLAxe)),
  ];
}
