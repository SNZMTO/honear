/**
 * Le premier arrivé (« First one ») : on tape sur l'étiquette vierge, comme en saisie libre, mais seul compte qui trouve le premier
 * l'artiste et le titre : il gagne la piste, qui s'arrête aussitôt pour tout le monde. Le feat ne se cherche pas.
 */

import type { Reponse } from '../piste';
import type { ModeDeJeu, PisteDuMode } from './contrat';
import { LIBRE } from './libre';

const BAREME = { gagne: 3 } as const;

/** La piste sans son feat : il n'y a à trouver que l'artiste et le titre. */
function sansFeat(piste: PisteDuMode): PisteDuMode {
  const { titre, artiste, pochette } = piste.reponse;
  const reponse: Reponse = { titre, artiste, pochette };
  return { ...piste, reponse };
}

export const PREMIER_ARRIVE: ModeDeJeu = {
  cle: 'premierArrive',
  cran: 2,
  reglages: {},
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',
  aTrouver: () => ['artiste', 'titre'],
  juger: (proposition, piste, dejaTrouve) => LIBRE.juger(proposition, sansFeat(piste), dejaTrouve),
  points: (_trouve, premierATout) => (premierATout ? BAREME.gagne : 0),
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
  finitAuPremier: true,
};
