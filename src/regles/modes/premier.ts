/**
 * Le premier arrivé (« First one ») : on tape sur l'étiquette vierge, comme en saisie libre, mais seul compte qui trouve le premier
 * l'artiste et le titre : il gagne la piste, qui s'arrête aussitôt pour tout le monde. Le feat ne se cherche pas : un invité vaut
 * l'artiste (« Roméo Elvis » pour « Tout oublier », qu'il chante avec Angèle).
 */

import type { ModeDeJeu } from './contrat';
import { ciblesDe, jugerLesParties } from './libre';

const BAREME = { gagne: 3 } as const;

export const PREMIER_ARRIVE: ModeDeJeu = {
  cle: 'premierArrive',
  cran: 2,
  reglages: {},
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',
  aTrouver: () => ['artiste', 'titre'],
  juger(proposition, piste, dejaTrouve) {
    if (proposition.genre !== 'saisie') return { trouve: [], verdict: 'faux' };
    const { artiste, titre, feat } = ciblesDe(piste);
    return jugerLesParties(proposition.texte, ['artiste', 'titre'], { artiste: [...artiste, ...feat], titre, feat: [] }, dejaTrouve);
  },
  points: (_trouve, premierATout) => (premierATout ? BAREME.gagne : 0),
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
  finitAuPremier: true,
};
