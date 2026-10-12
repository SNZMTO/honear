/**
 * Le plateau d'une piste : sa vitesse et l'angle qu'il a parcouru à chaque instant, ce que l'étiquette de son disque montre
 * selon cette vitesse (son fondu), et la dérive apparente de ses repères. Tout se lit sur l'horloge, sans rien rejouer.
 */

import { parcourir } from '../../mouvement/parcours';
import { entrainer, laisserFiler, tempsDeMiseEnVitesse, type Course } from '../../mouvement/volant';
import type { Piste } from '../../regles/piste';
import { MATIERES } from '../../ressources/mouvement';
import { faceDuFondu, fonduSelonLaVitesse, type FaceDEtiquette, type FonduDEtiquette } from '../etiquette/fondu';
import { uneFoisPar } from '../memoire';
import { instantsDeLaPiste } from './instants';

const V = MATIERES.plateau;

/** Ce que fait le plateau à l'instant t : sa vitesse, et l'angle parcouru depuis que le moteur est lancé, au « 2 ». */
export function regimeDuPlateau(piste: Piste | undefined, t: number): Course {
  if (piste === undefined) return { vitesse: 0, angle: 0 };
  const { deux, moteurCoupe } = instantsDeLaPiste(piste);
  if (t < deux) return { vitesse: 0, angle: 0 };
  if (t < moteurCoupe) return entrainer(V, 0, t - deux);
  const lance = entrainer(V, 0, moteurCoupe - deux);
  const file = laisserFiler(V, lance.vitesse, t - moteurCoupe);
  return { vitesse: file.vitesse, angle: lance.angle + file.angle };
}

/** Ce que montre l'étiquette selon la vitesse du plateau : son texte à bas régime, emporté en traînée puis fondu en arcs à mesure qu'il va vite. */
export function etiquetteSelonLaVitesse(vitesse: number): { readonly montre: FaceDEtiquette; readonly fondu: FonduDEtiquette } {
  const fondu = fonduSelonLaVitesse(vitesse);
  return { montre: faceDuFondu(fondu), fondu };
}

/**
 * La vitesse à laquelle les repères du plateau semblent tourner : celle du plateau quand il part, puis l'effet stroboscopique
 * les fait dériver en avant, en arrière, et les fige quand la vitesse est bonne. C'est le premier harmonique du repliement,
 * sans à-coup, et assez lent pour se voir pareil à 60 et à 120 images par seconde.
 */
const vitesseApparente = (vitesse: number): number => (V.croisiere / (2 * Math.PI)) * Math.sin((2 * Math.PI * vitesse) / V.croisiere);

/** Durée d'une tranche de la somme des vitesses apparentes, en secondes. */
const TRANCHE = 0.02;
/** Lancé, le plateau est tenu pour accroché à sa vitesse quand il ne lui en manque plus qu'un millionième : ses repères sont figés. */
const ACCROCHAGE: number = tempsDeMiseEnVitesse(V, 1 - 1e-6);

/** L'angle dont les repères semblent avoir tourné à chaque instant, et la vitesse à laquelle ils semblent tourner. */
export interface DeriveDesReperes {
  readonly angle: (t: number) => number;
  readonly vitesse: (t: number) => number;
}

/**
 * La dérive des repères d'une piste : la somme de leur vitesse apparente depuis le « 2 ». À la croisière ils sont figés :
 * on ne somme que la mise en vitesse et le ralentissement, une fois par piste.
 */
export const deriveDesReperes: (piste: Piste) => DeriveDesReperes = uneFoisPar((piste) => {
  const { deux, moteurCoupe, arret } = instantsDeLaPiste(piste);
  const apparente = (t: number): number => vitesseApparente(regimeDuPlateau(piste, t).vitesse);
  const lance = Math.min(deux + ACCROCHAGE, moteurCoupe);
  const enSeLancant = parcourir(apparente, deux, lance, TRANCHE);
  const enRalentissant = Number.isFinite(arret) ? parcourir(apparente, moteurCoupe, arret, TRANCHE) : () => 0;
  return {
    angle: (t) => enSeLancant(t) + enRalentissant(t),
    vitesse: (t) => ((t > deux && t < lance) || (t > moteurCoupe && t < arret) ? apparente(t) : 0),
  };
});
