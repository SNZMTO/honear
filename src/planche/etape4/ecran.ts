/**
 * L'écran « Fais ta pochette », sur la planche : celui du jeu (scene/telephone/pochette.ts), posé sur le meuble avec son titre.
 */

import type { ChoixDeLAvatar } from '../../ressources/avatar';
import type { Pochette } from '../../ressources/pochettes';
import type { Textes } from '../../ressources/textes';
import { dessinerLeMeuble } from '../../scene/meuble';
import type { Encrier } from '../../scene/rendu/texte';
import { DENSITE } from '../../scene/telephone/pieces';
import { vueDeLaPochette } from '../../scene/telephone/pochette';
import type { ImageDePlanche } from '../image';
import { LEGENDES_DE_LA_POCHETTE as L } from './legendes.fr';

/** Les options de chaque choix de l'avatar : celles de l'écran du jeu. */
export { CLES_DES_CHOIX } from '../../scene/telephone/pochette';

/** L'écran, sur le choix ouvert : ses options sont la même pochette, ce choix changé ; celle qu'on porte est un peu plus grande. */
export function dessinerLEcran(pochette: Pochette, choisi: ChoixDeLAvatar, textes: Textes, encrier: Encrier): ImageDePlanche {
  const { regard, objets } = vueDeLaPochette({ textes, encrier }, pochette, choisi);
  return { fichier: 'ecran', titre: L.sections.ecran.titre, scene: dessinerLeMeuble({ regard, densite: DENSITE, objets }), regard };
}
