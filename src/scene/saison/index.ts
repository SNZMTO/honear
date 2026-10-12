/**
 * Le décor de la saison en cours (voir ressources/saison.ts) : ce qu'il pose sur un écran, et ce qu'il y fait bouger à chaque
 * image. Hors saison, rien : le jeu est tel qu'en tout temps.
 */

import type { NomDeCalque } from '../../lexique';
import { SAISON } from '../../ressources/saison';
import type { Calque, Mesure } from '../calque';
import type { Regard } from '../meuble';
import type { Reglage } from '../reglage';
import { BABIOLE_QUI_BOUGE, decorDHalloween, reglerLesBabioles, type Decor } from './halloween';

/**
 * Le décor de saison d'un écran, posé dans ce regard : ce qui va sous ce qu'il montre, et ce qui va par-dessus, là où rien ne se tient.
 * @param sol faux quand le regard glisse sous ce qu'on pose (une piste) : ce qui est posé sur le bois n'y est pas.
 */
export const decorDeLaSaison = (regard: Regard, objets: readonly Calque[], mesurer: Mesure, sol = true): Decor =>
  SAISON === 'halloween' ? decorDHalloween(regard, objets, mesurer, sol) : { dessous: [], dessus: [] };

export type { Decor } from './halloween';

/** Les calques du décor de saison qui bougent, par leur nom. */
export const DECOR_QUI_BOUGE: RegExp = BABIOLE_QUI_BOUGE;

/** Ce que le mouvement règle sur ce qui bouge du décor de saison, à cet instant. */
export const reglerLeDecorDeLaSaison = (noms: readonly NomDeCalque[], t: number): Reglage[] =>
  SAISON === 'halloween' ? reglerLesBabioles(noms, t) : [];
