/**
 * Ce qu'on peut choisir dans l'atelier : la vitesse du temps, la façon dont le disque montre la réponse, la version sobre,
 * le mode léger. Et ce qu'il montre à l'ouverture, avant qu'on ait touché à rien : la page écrit ses touches d'après cela,
 * son script ouvre la scène d'après cela, et les deux ne peuvent pas se contredire.
 */

import { MODE_LEGER, SCENE_ENTIERE } from '../../ecran/allegements';
import type { OptionsDEcran } from '../../ecran/piste';
import { VERSO_DU_JEU, type GenreDeVerso } from '../../scene/disque/verso';

/** Les vitesses auxquelles l'atelier rejoue la piste : la vraie, puis ses deux ralentis. */
export const VITESSES = [1, 0.5, 0.25] as const;
export type Vitesse = (typeof VITESSES)[number];

/** Ce que l'atelier demande à l'écran de la piste, et la vitesse à laquelle il fait passer le temps. */
export interface OptionsDAtelier extends OptionsDEcran {
  /** La vitesse du temps : 1, ou moins pour un ralenti. */
  readonly vitesse: Vitesse;
}

/** Ce que les touches de l'atelier tiennent : un cran de vitesse, un cran de verso, et deux poussoirs. */
export interface ChoixDAtelier {
  readonly vitesse: Vitesse;
  readonly verso: GenreDeVerso;
  /** La version sobre : celle de qui a demandé moins d'animations. */
  readonly sobre: boolean;
  /** Le mode léger : tous les allègements à la fois. */
  readonly leger: boolean;
}

/** À l'ouverture : la vraie vitesse, le verso du jeu, la scène entière. La version sobre, elle, dépend de l'appareil : c'est le script qui la lit. */
export const A_L_OUVERTURE: Omit<ChoixDAtelier, 'sobre'> = { vitesse: VITESSES[0], verso: VERSO_DU_JEU, leger: false };

/** Les options que ces choix demandent à l'atelier. */
export const optionsDe = ({ vitesse, verso, sobre, leger }: ChoixDAtelier): OptionsDAtelier => ({
  vitesse,
  verso,
  sobre,
  allegements: leger ? MODE_LEGER : SCENE_ENTIERE,
});
