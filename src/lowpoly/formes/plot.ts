/**
 * Le plot : un cylindre court à l'arête chanfreinée, coiffé d'anneaux. Ses facettes sont fixes sous la lampe.
 * Tout ce qui est rond et épais en sort : le plateau, le vinyle, le corps d'un bouton, une embase, un écrou.
 */

import type { NomDeTeinte } from '../../ressources/palette';
import { cercle, rayonRentre } from '../contours';
import type { Maille } from '../facette';
import type { Nuance } from '../ombrage';
import type { Vec2 } from '../vecteurs';
import { prisme } from './boite';
import { disque, type Anneau } from './disque';

export interface Plot {
  readonly centre: Vec2;
  /** Hauteur du dessous au-dessus du bois, en px visibles. */
  readonly base: number;
  /** Épaisseur visible du flanc, du pied jusqu'à l'arête du dessus, en px. */
  readonly epaisseur: number;
  readonly rayon: number;
  /** Nombre de pans : au moins 48 pour un disque, 16 pour un bouton. */
  readonly pans: number;
  readonly chanfrein: number;
  readonly teinte: NomDeTeinte;
  /** Angle du premier pan, en degrés. */
  readonly dephasage?: number;
  /** Flanc moleté : un pan sur deux est une strie qui accroche la lumière, du pied jusqu'à l'arête. Il faut un nombre pair de pans. */
  readonly moletage?: boolean;
  /** Les anneaux du dessus, du bord vers le centre. Ils partent du rayon où finit le chanfrein, qu'on leur donne. */
  readonly dessus: (rayonDuDessus: number) => readonly Anneau[];
}

/** Contour au sol d'un plot : le même sert à son volume et à son ombre. */
export const contourDePlot = (p: Pick<Plot, 'centre' | 'rayon' | 'pans' | 'dephasage'>): Vec2[] =>
  cercle(p.centre, p.rayon, p.pans, p.dephasage ?? 0);

/** Une strie de moletage : un ton plus clair, un pan sur deux. */
const strie = (pan: number): Nuance => (pan % 2 === 0 ? 0 : 1);

export function plot(p: Plot): Maille {
  if (p.moletage === true && p.pans % 2 !== 0) throw new Error(`Un moletage ne se referme que sur un nombre pair de pans : ${p.pans} donnés.`);
  const flanc = prisme({
    contour: contourDePlot(p),
    base: p.base,
    epaisseur: p.epaisseur,
    chanfrein: p.chanfrein,
    teinte: p.teinte,
    ouvert: true,
    ...(p.moletage === true ? { nuanceDuPan: strie } : {}),
  });
  const dessus = disque({
    centre: p.centre,
    hauteur: p.base + p.epaisseur,
    pans: p.pans,
    anneaux: p.dessus(rayonRentre(p.rayon, p.chanfrein, p.pans)),
    ...(p.dephasage !== undefined ? { dephasage: p.dephasage } : {}),
  });
  return [...flanc, ...dessus];
}
