/**
 * Les nombres des documents de travail, écrits à la française : une virgule pour les décimales, une espace entre les milliers.
 */

import { INSECABLE } from '../scene/typographie';

/** Entre les milliers, une espace qui ne se coupe pas : un nombre ne tombe jamais à cheval sur deux lignes. */
const ENTRE_LES_MILLIERS = INSECABLE;

function ecrireArrondi(arrondi: string): string {
  const [entier = '0', decimales] = arrondi.replace('-', '').split('.');
  const milliers = entier.replace(/\B(?=(\d{3})+$)/g, ENTRE_LES_MILLIERS);
  // Un nombre qui s'arrondit à zéro n'a plus de signe.
  const signe = Number(arrondi) < 0 ? '−' : '';
  return `${signe}${milliers}${decimales !== undefined ? `,${decimales}` : ''}`;
}

/** Un nombre arrondi à tant de décimales au plus, sans zéros inutiles : « 1,5 », « 2 », « 15 987 ». */
export const ecrire = (n: number, decimales = 0): string => ecrireArrondi(String(Number(n.toFixed(decimales))));

/** Le même, avec toujours autant de décimales : un compteur qui défile garde sa largeur. « 1,0 », « 9,9 ». */
export const ecrireFixe = (n: number, decimales: number): string => ecrireArrondi(n.toFixed(decimales));
