/**
 * Le jugement d'une réponse tapée, comparée à ce qu'on attend (un titre, ou un artiste). On tolère les accents, les majuscules,
 * la ponctuation, les « feat. » et ce qui les suit, les parenthèses, les petits mots du début, et quelques fautes de frappe.
 * Une réponse proche mais pas assez vaut un « Presque. ». Des fonctions pures : elles se testent sans navigateur.
 */

import { JUGEMENT } from '../ressources/reglages';

export type Verdict = 'juste' | 'presque' | 'faux';

/** Les lettres liées qu'aucune décomposition n'ôte. */
const LIGATURES: Readonly<Record<string, string>> = { œ: 'oe', æ: 'ae', ß: 'ss' };

/**
 * Ce qui reste d'une saisie quand on ne garde que ce qui compte : des lettres et des chiffres sans accents, des mots séparés d'une espace.
 * @param articles faux pour garder les petits mots du début.
 */
export function normaliser(texte: string, articles = true): string {
  const mots = texte
    .toLowerCase()
    .replace(/[œæß]/g, (l) => LIGATURES[l] ?? l)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\b.*$/, ' ')
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((m) => m !== '');
  // Les petits mots du début : « Démons de minuit » pour « Les Démons de minuit ».
  while (articles && mots.length > 1 && (JUGEMENT.articles as readonly string[]).includes(mots[0] ?? '')) mots.shift();
  return mots.join(' ');
}

/** Le nombre de fautes de frappe d'un mot à l'autre : une lettre en trop, en moins, changée, ou deux lettres voisines inversées. */
export function fautes(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const ligne = d[i] ?? [];
      const avant = d[i - 1] ?? [];
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((avant[j] ?? 0) + 1, (ligne[j - 1] ?? 0) + 1, (avant[j - 1] ?? 0) + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (d[i - 2]?.[j - 2] ?? 0) + 1);
      ligne[j] = v;
    }
  return d[a.length]?.[b.length] ?? Math.max(a.length, b.length);
}

/** Une saisie comparée à ce qu'on attend : juste, presque, ou faux. */
export function juger(saisie: string, attendu: string): Verdict {
  const s = normaliser(saisie);
  const t = normaliser(attendu);
  if (s === '' || t === '') return 'faux';
  // Sans les espaces, « lesdemons » et « les demons » sont la même saisie ; et l'on compare aussi les petits mots du début gardés.
  const colle = (x: string): string => x.replace(/ /g, '');
  const n = Math.min(fautes(s, t), fautes(colle(s), colle(t)), fautes(colle(normaliser(saisie, false)), colle(normaliser(attendu, false))));
  const lettres = t.replace(/ /g, '').length;
  if (n <= Math.floor(lettres / JUGEMENT.lettresParFaute)) return 'juste';
  if (n <= lettres * JUGEMENT.presque) return 'presque';
  // Un morceau de la bonne réponse, assez long (« les démons de » pour « Les Démons de minuit »), ou la bonne réponse et autre chose.
  const morceau = colle(s).length >= lettres * JUGEMENT.morceau && t.includes(s);
  return morceau || s.includes(t) ? 'presque' : 'faux';
}
