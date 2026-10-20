/**
 * La partie scénarisée du prototype : toi, l'hôte, et cinq potes simulés ; trois pistes, puis la face B. Elle passe par chaque état :
 * une bonne réponse, « Presque. », « Rayé. », une piste où personne ne trouve, une connexion qui tombe et revient, un dépassement
 * au hit-parade, « Rejouer la face B ». La même partie se rejoue en 4 choix : chacun touche alors une étiquette. Ce ne sont que des
 * données : les potes les jouent (`potes.ts`), et toi tapes ce qui est écrit ici en touchant l'étiquette.
 */

import type { PisteDuMode } from '../../regles/modes';
import type { Reponse } from '../../regles/piste';
import type { Vignette } from '../../ressources/vignettes';

export type Pote = 'lady' | 'mc' | 'dj' | 'mamie' | 'baron';

/** Ce qu'un pote fait : répondre (ce qu'il tape en saisie libre, l'étiquette qu'il touche en 4 choix), couper, revenir. */
export type GesteDUnPote =
  { readonly genre: 'repondre'; readonly libre: string; readonly choix: number } | { readonly genre: 'couper' } | { readonly genre: 'revenir' };

/** Un geste d'un pote, tant de secondes après le départ de l'extrait de sa piste. */
export interface PasDUnPote {
  readonly qui: Pote;
  readonly apres: number;
  readonly fait: GesteDUnPote;
}

/** Une réponse de toi : ce qui se tape quand on touche l'étiquette vierge, et l'étiquette qu'on touche en 4 choix. */
export interface ReponseDeToi {
  readonly libre: string;
  readonly choix: number;
}

export interface PisteDuScenario {
  /** La piste, avec ses quatre réponses à toucher en 4 choix. */
  readonly attendue: PisteDuMode;
  readonly potes: readonly PasDUnPote[];
  /** Ce que toi réponds, l'un après l'autre. */
  readonly toi: readonly ReponseDeToi[];
}

const reponse = (titre: string, artiste: string, fond: Vignette['fond'], motif: Vignette['motif'], plus: Partial<Reponse> = {}): Reponse => ({
  titre,
  artiste,
  pochette: { vignette: { fond, motif } },
  ...plus,
});

const DEMONS = reponse('Les Démons de minuit', 'Images', 'lilasFume', 'rayons', { annee: 1986 });
const VOYAGE = reponse('Voyage, voyage', 'Desireless', 'bleuPetrole', 'damier', { annee: 1986 });
const FEMME = reponse('Femme libérée', 'Cookie Dingler', 'orangeBrule', 'cercles', { annee: 1984 });
const OURAGAN = reponse('Ouragan', 'Stéphanie', 'olive', 'rayures', { annee: 1986 });
const OUBLIER = reponse('Tout oublier', 'Angèle', 'vieuxRose', 'rayons', { feat: 'Roméo Elvis', annee: 2018 });
const TAXI = reponse('Joe le taxi', 'Vanessa Paradis', 'orangeBrule', 'damier', { annee: 1987 });
const BORN = reponse('Born to Be Alive', 'Patrick Hernandez', 'bleuPetrole', 'cercles', { annee: 1979 });

const repond = (qui: Pote, apres: number, libre: string, choix: number): PasDUnPote => ({ qui, apres, fait: { genre: 'repondre', libre, choix } });

export const SCENARIO = {
  /** Ce que l'hôte règle sur la platine : trois pistes, vingt secondes d'extrait, le son sur tous les téléphones. */
  reglages: { pistes: 3, extrait: 20, son: 'tous' },
  /** Le nom de la playlist d'exemple, choisie dans le bac : seule la source du prototype la connaît. */
  playlist: 'prototype',
  /** Quand chacun arrive au salon, après l'ouverture de la room, en secondes. */
  arrivees: [
    { qui: 'lady', apres: 1.2 },
    { qui: 'dj', apres: 2.1 },
    { qui: 'baron', apres: 3.4 },
    { qui: 'mc', apres: 4 },
    { qui: 'mamie', apres: 5.5 },
  ],
  /** Ce que met un pote à être prêt, une fois la piste lancée : son ampli allumé, l'extrait chargé. */
  pret: 0.6,
  pistes: [
    // 1. Une bonne réponse : Lady trouve tout la première ; toi trouves le titre, puis l'artiste.
    {
      attendue: { reponse: DEMONS, choix: [VOYAGE, DEMONS, FEMME, OURAGAN] },
      potes: [
        repond('lady', 4, 'images les démons de minuit', 1),
        repond('dj', 6.5, 'images', 1),
        repond('baron', 8, 'voyage voyage', 0),
        repond('mamie', 11, 'les demons de minuit', 1),
      ],
      toi: [
        { libre: 'les démons de minuit', choix: 1 },
        { libre: 'images', choix: 1 },
      ],
    },
    // 2. « Presque. », puis « Rayé. » ; MC perd sa connexion et revient pendant le hit-parade ; DJ double Lady.
    {
      attendue: { reponse: VOYAGE, choix: [OURAGAN, TAXI, VOYAGE, FEMME] },
      potes: [
        { qui: 'mc', apres: 1.5, fait: { genre: 'couper' } },
        repond('dj', 3, 'desireless voyage voyage', 2),
        repond('lady', 7, 'rita mitsouko', 0),
        repond('baron', 9, 'voyage voyage', 2),
        { qui: 'mc', apres: 24, fait: { genre: 'revenir' } },
      ],
      toi: [
        { libre: 'voyage', choix: 0 },
        { libre: 'boney m', choix: 3 },
      ],
    },
    // 3. Personne ne trouve.
    {
      attendue: { reponse: FEMME, choix: [OURAGAN, TAXI, BORN, FEMME] },
      potes: [repond('lady', 5, 'joe le taxi', 1), repond('mc', 6, 'ouragan', 0), repond('dj', 8, 'vanessa paradis', 2)],
      toi: [{ libre: 'patrick hernandez', choix: 2 }],
    },
    // La face B, après « Rejouer la face B ».
    {
      attendue: { reponse: OURAGAN, choix: [OURAGAN, FEMME, VOYAGE, TAXI] },
      potes: [repond('mamie', 3, 'stéphanie ouragan', 0), repond('lady', 6, 'ouragan', 0)],
      toi: [{ libre: 'ouragan stéphanie', choix: 0 }],
    },
    {
      attendue: { reponse: OUBLIER, choix: [TAXI, OUBLIER, DEMONS, BORN] },
      potes: [repond('dj', 4, 'angèle', 1), repond('baron', 7, 'angèle feat. roméo elvis', 1)],
      toi: [{ libre: 'tout oublier', choix: 1 }],
    },
    {
      attendue: { reponse: TAXI, choix: [VOYAGE, OURAGAN, FEMME, TAXI] },
      potes: [repond('lady', 2.5, 'vanessa paradis joe le taxi', 3), repond('mc', 5, 'joe le taxi', 3)],
      toi: [{ libre: 'vanessa paradis', choix: 3 }],
    },
  ],
} as const satisfies {
  readonly reglages: { readonly pistes: number; readonly extrait: number; readonly son: 'tous' | 'hote' };
  readonly playlist: string;
  readonly arrivees: readonly { readonly qui: Pote; readonly apres: number }[];
  readonly pret: number;
  readonly pistes: readonly PisteDuScenario[];
};

/** La playlist du prototype, telle que sa source la donne au serveur : la face A, puis la face B. */
export const PLAYLIST_DU_PROTOTYPE: readonly PisteDuMode[] = SCENARIO.pistes.map((p) => p.attendue);

/**
 * Au tournoi du prototype, les potes votent : chacun tant de secondes après l'ouverture d'un duel (Baron, le dernier, laisse à
 * l'hôte le temps de clore sans lui) ; pour la face A, sauf au duel dont le rang, plus le sien, tombe sur le multiple de trois.
 */
export const VOTES_DES_POTES = {
  apres: { lady: 5, mc: 7, dj: 9, mamie: 12, baron: 40 },
  faceBTousLes: 3,
} as const satisfies { readonly apres: Readonly<Record<Pote, number>>; readonly faceBTousLes: number };
