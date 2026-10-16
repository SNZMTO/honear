/**
 * La saisie libre : on tape ce qu'on reconnaît sur l'étiquette vierge, l'artiste, le titre, le feat s'il y en a un, une partie
 * ou plusieurs d'un coup, dans l'ordre qu'on veut. 1 point par partie, 1 de plus au premier qui a tout trouvé. On réessaie autant qu'on veut.
 * Un feat de plusieurs invités se trouve avec l'un d'eux : on ne demande pas de les citer tous.
 */

import { JUGEMENT } from '../../ressources/reglages';
import { juger, normaliser, type Verdict } from '../jugement';
import type { ModeDeJeu, PisteDuMode } from './contrat';

export type Partie = 'artiste' | 'titre' | 'feat';
const BAREME = { parPartie: 1, premierATout: 1 } as const;

/** Ce qu'il y a à trouver : l'artiste et le titre, et le feat quand la piste en a un. */
const partiesDe = ({ reponse }: PisteDuMode): Partie[] => (reponse.feat !== undefined ? ['artiste', 'titre', 'feat'] : ['artiste', 'titre']);

const LIAISON = new RegExp(`\\b(?:${JUGEMENT.liaisons.join('|')})\\b\\.?`, 'giu');

/** Ce qui sépare deux invités dans un feat : « Alonzo, Gradur, KeBlack & Awa Imani ». */
const ENTRE_DEUX_INVITES = /\s*(?:,|&|\+|\/|\bet\b|\band\b|\bx\b)\s*/i;

/** Les invités d'un feat, un par un : « Alonzo », « Gradur »… ; le feat tel quel s'il n'en nomme qu'un. */
export const lesInvites = (feat: string): string[] =>
  feat
    .split(ENTRE_DEUX_INVITES)
    .map((n) => n.trim())
    .filter((n) => n !== '');

/** Toutes les façons d'enchaîner des parties : chacune seule, puis deux, puis trois, dans tous les ordres. */
function enchainements(parties: readonly Partie[]): Partie[][] {
  if (parties.length === 0) return [];
  return parties.flatMap((p, i) => {
    const reste = parties.filter((_, j) => j !== i);
    return [[p], ...enchainements(reste).map((suite) => [p, ...suite])];
  });
}

const RANG: Readonly<Record<Verdict, number>> = { faux: 0, presque: 1, juste: 2 };

/**
 * Les morceaux d'une saisie, mot à mot : chaque suite de mots qui se suivent. « Kofs Jul » donne « kofs », « jul » et « kofs jul ».
 * Une partie se trouve dans l'un d'eux, sans qu'on ait à séparer ce qu'on tape d'une virgule ou d'un « feat ».
 */
function suitesDeMots(texte: string): string[] {
  const mots = normaliser(texte, false)
    .split(' ')
    .filter((m) => m !== '');
  const suites: string[] = [];
  for (let debut = 0; debut < mots.length; debut++)
    for (let fin = debut + 1; fin <= mots.length; fin++) {
      const suite = mots.slice(debut, fin).join(' ');
      if (suite.replace(/ /g, '').length >= JUGEMENT.morceauAuMoins || (debut === 0 && fin === mots.length)) suites.push(suite);
    }
  return suites;
}

/**
 * Juge une saisie, partie par partie.
 * @param cibles ce que chaque partie accepte : l'artiste, le titre, le feat entier ou l'un de ses invités.
 */
export function jugerLesParties(
  texte: string,
  parties: readonly Partie[],
  cibles: Readonly<Record<Partie, readonly string[]>>,
  dejaTrouve: readonly string[],
): { readonly trouve: Partie[]; readonly verdict: Verdict } {
  // Une saisie se lit entière, et en morceaux de part et d'autre d'un « feat » : « Angèle feat. Roméo Elvis ».
  const morceaux = [texte, ...texte.split(LIAISON)].filter((m) => m.trim() !== '');
  const meilleur = (p: Partie): Verdict =>
    morceaux.flatMap((m) => cibles[p].map((c) => juger(m, c))).reduce<Verdict>((a, b) => (RANG[b] > RANG[a] ? b : a), 'faux');
  // Plusieurs d'un coup : « Images, Les Démons de minuit », « Tout oublier Angèle Roméo Elvis », dans un ordre ou dans un autre.
  // La saisie telle quelle compte aussi : un titre peut contenir un mot de liaison (« Avec le temps »).
  const lectures = [texte, texte.replace(LIAISON, ' ')];
  const premiere = (p: Partie): string => cibles[p][0] ?? '';
  const enUnCoup = enchainements(parties)
    .filter((suite) => suite.length > 1 && lectures.some((l) => juger(l, suite.map(premiere).join(' ')) === 'juste'))
    .flat();
  // Et chaque partie dans une suite de mots de ce qu'on a tapé : « Kofs Jul », « daft punk around the world ».
  const suites = morceaux.flatMap(suitesDeMots);
  const dansUneSuite = (p: Partie): boolean => suites.some((s) => cibles[p].some((c) => juger(s, c) === 'juste'));
  const trouve = parties.filter((p) => !dejaTrouve.includes(p) && (enUnCoup.includes(p) || meilleur(p) === 'juste' || dansUneSuite(p)));
  if (trouve.length > 0) return { trouve, verdict: 'juste' };
  const presque = parties.some((p) => !dejaTrouve.includes(p) && meilleur(p) === 'presque');
  return { trouve: [], verdict: presque ? 'presque' : 'faux' };
}

/**
 * Ce que chaque partie d'une piste accepte : son artiste, son titre, ou l'un de leurs surnoms ; son feat entier ou l'un de ses
 * invités. Le vrai nom vient toujours en premier.
 */
export const ciblesDe = ({ reponse, surnoms }: PisteDuMode): Readonly<Record<Partie, readonly string[]>> => ({
  artiste: [reponse.artiste, ...(surnoms?.artiste ?? [])],
  titre: [reponse.titre, ...(surnoms?.titre ?? [])],
  feat: reponse.feat !== undefined ? [reponse.feat, ...lesInvites(reponse.feat).filter((n) => n !== reponse.feat)] : [],
});

export const LIBRE: ModeDeJeu = {
  cle: 'libre',
  cran: 0,
  reglages: {},
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',
  aTrouver: partiesDe,
  juger(proposition, piste, dejaTrouve) {
    if (proposition.genre !== 'saisie') return { trouve: [], verdict: 'faux' };
    return jugerLesParties(proposition.texte, partiesDe(piste), ciblesDe(piste), dejaTrouve);
  },
  points: (trouve, premierATout) => trouve.length * BAREME.parPartie + (premierATout ? BAREME.premierATout : 0),
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
};
