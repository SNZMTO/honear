/**
 * Lire à l'envers une phrase à trous des textes ou des légendes : un test y retrouve ce que le code y a mis, sans en recopier
 * les mots. Retoucher une légende ne casse ainsi aucun test tant que ses trous restent les mêmes.
 */

import { INSECABLE } from '../src/scene/typographie';

const echapper = (texte: string): string => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Un texte tel qu'on le lit : ses espaces insécables rendues à des espaces. */
export const lisible = (texte: string): string => texte.split(INSECABLE).join(' ');

/**
 * Ce qu'une phrase à trous a reçu dans chacun de ses trous pour donner ce texte ; rien si le texte n'est pas cette phrase, remplie.
 * Les espaces insécables que la page y met ne comptent pas.
 */
export function trousDe(modele: string, texte: string): Readonly<Record<string, string>> | undefined {
  const vus = new Set<string>();
  const motif = lisible(modele)
    .split(/\{(\w+)\}/)
    .map((morceau, rang) => {
      if (rang % 2 === 0) return echapper(morceau);
      // Un trou qui revient dans la phrase reçoit la même chose qu'à sa première fois.
      if (vus.has(morceau)) return `\\k<${morceau}>`;
      vus.add(morceau);
      return `(?<${morceau}>.+?)`;
    })
    .join('');
  const lu = new RegExp(`^${motif}$`, 'su').exec(lisible(texte));
  return lu === null ? undefined : { ...lu.groups };
}

/** Vrai si le texte est cette phrase, remplie. */
export const estLaPhrase = (modele: string, texte: string): boolean => trousDe(modele, texte) !== undefined;

/** Un nombre écrit à la française, relu : rien si ce n'en est pas un. */
export function nombreLu(ecrit: string | undefined): number | undefined {
  if (ecrit === undefined || !/^-?\d+(,\d+)?$/.test(ecrit)) return undefined;
  return Number(ecrit.replace(',', '.'));
}
