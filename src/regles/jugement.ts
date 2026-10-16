/**
 * Le jugement d'une réponse tapée, comparée à ce qu'on attend (un titre, ou un artiste). On tolère les accents, les majuscules,
 * la ponctuation, les « feat. » et ce qui les suit, les parenthèses, les petits mots du début, des fautes de frappe, et les fautes
 * d'orthographe : ce qui s'écrit autrement mais se dit pareil (« bionsé », « angel », « nekfeu » tapé « neckfeu »).
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

/**
 * Ce qu'on entend d'un texte déjà normalisé : les lettres qui se disent pareil ramenées à une seule (ph et f, c dur et k, c doux
 * et s, y et i, z et s, w et ou, ou et u, au et o, ai et é, g doux et j), le h muet ôté, les lettres doublées simplifiées, le e,
 * le s et le x muets de la fin d'un mot oubliés. « Beyoncé » et « bionsé » s'y entendent presque pareil ; « Angèle » et
 * « angel », pareil.
 */
export function aLOreille(texte: string): string {
  return texte
    .split(' ')
    .map((mot) =>
      mot
        .replace(/ph/g, 'f')
        .replace(/s?ch|sh/g, '§')
        .replace(/([tg])h/g, '$1')
        .replace(/ck|qu|q/g, 'k')
        .replace(/c(?=[eiy])/g, 's')
        .replace(/c/g, 'k')
        .replace(/gu(?=[eiy])/g, 'g')
        .replace(/g(?=[eiy])/g, 'j')
        .replace(/y/g, 'i')
        .replace(/z/g, 's')
        .replace(/w/g, 'u')
        .replace(/eau|au/g, 'o')
        .replace(/ou|oo/g, 'u')
        .replace(/ai|ei/g, 'e')
        .replace(/ee|ea/g, 'i')
        .replace(/h/g, '')
        .replace(/(.)\1+/g, '$1')
        .replace(/(..)[esx]$/, '$1'),
    )
    .join(' ');
}

/**
 * Les fautes d'un mot à l'autre, quand elles peuvent compter : au-delà de `auPlus`, le compte exact ne change aucun verdict. Deux
 * longueurs trop éloignées le disent d'avance (une faute change la longueur d'une lettre au plus), sans rien compter : une saisie
 * très longue, comparée à une réponse courte, ne coûte plus rien.
 */
const fautesAuPlus = (a: string, b: string, auPlus: number): number => (Math.abs(a.length - b.length) > auPlus ? auPlus + 1 : fautes(a, b));

/** Une saisie comparée à ce qu'on attend : juste, presque, ou faux. */
export function juger(saisie: string, attendu: string): Verdict {
  const s = normaliser(saisie);
  const t = normaliser(attendu);
  if (s === '' || t === '') return 'faux';
  // Sans les espaces, « lesdemons » et « les demons » sont la même saisie ; et l'on compare aussi les petits mots du début gardés.
  const colle = (x: string): string => x.replace(/ /g, '');
  const lettres = t.replace(/ /g, '').length;
  // Au-delà de ce nombre de fautes, ce n'est ni « Juste » ni « Presque » : inutile de les compter toutes.
  const auPlus = Math.max(Math.floor(lettres / JUGEMENT.lettresParFaute), lettres * JUGEMENT.presque);
  const n = Math.min(
    fautesAuPlus(s, t, auPlus),
    fautesAuPlus(colle(s), colle(t), auPlus),
    fautesAuPlus(colle(normaliser(saisie, false)), colle(normaliser(attendu, false)), auPlus),
  );
  if (n <= Math.floor(lettres / JUGEMENT.lettresParFaute)) return 'juste';
  // À l'oreille : une faute d'orthographe qui se dit pareil passe, avec un peu moins de fautes de frappe en plus.
  const [os, ot] = [colle(aLOreille(s)), colle(aLOreille(t))];
  const aLOreilleAuPlus = Math.floor(ot.length / JUGEMENT.lettresParFauteALOreille);
  if (fautesAuPlus(os, ot, aLOreilleAuPlus) <= aLOreilleAuPlus) return 'juste';
  if (n <= lettres * JUGEMENT.presque) return 'presque';
  // Un morceau de la bonne réponse, assez long (« les démons de » pour « Les Démons de minuit »), ou la bonne réponse et autre chose.
  const morceau = colle(s).length >= lettres * JUGEMENT.morceau && t.includes(s);
  return morceau || s.includes(t) ? 'presque' : 'faux';
}
