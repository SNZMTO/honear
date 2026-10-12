/**
 * L'encre : la couleur dans laquelle on écrit ou on trace sur une surface.
 * Sombre sur une teinte claire, claire sur une teinte sombre : celle des deux qui s'y lit le mieux.
 */

import { contraste } from '../lowpoly/couleur';
import { couleur, TON_DE_BASE } from '../lowpoly/tons';
import type { NomDeTeinte } from '../ressources/palette';
import { HAUTEUR_DE_CAPITALE, type RoleDeTexte } from '../ressources/typo';
import type { Texte } from './calque';

/** Les deux encres du projet : l'expresso pour les fonds clairs, le crème pour les fonds sombres. */
type Encre = 'expresso' | 'creme';

export function encreLisibleSur(fond: NomDeTeinte): Encre {
  return contraste(couleur(fond), couleur('expresso')) >= contraste(couleur(fond), couleur('creme')) ? 'expresso' : 'creme';
}

/** L'encre de ce qui s'écrit sur du papier miel, une étiquette de disque comme une pastille : expresso. */
export const ENCRE_SUR_MIEL = { teinte: 'expresso', ton: TON_DE_BASE, fond: { teinte: 'miel' } } as const satisfies Pick<
  Texte,
  'teinte' | 'ton' | 'fond'
>;

/**
 * Une ligne droite écrite sur du papier miel, centrée sur l'axe de ce qui la porte : une étiquette, une pastille.
 * @param y la hauteur de sa ligne de base, au pied des lettres.
 */
export const ligneSurMiel = (contenu: string, role: RoleDeTexte, corps: number, y: number): Texte => ({
  genre: 'texte',
  contenu,
  role,
  corps,
  en: [0, y],
  ancrage: 'milieu',
  ...ENCRE_SUR_MIEL,
});

/**
 * La ligne de base d'un texte en capitales dont le haut des lettres est à la hauteur y : une ligne de base est au pied des lettres,
 * et une ligne qu'on pose sous un point descend donc de la hauteur d'une capitale.
 */
export const ligneDeBaseSous = (y: number, corps: number): number => y + corps * HAUTEUR_DE_CAPITALE;
