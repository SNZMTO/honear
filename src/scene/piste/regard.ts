/**
 * Le regard d'une piste : posé sur la platine du décompte à la révélation, il ne glisse vers le disque qu'une fois celui-ci arrêté,
 * et s'arrête sur lui : c'est là que le disque se retourne.
 */

import { AMPLEURS } from '../../ressources/mouvement';
import { etendueDuRegard, regardSurLaPlatine, type Regard } from '../meuble';
import type { PoseDeLaPiste } from './pose';

const SUR_LA_PLATINE: Regard = regardSurLaPlatine();

/** Toute la portion du meuble que le regard parcourt pendant une piste : c'est ce qu'il faut en dessiner, une fois. */
export const ETENDUE_DE_LA_PISTE: Regard = etendueDuRegard(SUR_LA_PLATINE, AMPLEURS.regardSurLaReponse);

/** Le regard dans une pose donnée : ce qu'on voit du meuble à cet instant. */
export const regardDeLaPiste = (pose: Pick<PoseDeLaPiste, 'regard'>): Regard => ({
  ...SUR_LA_PLATINE,
  origine: [SUR_LA_PLATINE.origine[0] + pose.regard, SUR_LA_PLATINE.origine[1]],
});
