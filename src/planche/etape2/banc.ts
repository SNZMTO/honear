/**
 * Le banc d'essai (outils/banc.py mesure) : les scènes qu'il mesure, ce qu'il en retient, et ses relevés. Pour la scène entière
 * et pour chacun de ses allègements : le premier dessin, ce que le fil principal travaille par image et la part qu'y prend
 * le script, puis le temps entre deux images pendant chaque phase de la piste. Les relevés sont recopiés tels quels :
 * on les refait quand la scène ou son montage changent.
 */

import { MODE_LEGER, SCENE_ENTIERE, type Allegements } from '../../ecran/allegements';
import type { PhaseDePiste } from '../../regles/piste';

/** Les scènes mesurées : la scène entière, ce que chaque allègement lui retire, et le mode léger, qui les réunit. */
export const SCENES_DE_BANC = {
  entiere: SCENE_ENTIERE,
  sansReactions: { ...SCENE_ENTIERE, sansReactions: true, ombresFigees: true },
  demiDefinition: { ...SCENE_ENTIERE, demiDefinition: true },
  densiteSobre: { ...SCENE_ENTIERE, densiteSobre: true },
  modeLeger: MODE_LEGER,
} as const satisfies Readonly<Record<string, Allegements>>;
export type SceneDeBanc = keyof typeof SCENES_DE_BANC;

/**
 * La fluidité qu'on vise : tant d'images par seconde. Et le temps entre deux images, en ms, au-delà duquel l'une d'elles
 * est arrivée en retard : une fois et demie ce qu'il devrait être.
 */
export const FLUIDITE = { cadence: 60, enRetard: 25 } as const;

/** Le temps médian entre deux images, en ms, et la part des images arrivées en retard, en pour cent. */
export interface Fluidite {
  readonly mediane: number;
  readonly longues: number;
}

/** Ce qu'une suite de temps entre deux images dit de la fluidité, et le pire d'entre eux. */
export function fluiditeDe(intervalles: readonly number[]): Fluidite & { readonly pire: number } {
  if (intervalles.length === 0) return { mediane: 0, longues: 0, pire: 0 };
  const tries = [...intervalles].sort((a, b) => a - b);
  return {
    mediane: tries[Math.floor(tries.length / 2)] ?? 0,
    longues: (100 * tries.filter((intervalle) => intervalle > FLUIDITE.enRetard).length) / tries.length,
    pire: tries[tries.length - 1] ?? 0,
  };
}

export type ReleveDeBanc = {
  readonly scene: SceneDeBanc;
  /** Le premier dessin : dessiner les polygones, puis figer les toiles, en ms. */
  readonly montage: number;
  /** Ce que le fil principal du navigateur travaille par image, en ms : le script, le style, la mise en page, la peinture. */
  readonly fil: number;
  /** Dans ce travail, la part du script, par image, en ms : le moteur de mouvement, les réglages, leur écriture dans la page. */
  readonly script: number;
} & Readonly<Record<PhaseDePiste, Fluidite>>;

export interface Banc {
  /** Combien de fois le fil principal du navigateur est ralenti, et combien de px d'appareil par px. */
  readonly ralenti: number;
  readonly definition: number;
  readonly releves: readonly ReleveDeBanc[];
}

/** Les relevés, écrits par outils/banc.py : on ne les retouche pas à la main. */
export const BANCS: readonly Banc[] = [
  {
    ralenti: 4,
    definition: 3,
    releves: [
      {
        scene: 'entiere',
        montage: 1410,
        fil: 8.7,
        script: 2,
        decompte: { mediane: 16.6, longues: 1.7 },
        extrait: { mediane: 16.6, longues: 3 },
        revelation: { mediane: 16.7, longues: 2.4 },
      },
      {
        scene: 'sansReactions',
        montage: 1368,
        fil: 8,
        script: 1.8,
        decompte: { mediane: 16.6, longues: 1.1 },
        extrait: { mediane: 16.7, longues: 2.4 },
        revelation: { mediane: 16.7, longues: 3.2 },
      },
      {
        scene: 'demiDefinition',
        montage: 668,
        fil: 8.5,
        script: 1.9,
        decompte: { mediane: 16.6, longues: 2.3 },
        extrait: { mediane: 16.7, longues: 2 },
        revelation: { mediane: 16.6, longues: 2.4 },
      },
      {
        scene: 'densiteSobre',
        montage: 727,
        fil: 8.7,
        script: 1.8,
        decompte: { mediane: 16.7, longues: 2.8 },
        extrait: { mediane: 16.6, longues: 1.9 },
        revelation: { mediane: 16.7, longues: 2.4 },
      },
      {
        scene: 'modeLeger',
        montage: 301,
        fil: 7.8,
        script: 1.7,
        decompte: { mediane: 16.7, longues: 1.1 },
        extrait: { mediane: 16.6, longues: 1.2 },
        revelation: { mediane: 16.6, longues: 2 },
      },
    ],
  },
  {
    ralenti: 8,
    definition: 3,
    releves: [
      {
        scene: 'entiere',
        montage: 2880,
        fil: 16.3,
        script: 3.8,
        decompte: { mediane: 18.5, longues: 20.7 },
        extrait: { mediane: 20.4, longues: 27.6 },
        revelation: { mediane: 19.5, longues: 23.6 },
      },
      {
        scene: 'sansReactions',
        montage: 2930,
        fil: 16.2,
        script: 4,
        decompte: { mediane: 18.6, longues: 18.2 },
        extrait: { mediane: 20.1, longues: 21.9 },
        revelation: { mediane: 18.6, longues: 19.9 },
      },
      {
        scene: 'demiDefinition',
        montage: 1293,
        fil: 16.6,
        script: 4,
        decompte: { mediane: 18.8, longues: 16.2 },
        extrait: { mediane: 20.1, longues: 23 },
        revelation: { mediane: 19.3, longues: 19.2 },
      },
      {
        scene: 'densiteSobre',
        montage: 1580,
        fil: 16.2,
        script: 3.8,
        decompte: { mediane: 18.9, longues: 19.4 },
        extrait: { mediane: 20.3, longues: 24.8 },
        revelation: { mediane: 19.1, longues: 20.2 },
      },
      {
        scene: 'modeLeger',
        montage: 702,
        fil: 15.4,
        script: 3.6,
        decompte: { mediane: 18, longues: 17.5 },
        extrait: { mediane: 19.6, longues: 19.8 },
        revelation: { mediane: 18.5, longues: 19.8 },
      },
    ],
  },
];
