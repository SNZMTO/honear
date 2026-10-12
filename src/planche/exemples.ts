/**
 * Ce que les planches montrent : la platine de l'accueil, la pochette d'un joueur, une piste et sa réponse.
 * Des données d'exemple, bâties à partir des textes et des réglages du site.
 */

import type { Reponse } from '../regles/piste';
import type { Pochette } from '../ressources/pochettes';
import { REGLAGES } from '../ressources/reglages';
import type { Textes } from '../ressources/textes';
import type { DecorDeLaPiste } from '../scene/piste/dessin';
import { decorDeLaPiste } from '../scene/telephone/meuble';

/** La platine et le disque de l'accueil sont ceux du jeu : les planches les montrent tels quels. */
export { disqueDeLAccueil, platineDeLAccueil } from '../scene/telephone/meuble';

/** La pochette de la planche : Tonton Reverb, tête ronde, cheveux courts, chemise rouge tomate. */
export function pochetteDExemple(textes: Textes): Pochette {
  return {
    artiste: textes.exemples.artiste,
    album: textes.exemples.album,
    fond: 'bleuPetrole',
    motif: 'rayons',
    avatar: { tete: 'ronde', dessus: 'courts', peau: 'vieuxRose', cheveux: 'noyerSombre', tenue: 'rougeTomate' },
  };
}

/** La piste des planches : la troisième d'une partie aux réglages par défaut, sur la platine de l'accueil. */
export const pisteDExemple = (textes: Textes): DecorDeLaPiste => decorDeLaPiste(textes, 0, { numero: 3, sur: REGLAGES.pistes.defaut });

/** Sa réponse : un vrai titre connu, et une vignette à la place de sa pochette. */
export function reponseDExemple(textes: Textes): Reponse {
  return { titre: textes.exemples.titre, artiste: textes.exemples.interprete, pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } };
}
