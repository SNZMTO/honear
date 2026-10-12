/**
 * Trois modes d'exemple, écrits avec le contrat seul, sans rien toucher au socle : ceux que montrent les notes techniques.
 * Ils ne sont pas dans le registre (leurs crans et leurs écrans attendent qu'on les dessine) ; les tests les font jouer contre le socle.
 * Pour en faire de vrais modes : un fichier chacun dans `src/regles/modes/`, une ligne dans le registre, leurs noms dans les textes.
 */

import type { ModeDeJeu, PisteDuMode, PropositionDeLaPiste } from '../src/regles/modes';
import { LIBRE } from '../src/regles/modes/libre';

/** L'année tapée, si la saisie en contient une : quatre chiffres. */
const anneeTapee = (texte: string): number | undefined => {
  const trouvee = /\b(\d{4})\b/.exec(texte)?.[1];
  return trouvee !== undefined ? Number(trouvee) : undefined;
};

const ANNEE_BAREME = { exacte: 2, plusProche: 1 } as const;
/** À tant d'années près, c'est « Presque. ». */
const ANNEE_PRESQUE = 2;

/**
 * « Année » : on tape l'année de sortie ; la bonne vaut 2 points, à deux ans près c'est « Presque. ». Si personne ne l'a,
 * le plus proche marque 1 point à la révélation (les ex æquo aussi) : c'est le départage du contrat.
 */
export const ANNEE: ModeDeJeu = {
  cle: 'annee',
  cran: 2,
  reglages: {},
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',
  aTrouver: () => ['annee'],
  juger(proposition, piste) {
    const vraie = piste.reponse.annee;
    const tapee = proposition.genre === 'saisie' ? anneeTapee(proposition.texte) : undefined;
    if (vraie === undefined || tapee === undefined) return { trouve: [], verdict: 'faux' };
    if (tapee === vraie) return { trouve: ['annee'], verdict: 'juste' };
    return { trouve: [], verdict: Math.abs(tapee - vraie) <= ANNEE_PRESQUE ? 'presque' : 'faux' };
  },
  points: (trouve) => (trouve.length > 0 ? ANNEE_BAREME.exacte : 0),
  departager(piste: PisteDuMode, propositions: readonly PropositionDeLaPiste[]) {
    const vraie = piste.reponse.annee;
    if (vraie === undefined) return {};
    const ecarts = propositions.flatMap(({ id, proposition }) => {
      const tapee = proposition.genre === 'saisie' ? anneeTapee(proposition.texte) : undefined;
      return tapee !== undefined ? [{ id, ecart: Math.abs(tapee - vraie) }] : [];
    });
    const plusPetit = Math.min(...ecarts.map((e) => e.ecart));
    // Quelqu'un l'a eue : il a marqué en répondant, personne ne départage.
    if (ecarts.length === 0 || plusPetit === 0) return {};
    return Object.fromEntries(ecarts.filter((e) => e.ecart === plusPetit).map((e) => [e.id, ANNEE_BAREME.plusProche]));
  },
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
};

/** « Intro express » : la saisie libre, sur 3 secondes d'extrait, quel que soit le réglage du bouton « Extrait ». */
export const INTRO_EXPRESS: ModeDeJeu = { ...LIBRE, cle: 'introExpress', cran: 3, extrait: 3 };

/** « Équipes » : la saisie libre, les joueurs répartis en deux équipes ; les points se mettent en commun, la tablée en deux piles. */
export const EQUIPES: ModeDeJeu = { ...LIBRE, cle: 'equipes', cran: 4, equipes: 2 };

export const MODES_D_EXEMPLE: readonly ModeDeJeu[] = [ANNEE, INTRO_EXPRESS, EQUIPES];
