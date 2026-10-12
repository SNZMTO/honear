/**
 * Ce qui est gravé dans la laque du socle : des inscriptions en crème.
 */

import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { CORPS, HAUTEUR_DE_CAPITALE, type RoleDeTexte } from '../../ressources/typo';
import type { Texte } from '../calque';

/** Décalage de la ligne de base pour qu'une inscription technique soit centrée en hauteur sur un point. */
export const MI_HAUTEUR = (CORPS.gravure * HAUTEUR_DE_CAPITALE) / 2;

/**
 * Une inscription gravée, à plat sur le socle. Par défaut : le caractère technique, au plus petit corps.
 * @param en point d'ancrage sur la ligne de base, dans le plan du meuble.
 */
export const graver = (
  contenu: string,
  en: Vec2,
  ancrage: Texte['ancrage'],
  role: RoleDeTexte = 'technique',
  corps: number = CORPS.gravure,
): Texte => ({
  genre: 'texte',
  contenu,
  role,
  corps,
  en,
  ancrage,
  teinte: 'creme',
  ton: TON_DE_BASE,
  fond: { teinte: 'laque' },
});
