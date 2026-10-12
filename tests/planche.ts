/** Les images de la planche de rendu et celles de la piste, fabriquées une fois pour tous les tests qui les regardent. */

import { imagesDeLaPisteAControler } from '../src/planche/etape2/images';
import { chargerLEncrier } from '../src/planche/polices';
import { imagesDeLaPlanche } from '../src/planche/scenes';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque, Dessin } from '../src/scene/calque';

export const ENCRIER = chargerLEncrier(TEXTES.langue);
/** La planche de l'étape 1. */
export const IMAGES = imagesDeLaPlanche(TEXTES, ENCRIER);
/** La piste à ses instants marquants : en densité fine, la réponse sur l'étiquette ; en densité sobre, sur tout le disque. */
export const IMAGES_DE_LA_PISTE = imagesDeLaPisteAControler(TEXTES, ENCRIER);
/** Tout ce qui a été dessiné jusqu'ici : ce que les règles du rendu doivent tenir partout. */
export const TOUTES_LES_IMAGES = [...IMAGES, ...IMAGES_DE_LA_PISTE];

export function image(fichier: string): (typeof IMAGES)[number] {
  const trouvee = IMAGES.find((i) => i.fichier === fichier);
  if (trouvee === undefined) throw new Error(`Pas d'image « ${fichier} » sur la planche.`);
  return trouvee;
}

/** Tous les calques d'une scène, elle comprise. */
export function calques(dessin: Dessin): Calque[] {
  return dessin.genre === 'calque' ? [dessin, ...dessin.contenu.flatMap(calques)] : [];
}

export function calque(scene: Calque, nom: string): Calque {
  const trouve = calques(scene).find((c) => c.nom === nom);
  if (trouve === undefined) throw new Error(`Pas de calque « ${nom} » dans la scène.`);
  return trouve;
}

/** Tout ce qui est dessiné dans un calque, à plat, sans les calques eux-mêmes. */
export function dessins(dessin: Dessin): Exclude<Dessin, Calque>[] {
  return dessin.genre === 'calque' ? dessin.contenu.flatMap(dessins) : [dessin];
}
