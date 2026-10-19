/**
 * Les réponses qu'on propose quand le mode fait toucher des étiquettes : la bonne, et des leurres pris dans la même playlist, à des
 * places tirées au sort. Une source de musique ne donne que des pistes ; c'est le serveur qui fabrique les choix, comme le mode
 * les veut (combien), et une piste qui a déjà les siens les garde.
 */

import { modeADeviner, type CleDeMode, type PisteDuMode } from '../regles/modes';
import { memeReponse, type Reponse } from '../regles/piste';
import type { Tirage } from '../regles/pochette';

/** Combien de réponses un mode propose : son réglage « choix », ou aucun s'il fait taper la réponse (ou s'il n'a rien à deviner). */
function combienDeChoix(cle: CleDeMode): number {
  const mode = modeADeviner(cle);
  return mode?.sousLePouce === 'etiquettesAToucher' ? (mode.reglages['choix'] ?? 0) : 0;
}

/** Un entier de zéro à n - 1, tiré au sort. */
const unRang = (n: number, tirage: Tirage): number => Math.min(n - 1, Math.floor(tirage() * n));

/** Les pistes de la playlist, chacune avec ses choix si le mode en veut : la bonne réponse parmi des leurres tous différents. */
export function avecDesChoix(pistes: readonly PisteDuMode[], mode: CleDeMode, tirage: Tirage): PisteDuMode[] {
  const n = combienDeChoix(mode);
  if (n < 2) return [...pistes];
  return pistes.map((piste, rang): PisteDuMode => {
    if (piste.choix !== undefined && piste.choix.length >= n) return piste;
    const autres = pistes.filter((p, r) => r !== rang && !memeReponse(p.reponse, piste.reponse)).map((p) => p.reponse);
    const leurres: Reponse[] = [];
    while (leurres.length < n - 1 && autres.length > 0) {
      const [pris] = autres.splice(unRang(autres.length, tirage), 1);
      if (pris !== undefined && !leurres.some((l) => memeReponse(l, pris))) leurres.push(pris);
    }
    const choix = [...leurres];
    choix.splice(unRang(choix.length + 1, tirage), 0, piste.reponse);
    return { ...piste, choix };
  });
}
