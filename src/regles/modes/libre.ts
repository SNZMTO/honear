/**
 * La saisie libre : on tape ce qu'on reconnaît sur l'étiquette vierge, l'artiste, le titre, le feat s'il y en a un, une partie
 * ou plusieurs d'un coup, dans l'ordre qu'on veut. 1 point par partie, 1 de plus au premier qui a tout trouvé. On réessaie autant qu'on veut.
 */

import { JUGEMENT } from '../../ressources/reglages';
import { juger, type Verdict } from '../jugement';
import type { ModeDeJeu, PisteDuMode } from './contrat';

type Partie = 'artiste' | 'titre' | 'feat';
const BAREME = { parPartie: 1, premierATout: 1 } as const;

/** Ce qu'il y a à trouver : l'artiste et le titre, et le feat quand la piste en a un. */
const partiesDe = ({ reponse }: PisteDuMode): Partie[] => (reponse.feat !== undefined ? ['artiste', 'titre', 'feat'] : ['artiste', 'titre']);

const LIAISON = new RegExp(`\\b(?:${JUGEMENT.liaisons.join('|')})\\b\\.?`, 'giu');

/** Toutes les façons d'enchaîner des parties : chacune seule, puis deux, puis trois, dans tous les ordres. */
function enchainements(parties: readonly Partie[]): Partie[][] {
  if (parties.length === 0) return [];
  return parties.flatMap((p, i) => {
    const reste = parties.filter((_, j) => j !== i);
    return [[p], ...enchainements(reste).map((suite) => [p, ...suite])];
  });
}

const RANG: Readonly<Record<Verdict, number>> = { faux: 0, presque: 1, juste: 2 };

export const LIBRE: ModeDeJeu = {
  cle: 'libre',
  cran: 0,
  reglages: {},
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',
  aTrouver: partiesDe,
  juger(proposition, piste, dejaTrouve) {
    if (proposition.genre !== 'saisie') return { trouve: [], verdict: 'faux' };
    const parties = partiesDe(piste);
    const attendu = (p: Partie): string => piste.reponse[p] ?? '';
    // Une saisie se lit entière, et en morceaux de part et d'autre d'un « feat » : « Angèle feat. Roméo Elvis ».
    const texte = proposition.texte;
    const morceaux = [texte, ...texte.split(LIAISON)].filter((m) => m.trim() !== '');
    const meilleur = (p: Partie): Verdict => morceaux.map((m) => juger(m, attendu(p))).reduce<Verdict>((a, b) => (RANG[b] > RANG[a] ? b : a), 'faux');
    // Plusieurs d'un coup : « Images, Les Démons de minuit », « Tout oublier Angèle Roméo Elvis », dans un ordre ou dans un autre.
    // La saisie telle quelle compte aussi : un titre peut contenir un mot de liaison (« Avec le temps »).
    const lectures = [texte, texte.replace(LIAISON, ' ')];
    const enUnCoup = enchainements(parties)
      .filter((suite) => suite.length > 1 && lectures.some((l) => juger(l, suite.map(attendu).join(' ')) === 'juste'))
      .flat();
    const trouve = parties.filter((p) => !dejaTrouve.includes(p) && (enUnCoup.includes(p) || meilleur(p) === 'juste'));
    if (trouve.length > 0) return { trouve, verdict: 'juste' };
    const presque = parties.some((p) => !dejaTrouve.includes(p) && meilleur(p) === 'presque');
    return { trouve: [], verdict: presque ? 'presque' : 'faux' };
  },
  points: (trouve, premierATout) => trouve.length * BAREME.parPartie + (premierATout ? BAREME.premierATout : 0),
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
};
