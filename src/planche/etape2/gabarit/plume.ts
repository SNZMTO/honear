/**
 * La plume du gabarit : de quoi écrire un texte dans la page. Rendu inoffensif, avec les espaces que sa langue ne coupe pas.
 * Elle n'est que pour les textes qu'on lit : un identifiant, une valeur de formulaire s'écrivent tels quels.
 */

import type { Textes } from '../../../ressources/textes';
import { enXml } from '../../../scene/rendu/balisage';
import { espacer } from '../../../scene/typographie';

export type Plume = (texte: string) => string;

export const plumeDe =
  (textes: Textes): Plume =>
  (texte) =>
    enXml(espacer(texte, textes.typographie));
