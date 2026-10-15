/**
 * Les 4 choix : quatre étiquettes à toucher, une seule est la bonne. 1 point, 1 de plus au plus rapide.
 * Une étiquette touchée ne se retouche pas. Le solo a pris son cran sur la manette : rangé au-delà, il ne se choisit plus ; ses
 * écrans et ses leurres restent (les planches les montrent), prêts à revenir sur un cran.
 */

import { memeReponse } from '../piste';
import type { ModeDeJeu } from './contrat';

const BAREME = { juste: 1, plusRapide: 1 } as const;

export const QUATRE_CHOIX: ModeDeJeu = {
  cle: 'quatreChoix',
  cran: 4,
  reglages: { choix: 4 },
  phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquettesAToucher',
  aTrouver: () => ['reponse'],
  juger(proposition, piste, dejaTrouve) {
    if (proposition.genre !== 'choix' || dejaTrouve.includes('reponse')) return { trouve: [], verdict: 'faux' };
    const choisie = piste.choix?.[proposition.rang];
    return choisie !== undefined && memeReponse(choisie, piste.reponse) ? { trouve: ['reponse'], verdict: 'juste' } : { trouve: [], verdict: 'faux' };
  },
  points: (trouve, premierATout) => (trouve.length > 0 ? BAREME.juste : 0) + (premierATout ? BAREME.plusRapide : 0),
  etiquette: 'arcsPuisReponse',
  bras: 'chrono',
};
