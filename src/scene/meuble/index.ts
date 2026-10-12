/**
 * Le meuble : le noyer sous la lampe, et les objets posés dessus, du fond vers l'avant.
 * Tout objet du meuble (la platine, une pochette, plus tard le bac et l'ampli) est un calque qu'on lui confie :
 * il ne sait rien d'eux, sinon leur ordre.
 */

import type { Densite } from '../../ressources/densites';
import { calque, type Calque } from '../calque';
import { dessinerLeNoyer } from './noyer';
import { zoneVisible, type Regard } from './regard';

export type { Regard } from './regard';
export { etendueDuRegard, regardSurLaPlatine, regardSurLeMeuble, surLeBois } from './regard';

export function dessinerLeMeuble(m: { readonly regard: Regard; readonly densite: Densite; readonly objets: readonly Calque[] }): Calque {
  return calque('meuble', [dessinerLeNoyer(zoneVisible(m.regard), m.densite), ...m.objets]);
}
