/**
 * Le fondu de l'étiquette : ce que la vitesse fait de son texte. Lent, on le lit. À mesure que le disque prend de la vitesse,
 * ses lettres laissent derrière elles une traînée (deux copies d'elles-mêmes, tournées en arrière, d'autant plus écartées
 * qu'il va vite), puis s'effacent sous des arcs courts, que des arcs longs viennent allonger à pleine vitesse.
 * Au ralenti, le même chemin à l'envers. Rien n'est redessiné : chaque dessin est déjà fait, il change d'opacité,
 * et seules les copies de la traînée tournent.
 */

import { AMPLEURS } from '../../ressources/mouvement';

/** Ce que l'étiquette laisse lire : son texte entier, des arcs qui ne sont pas encore seuls, ou ses arcs longs, seuls. */
export type FaceDEtiquette = 'texte' | 'arcsCourts' | 'arcsLongs';

/** La part qu'on voit de chaque dessin de l'étiquette, de 0 à 1 ; et l'écart de la traînée, en degrés. */
export interface FonduDEtiquette {
  readonly texte: number;
  /** Une opacité par copie de la traînée, de la plus proche des lettres à la plus lointaine. */
  readonly trainee: readonly number[];
  /** De combien chaque copie tourne en arrière de la précédente. */
  readonly ecart: number;
  readonly arcsCourts: number;
  readonly arcsLongs: number;
}

const E = AMPLEURS.etiquette;

/** Le nombre de copies de la traînée : chacune pèse autant de lettres que le texte. */
export const COPIES_DE_LA_TRAINEE: number = E.trainee.opacites.length;

/** De 0 à 1, sans à-coup aux bouts, entre deux vitesses. */
function rampe(vitesse: number, { de, a }: { readonly de: number; readonly a: number }): number {
  const x = Math.min(1, Math.max(0, (vitesse - de) / (a - de)));
  return x * x * (3 - 2 * x);
}

/** Le fondu à cette vitesse du plateau, en degrés par seconde. Il ne dépend que d'elle : un écran en retard le lit sans rien rejouer. */
export function fonduSelonLaVitesse(vitesse: number): FonduDEtiquette {
  const v = Math.abs(vitesse);
  const trainee = rampe(v, E.trainee.parait) * (1 - rampe(v, E.trainee.sEfface));
  return {
    texte: 1 - rampe(v, E.texte),
    trainee: E.trainee.opacites.map((part) => part * trainee),
    ecart: E.trainee.retard * v,
    // Les arcs longs prolongent les courts : ceux-ci ne s'effacent dessous qu'une fois les longs presque là.
    arcsCourts: rampe(v, E.arcsCourts.parait) * (1 - rampe(v, E.arcsCourts.sEfface)),
    arcsLongs: rampe(v, E.arcsLongs),
  };
}

/** Le fondu d'une étiquette qui ne montre qu'un de ses dessins, d'un coup : à l'arrêt, en version sobre, ou cachée sous ses arcs longs. */
export function fonduDUneFace(face: FaceDEtiquette): FonduDEtiquette {
  return {
    texte: face === 'texte' ? 1 : 0,
    trainee: E.trainee.opacites.map(() => 0),
    ecart: 0,
    arcsCourts: face === 'arcsCourts' ? 1 : 0,
    arcsLongs: face === 'arcsLongs' ? 1 : 0,
  };
}

/** Une étiquette qui ne montre qu'un de ses dessins : ce qu'elle laisse lire, et son fondu. */
export const seulement = (face: FaceDEtiquette): { readonly montre: FaceDEtiquette; readonly fondu: FonduDEtiquette } => ({
  montre: face,
  fondu: fonduDUneFace(face),
});

/** Ce que laisse lire un fondu : le texte tant qu'il est entier et qu'aucun arc ne le couvre ; les arcs longs quand ils sont seuls. */
export function faceDuFondu(f: FonduDEtiquette): FaceDEtiquette {
  if (f.texte >= 1 && f.arcsCourts <= 0 && f.arcsLongs <= 0) return 'texte';
  return f.arcsLongs >= 1 && f.texte <= 0 && f.arcsCourts <= 0 && f.trainee.every((part) => part <= 0) ? 'arcsLongs' : 'arcsCourts';
}
