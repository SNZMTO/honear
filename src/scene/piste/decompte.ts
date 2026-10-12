/**
 * Le décompte, vu de sa pastille : le chiffre qu'elle montre à chaque instant. Il change d'un coup, comme une image imprimée :
 * il ne passe pas par le moteur de mouvement.
 */

import { chiffreDuDecompte } from '../../regles/piste';
import { TEMPS } from '../../ressources/mouvement';
import type { PisteEnScene } from './etat';
import { instantsDeLaPiste } from './instants';

/** Le chiffre que montre la pastille du décompte à l'instant t, ou rien si elle n'est pas là. Si l'extrait tarde, elle reste sur le « 1 ». */
export function chiffreDeLaPastille(scene: PisteEnScene, t: number): string | undefined {
  const { piste } = scene;
  if (piste === undefined) return undefined;
  const T = instantsDeLaPiste(piste);
  // Décollée quand l'extrait part, elle garde son chiffre le temps de filer hors du cadre.
  if (t < T.trois || t >= T.extrait + TEMPS.pastille.disparait) return undefined;
  return String(chiffreDuDecompte(piste, t) ?? 1);
}
