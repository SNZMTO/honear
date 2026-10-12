/**
 * Une facette : un petit polygone à plat, d'une seule teinte.
 * Les formes fabriquent des facettes dans l'espace ; `peindre` leur donne un ton et les couche à l'écran.
 *
 * Deux façons de regarder une forme :
 * - la vue du meuble, pour ce qui est posé dessus. Les hauteurs se donnent en px visibles (voir `hauteurPour`) ;
 * - la vue de dessus, pour ce qui tourne ou s'imprime : un bas-relief, dont le relief est dans la même unité que le plan.
 */

import type { NomDeFini } from '../ressources/finis';
import type { NomDeTeinte } from '../ressources/palette';
import { tonDeFacette, type Nuance } from './ombrage';
import { aireSignee, orienter, plusPetitAngle, type Polygone } from './polygones';
import { estVisible, hauteurPour, projeter, versLOeil } from './projection';
import type { IndiceDeTon } from './tons';
import { normaleDeNewell, plusPetitAngleDansLEspace, scalaire, tourner, type Vec2, type Vec3 } from './vecteurs';

export interface Facette {
  /** Sommets dans l'espace : x et y dans le plan, z vers le haut. */
  readonly sommets: readonly Vec3[];
  readonly teinte: NomDeTeinte;
  readonly fini?: NomDeFini;
  /** Sens des sillons, pour les finis qui en ont. */
  readonly fil?: Vec2;
  readonly nuance?: Nuance;
}

/** Des facettes qui ne se recouvrent pas à l'écran : on peut les dessiner dans n'importe quel ordre. */
export type Maille = readonly Facette[];

export interface FacettePeinte {
  readonly contour: Polygone;
  readonly teinte: NomDeTeinte;
  readonly ton: IndiceDeTon;
  /**
   * Plus petit angle de la facette, en degrés, sans l'effet du regard en biais : mesuré dans l'espace
   * pour la vue du meuble, à plat pour une vue de dessus. Sert à traquer les pointes en lame.
   */
  readonly angle: number;
}

export type Vue =
  /** Vue du meuble : la projection commune, faces cachées retirées. */
  | { readonly genre: 'meuble' }
  /**
   * Vue de dessus, sans écrasement : pour les calques qui tournent ou s'impriment. L'écrasement est appliqué
   * par leur calque parent. `orientation` est l'angle sous lequel l'objet prend sa lumière.
   */
  | { readonly genre: 'dessus'; readonly orientation?: number };

const VUE_DU_MEUBLE: Vue = { genre: 'meuble' };
/** La vue de dessus d'un objet qui prend sa lumière tel qu'il est dessiné, sans avoir tourné. */
export const VUE_DE_DESSUS: Vue = { genre: 'dessus' };

/** De l'espace à l'écran : garde les facettes tournées vers l'œil, donne à chacune son ton, et la couche. */
export function peindre(maille: Maille, vue: Vue = VUE_DU_MEUBLE): FacettePeinte[] {
  const peintes: FacettePeinte[] = [];
  for (const facette of maille) {
    let normale = normaleDeNewell(facette.sommets);
    let fil = facette.fil;
    if (vue.genre === 'dessus') {
      if (normale[2] <= 1e-6) continue;
      const angle = vue.orientation ?? 0;
      const [nx, ny] = tourner([normale[0], normale[1]], angle);
      normale = [nx, ny, normale[2]];
      if (fil !== undefined) fil = tourner(fil, angle);
    } else if (!estVisible(normale)) {
      continue;
    }
    const contour: Vec2[] = vue.genre === 'dessus' ? facette.sommets.map((s) => [s[0], s[1]] as Vec2) : facette.sommets.map(projeter);
    if (Math.abs(aireSignee(contour)) < 1e-4) continue;
    const orientation = {
      normale,
      ...(fil !== undefined ? { fil } : {}),
      ...(facette.nuance !== undefined ? { nuance: facette.nuance } : {}),
    };
    peintes.push({
      contour,
      teinte: facette.teinte,
      ton: tonDeFacette(orientation, facette.fini ?? 'mat'),
      angle: vue.genre === 'dessus' ? plusPetitAngle(contour) : plusPetitAngleDansLEspace(facette.sommets),
    });
  }
  return peintes;
}

/**
 * Des facettes qui se recouvrent à l'écran (une forme creusée, des morceaux qui se croisent), rangées du fond vers l'œil :
 * dessinées dans cet ordre, les plus proches couvrent les autres.
 */
export function duFondVersLOeil(facettes: readonly Facette[]): Facette[] {
  const profondeur = (f: Facette): number => versLOeil(f.sommets.reduce<Vec3>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]));
  return [...facettes].sort((a, b) => profondeur(a) / a.sommets.length - profondeur(b) / b.sommets.length);
}

/** Une facette posée à plat à une hauteur donnée (en px visibles au-dessus du bois). */
export function facetteAPlat(contour: Polygone, hauteurVisible: number, teinte: NomDeTeinte, nuance?: Nuance): Facette {
  const z = hauteurPour(hauteurVisible);
  return { sommets: orienter(contour).map((p) => [p[0], p[1], z] as Vec3), teinte, ...(nuance !== undefined ? { nuance } : {}) };
}

/**
 * Une facette plane et penchée, en bas-relief : elle monte dans le sens de `pente`, d'autant d'unités par unité
 * parcourue que la longueur de ce vecteur. Une paupière qui tombe, une oreille qui fuit sur le côté.
 */
export function facetteInclinee(contour: Polygone, pente: Vec2, teinte: NomDeTeinte, nuance?: Nuance): Facette {
  const sommets = orienter(contour).map((p) => [p[0], p[1], scalaire(p, pente)] as Vec3);
  return { sommets, teinte, ...(nuance !== undefined ? { nuance } : {}) };
}
