/**
 * Les vignettes : ce qui tient lieu de vraie pochette dans les maquettes et le prototype. Une couleur et un motif,
 * jamais la copie d'une vraie pochette.
 */

import type { NomDeTeinte } from './palette';
import type { Motif } from './pochettes';

export interface Vignette {
  readonly fond: NomDeTeinte;
  readonly motif: Motif;
}
