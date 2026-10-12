/**
 * Le logo montré seul, en grand : l'étiquette de l'accueil sur son vinyle, le même que celui de la platine, agrandi,
 * et vu comme tout le reste du meuble.
 */

import { peindre } from '../lowpoly/facette';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Densite } from '../ressources/densites';
import { ETIQUETTE } from '../ressources/etiquette';
import type { Textes } from '../ressources/textes';
import { calque, peinture, type Calque, type Mesure } from './calque';
import { faceDuLogo } from './etiquette/logo';
import { echelleDEtiquette, type Etiquette } from './etiquette/papier';
import { pile } from './pile';
import { vinyle } from './vinyle';

export interface Logo extends Etiquette {
  /** Centre de l'étiquette sur le meuble. */
  readonly centre: Vec2;
}

/** @param densite celle du vinyle : ses pans, ses plages et leurs sillons. */
export function dessinerLeLogo(logo: Logo, textes: Textes, mesurer: Mesure, densite: Densite): Calque {
  return calque('logo', [
    // Le dessus du vinyle est posé à hauteur du bois : l'étiquette, collée dessus, reste au centre qu'on lui a donné.
    calque('logo/vinyle', [peinture(peindre(vinyle({ centre: logo.centre, dessus: 0, echelle: echelleDEtiquette(logo) }, densite)))], {
      role: 'image',
    }),
    pile('logo/etiquette', {
      role: 'mobile',
      centre: logo.centre,
      angle: 0,
      etages: [{ nom: 'papier', hauteur: ETIQUETTE.colle, contenu: faceDuLogo(logo, textes, mesurer) }],
    }),
  ]);
}
