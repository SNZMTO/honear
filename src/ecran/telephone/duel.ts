/**
 * La platine d'un duel, au téléphone : chacun tient la sienne, à son rythme. Elle commence sur la face A, qui joue ; toucher le
 * disque le retourne (toujours du même côté), et l'autre face joue, reprise où on l'avait laissée (du début, si on l'avait écoutée
 * jusqu'au bout) ; glisser le bras le pose où l'on veut dans la face. Une face écoutée jusqu'au bout lève le bras ; si l'on n'a pas
 * encore entendu l'autre, le disque se retourne de lui-même. De cet état, à une heure du serveur, se déduisent la pose de la platine
 * et ce que le haut-parleur joue. Tout est pur.
 */

import { partieA } from '../../regles/partie';
import type { FaceDuDuel } from '../../regles/tournoi';
import { REGLAGES } from '../../ressources/reglages';
import { angleDuRetournement, DUREE_DU_RETOURNEMENT, type PoseDuDuel } from '../../scene/duel';
import type { Memoire, RoomConnue } from './memoire';

/** Une platine de duel, à un instant : les heures sont celles du serveur, les positions en secondes d'extrait. */
export interface PlatineDuDuel {
  /** Le duel dont c'est la platine, par l'heure de son ouverture : un autre duel en pose une neuve. */
  readonly duel: number;
  /** Combien de demi-tours le disque a faits : pair, la face A est en haut. */
  readonly tours: number;
  /** L'heure où la main a pris le disque, au dernier demi-tour. */
  readonly retourneA?: number;
  /** Où en est chaque face quand elle ne joue pas. */
  readonly arretees: Readonly<Record<FaceDuDuel, number>>;
  /** L'heure où la face du haut serait partie de son début, si elle joue : sa position est l'heure moins celle-ci. */
  readonly joueDepuis?: number;
  /** Le bras qu'on tient, au doigt : où il est, de 0 (le bord du disque) à 1 (la fin de l'extrait). Levé, le son se tait. */
  readonly bras?: number;
  /** Les faces qu'on a déjà fait jouer. */
  readonly ecoutees: readonly FaceDuDuel[];
  /** La face pour laquelle ce téléphone a voté : le serveur ne la dit à personne avant la clôture. */
  readonly monVote?: FaceDuDuel;
}

/** Ce qu'on entend de chaque face d'un duel, en secondes : ce que le serveur en a dit ; sans extrait, la durée du site. */
export const dureeDesFaces = (room: RoomConnue): number => room.extraits?.duree ?? REGLAGES.extrait.defaut;

/** La platine du duel en cours, ou du dernier clos, telle que ce téléphone la tient ; rien hors d'un tournoi. */
export function platineDuDuelEnCours(m: Pick<Memoire, 'room' | 'duel'>): PlatineDuDuel | undefined {
  const t = m.room !== undefined ? partieA(m.room.journal, Infinity).tournoi : undefined;
  const duel = t?.enCours ?? t?.clos[t.clos.length - 1];
  return duel !== undefined && m.duel?.duel === duel.a ? m.duel : undefined;
}

/** Un demi-tour, en degrés. */
const DEMI_TOUR = 180;

const autreFace = (face: FaceDuDuel): FaceDuDuel => (face === 'A' ? 'B' : 'A');
const entre = (x: number, de: number, a: number): number => Math.min(a, Math.max(de, x));

/** La platine d'un duel qui s'ouvre, à cette heure : la face A part de son début. */
export const platineNeuve = (duel: number, heure: number): PlatineDuDuel => ({
  duel,
  tours: 0,
  arretees: { A: 0, B: 0 },
  joueDepuis: heure,
  ecoutees: ['A'],
});

/** La face qui est en haut (ou qui va l'être, pendant que le disque se retourne). */
export const faceDuHaut = (p: PlatineDuDuel): FaceDuDuel => (p.tours % 2 === 0 ? 'A' : 'B');

/** Vrai pendant que la main retourne le disque. */
const enRetournement = (p: PlatineDuDuel, heure: number): boolean => p.retourneA !== undefined && heure < p.retourneA + DUREE_DU_RETOURNEMENT;

/** Où en est la face du haut, en secondes : négatif tant que le disque se retourne et qu'elle n'est pas encore partie. */
function position(p: PlatineDuDuel, heure: number, duree: number): number {
  if (p.bras !== undefined) return p.bras * duree;
  return p.joueDepuis !== undefined ? heure - p.joueDepuis : p.arretees[faceDuHaut(p)];
}

/** La pose de la platine à cette heure : le disque (et de combien il est retourné), le bras sur sa course, levé ou posé. */
export function poseDeLaPlatine(p: PlatineDuDuel, heure: number, duree: number): PoseDuDuel {
  const tourne = enRetournement(p, heure);
  const depuisSaFace = ((p.tours + 1) % 2) * DEMI_TOUR;
  const retourne = tourne && p.retourneA !== undefined ? depuisSaFace + angleDuRetournement(heure - p.retourneA) : (p.tours % 2) * DEMI_TOUR;
  const ici = position(p, heure, duree);
  return {
    retourne,
    enLAir: tourne,
    avancement: duree > 0 ? entre(ici / duree, 0, 1) : 0,
    brasLeve: tourne || p.bras !== undefined || p.joueDepuis === undefined || ici < 0 || ici >= duree,
  };
}

/**
 * Toucher le disque : la main le prend et le retourne ; l'autre face part, où on l'avait laissée (du début si elle était finie),
 * une fois le disque retombé. Rien pendant qu'il se retourne déjà.
 */
export function retourner(p: PlatineDuDuel, heure: number, duree: number): PlatineDuDuel {
  if (enRetournement(p, heure)) return p;
  const face = faceDuHaut(p);
  const autre = autreFace(face);
  const depart = p.arretees[autre] >= duree ? 0 : p.arretees[autre];
  const { bras: _tenu, ...sansLeBras } = p;
  return {
    ...sansLeBras,
    tours: p.tours + 1,
    retourneA: heure,
    arretees: { ...p.arretees, [face]: entre(position(p, heure, duree), 0, duree), [autre]: depart } as Record<FaceDuDuel, number>,
    joueDepuis: heure + DUREE_DU_RETOURNEMENT - depart,
    ecoutees: p.ecoutees.includes(autre) ? p.ecoutees : [...p.ecoutees, autre],
  };
}

/** Le bras tenu au doigt, à cette part de la face : il est levé, le son se tait. Rien pendant que le disque se retourne. */
export function tenirLeBras(p: PlatineDuDuel, part: number, heure: number): PlatineDuDuel {
  return enRetournement(p, heure) ? p : { ...p, bras: entre(part, 0, 1) };
}

/** Le bras lâché à cette part de la face : il s'y pose, et la face joue de là ; au bout, il reste levé. */
export function poserLeBras(p: PlatineDuDuel, part: number, heure: number, duree: number): PlatineDuDuel {
  if (enRetournement(p, heure)) return p;
  const face = faceDuHaut(p);
  const ici = entre(part, 0, 1) * duree;
  const { bras: _tenu, joueDepuis: _jouait, ...reste } = p;
  if (ici >= duree) return { ...reste, arretees: { ...p.arretees, [face]: duree } as Record<FaceDuDuel, number> };
  return { ...reste, arretees: { ...p.arretees, [face]: ici } as Record<FaceDuDuel, number>, joueDepuis: heure - ici };
}

/**
 * L'heure passe : une face jouée jusqu'au bout s'arrête, le bras levé ; si l'on n'a pas encore entendu l'autre, le disque se
 * retourne de lui-même. Rend la même platine quand rien ne change.
 */
export function avancerLaPlatine(p: PlatineDuDuel, heure: number, duree: number): PlatineDuDuel {
  if (p.joueDepuis === undefined || p.bras !== undefined || enRetournement(p, heure) || heure - p.joueDepuis < duree) return p;
  const face = faceDuHaut(p);
  const { joueDepuis: _jouait, ...reste } = p;
  const finie: PlatineDuDuel = { ...reste, arretees: { ...p.arretees, [face]: duree } as Record<FaceDuDuel, number> };
  return p.ecoutees.includes(autreFace(face)) ? finie : retourner(finie, heure, duree);
}

/** Ce que joue le haut-parleur : la face du haut, partie à cette heure, jusqu'au bout de ce qu'on en entend ; rien, bras levé. */
export function faceQuiJoue(
  p: PlatineDuDuel,
  duree: number,
): { readonly face: FaceDuDuel; readonly depuis: number; readonly jusqua: number } | undefined {
  if (p.joueDepuis === undefined || p.bras !== undefined) return undefined;
  return { face: faceDuHaut(p), depuis: p.joueDepuis, jusqua: p.joueDepuis + duree };
}
