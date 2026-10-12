/**
 * L'ombrage : la seule fonction du projet qui décide du ton d'une surface.
 * Elle choisit parmi les 5 tons selon l'orientation de la facette par rapport à la lampe.
 */

import { FINIS, type Fini, type NomDeFini } from '../ressources/finis';
import { LAMPE } from '../ressources/lampe';
import type { IndiceDeTon } from './tons';
import { degres, radians, scalaire, scalaire3, unitaire, unitaire3, type Vec2, type Vec3 } from './vecteurs';

/**
 * Un ton de plus ou de moins que ce que donne la lampe : une veine du bois, une strie de moletage,
 * un passage de sillons plus serrés, ou une surface à l'abri d'une autre (le cou sous le menton).
 */
export type Nuance = -1 | 0 | 1;

export interface Orientation {
  /** Normale de la facette, dans le repère du meuble. */
  readonly normale: Vec3;
  /** Sens des sillons dans le plan de la facette, pour les finis qui en ont. */
  readonly fil?: Vec2;
  readonly nuance?: Nuance;
}

const VERS_LA_LAMPE: Vec3 = unitaire3(LAMPE.versLaLampe);
const LAMPE_AU_SOL: Vec2 = unitaire([VERS_LA_LAMPE[0], VERS_LA_LAMPE[1]]);
/** Les frontières entre les tons, exprimées en cosinus, de la plus sombre à la plus claire. */
const SEUILS: readonly number[] = [...LAMPE.seuilsDesTons].reverse().map((angle) => Math.cos(radians(angle)));

/** Direction de la lampe, vue depuis le meuble, dans le plan du meuble. */
export const versLaLampeAuSol = (): Vec2 => LAMPE_AU_SOL;

/** Angle, dans le plan du meuble, de la droite qui va de la lampe vers le bas à droite : l'axe de sa lumière. */
export const azimutDeLaLampe = (): number => degres(Math.atan2(-LAMPE_AU_SOL[1], -LAMPE_AU_SOL[0]));

/** Éclairement d'une facette, sans unité : c'est lui qu'on compare aux seuils des 5 tons. */
function eclairement(orientation: Orientation, fini: Fini): number {
  if (fini.sillons !== undefined && orientation.fil !== undefined) {
    // Écart, en degrés, entre le sens des sillons et le travers de la lumière : 0 au cœur d'un secteur clair.
    const alignement = Math.min(1, Math.abs(scalaire(unitaire(orientation.fil), LAMPE_AU_SOL)));
    const ecart = 90 - degres(Math.acos(alignement));
    const { base, eclat, largeur } = fini.sillons;
    return base + eclat * Math.max(0, 1 - ecart / largeur);
  }
  return scalaire3(unitaire3(orientation.normale), VERS_LA_LAMPE);
}

/** Un ton déplacé d'un nombre de crans, sans sortir des 5 tons. */
export const nuancer = (ton: number, crans: number): IndiceDeTon => Math.min(4, Math.max(0, ton + crans)) as IndiceDeTon;

export function tonDeFacette(orientation: Orientation, fini: NomDeFini = 'mat'): IndiceDeTon {
  const valeur = eclairement(orientation, FINIS[fini]);
  let ton = 0;
  for (const seuil of SEUILS) if (valeur >= seuil) ton++;
  return nuancer(ton, orientation.nuance ?? 0);
}

/**
 * De combien de crans une pente change le ton de ce qui est posé à plat : c'est ainsi qu'une image imprimée
 * s'éclaircit ou s'assombrit là où son support est biseauté.
 */
export const cransDeLaPente = (normale: Vec3): number => tonDeFacette({ normale }) - tonAPlat();

/**
 * Les deux pentes les plus courantes, pour ce qui se dessine d'un seul ton sans passer par des facettes :
 * une surface posée à plat (le papier d'une étiquette), et un flanc tourné vers le joueur (la tranche d'une pochette).
 */
export const tonAPlat = (nuance: Nuance = 0): IndiceDeTon => tonDeFacette({ normale: [0, 0, 1], nuance });
export const tonDuFlanc = (nuance: Nuance = 0): IndiceDeTon => tonDeFacette({ normale: [0, 1, 0], nuance });
