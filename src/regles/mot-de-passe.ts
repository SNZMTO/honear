/**
 * Ce que vaut un mot de passe de compte, au téléphone comme au serveur : trop court, trop simple, l'adresse e-mail dedans, ou bon
 * (voir `MOT_DE_PASSE`). Et sa forme normale : un même mot de passe tapé sur deux claviers (un « é » d'un seul signe, ou d'un « e »
 * et de son accent) est le même.
 */

import { MOT_DE_PASSE } from '../ressources/reglages';

/** Ce qu'on dit d'un mot de passe : trop court, trop simple, qui contient l'adresse e-mail, ou bon. */
export type JugementDuMotDePasse = 'court' | 'simple' | 'adresse' | 'bon';

/** Un mot de passe tel qu'on le compare et qu'on en fait l'empreinte : en forme normale de compatibilité (NFKC). */
export const motDePasseNormal = (motDePasse: string): string => motDePasse.normalize('NFKC');

/** Les sortes de signes qu'un mot de passe mêle, chacune avec la taille de son alphabet. */
function alphabetsDe(signes: readonly string[]): number[] {
  const A = MOT_DE_PASSE.alphabets;
  const sortes: [RegExp, number][] = [
    [/[a-z]/, A.minuscules],
    [/[A-Z]/, A.majuscules],
    [/[0-9]/, A.chiffres],
    [/[^a-zA-Z0-9]/, A.signes],
  ];
  return sortes.filter(([forme]) => signes.some((s) => forme.test(s))).map(([, taille]) => taille);
}

/** Ce que vaut un mot de passe, en bits : sa longueur fois ce que vaut chacun de ses signes, d'après les sortes qu'il mêle. */
export function bitsDuMotDePasse(motDePasse: string): number {
  const signes = [...motDePasseNormal(motDePasse)];
  const alphabet = alphabetsDe(signes).reduce((s, n) => s + n, 0);
  return alphabet > 0 ? signes.length * Math.log2(alphabet) : 0;
}

/**
 * Ce qu'on dit de ce mot de passe, pour ce compte : assez long, assez riche (50 bits, ou trois sortes de signes), sans l'adresse.
 * @param email l'adresse du compte, si on la connaît : ce qui précède son arobase ne doit pas être dans le mot de passe.
 */
export function jugerUnMotDePasse(motDePasse: string, email = ''): JugementDuMotDePasse {
  const normal = motDePasseNormal(motDePasse);
  const signes = [...normal];
  if (signes.length < MOT_DE_PASSE.auMoins) return 'court';
  const nom = (email.split('@')[0] ?? '').toLowerCase();
  if (nom.length >= MOT_DE_PASSE.adresse && normal.toLowerCase().includes(nom)) return 'adresse';
  return bitsDuMotDePasse(normal) >= MOT_DE_PASSE.bits || alphabetsDe(signes).length >= MOT_DE_PASSE.sortes ? 'bon' : 'simple';
}
