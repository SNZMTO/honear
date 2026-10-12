/**
 * La typographie d'une langue, appliquée à un texte qu'on va afficher : les espaces qui ne doivent pas se couper en fin de ligne,
 * et de quoi dire où une ligne peut passer à la suivante. Les règles sont des données du fichier de textes ; une langue
 * qui n'en a pas rend le texte tel quel.
 */

import type { Textes } from '../ressources/textes';

/** L'espace qui ne se coupe pas : toutes les polices du site la connaissent. Écrite par son code : dans un source, on ne la distingue pas d'une autre. */
export const INSECABLE = '\u00A0';

/**
 * Les espaces qui ne se coupent pas : l'insécable, la fine insécable, l'espace de chiffre et le joint sans chasse.
 * Écrites par leur code, comme l'insécable.
 */
const QUI_NE_SE_COUPENT_PAS = `${INSECABLE}\u202F\u2007\uFEFF`;

/** Vrai pour une espace qui ne se coupe pas en fin de ligne. */
export const neSeCoupePas = (espace: string): boolean => QUI_NE_SE_COUPENT_PAS.includes(espace);

/** Là où une ligne peut passer à la suivante : une suite d'espaces dont aucune n'est de celles qui ne se coupent pas. */
export const OU_COUPER = new RegExp(`[^\\S${QUI_NE_SE_COUPENT_PAS}]+`);

/** Un texte, tel quel dans une expression régulière. */
const litteral = (texte: string): string => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @returns le même texte, où l'espace qui précède un signe double, suit un guillemet ouvrant, ou sépare un nombre de son unité
 * ne peut plus tomber en fin de ligne.
 */
export function espacer(texte: string, regles: Textes['typographie']): string {
  let espace = texte;
  for (const signe of regles.insecableAvant) espace = espace.split(` ${signe}`).join(`${INSECABLE}${signe}`);
  for (const signe of regles.insecableApres) espace = espace.split(`${signe} `).join(`${signe}${INSECABLE}`);
  if (regles.unites.length > 0) {
    // Les plus longues d'abord : « ms » avant « s ». Une unité finit là où un mot finirait.
    const unites = [...regles.unites].sort((a, b) => b.length - a.length).map(litteral);
    espace = espace.replace(new RegExp(`(\\d) (${unites.join('|')})(?![\\wÀ-ÿ])`, 'g'), `$1${INSECABLE}$2`);
  }
  return espace;
}
