/**
 * Le contrat d'un mode de jeu. Un mode déclare : son nom (sa clé, que les textes nomment) et son cran sur le sélecteur,
 * ses réglages propres, ses phases, ce que le joueur a sous le pouce pour répondre, ce qu'il y a à trouver et la façon de juger
 * une réponse, son barème, et ce que montrent l'étiquette et le bras. Le socle ne connaît aucun mode par son nom :
 * il passe par ce contrat, et par le registre.
 */

import type { Verdict } from '../jugement';
import type { PhaseDePiste, Reponse } from '../piste';

/** Ce qu'un joueur propose : un texte tapé sur l'étiquette vierge, ou une des étiquettes qu'on lui tend. */
export type Proposition = { readonly genre: 'saisie'; readonly texte: string } | { readonly genre: 'choix'; readonly rang: number };

/** Ce qu'un mode sait d'une piste : la réponse, et les réponses qu'il propose s'il en propose. */
export interface PisteDuMode {
  readonly reponse: Reponse;
  readonly choix?: readonly Reponse[];
  /** L'adresse de son extrait, quand la source en donne un : chaque téléphone qui joue le son le précharge pendant le décompte. */
  readonly extrait?: string;
  /** Son identifiant chez Deezer, quand elle en vient : de quoi y lire ses invités, que la liste d'une playlist ne donne pas. */
  readonly deezer?: number;
  /**
   * D'autres façons justes de dire son artiste et son titre, quand sa source en donne (une liste sur mesure : « Maître Gims » pour
   * « GIMS ») : la saisie libre les accepte aussi. Ils restent au serveur, comme la réponse jusqu'à la révélation.
   */
  readonly surnoms?: { readonly artiste: readonly string[]; readonly titre: readonly string[] };
  /**
   * Une anecdote courte sur la piste, quand sa source en donne une (une liste sur mesure) : elle reste au serveur, et ne part qu'avec
   * la réponse révélée (voir `publier`).
   */
  readonly anecdote?: string;
}

/** La dernière proposition d'un joueur à une piste, et l'instant où il l'a faite : ce qu'un mode peut départager à la révélation. */
export interface PropositionDeLaPiste {
  readonly id: string;
  readonly proposition: Proposition;
  readonly a: number;
}

/** Ce que vaut une proposition : ce qu'elle trouve (parmi ce qu'il y a à trouver), et son verdict. */
export interface Jugement {
  readonly trouve: readonly string[];
  readonly verdict: Verdict;
}

export interface ModeDeJeu {
  readonly cle: string;
  /** Son cran sur le sélecteur rotatif de la platine, de 0 au dernier cran gravé. */
  readonly cran: number;
  /** Ses réglages propres, s'il en a : le nombre de réponses proposées, par exemple. */
  readonly reglages: Readonly<Record<string, number>>;
  /** Les phases d'une de ses pistes, dans l'ordre. */
  readonly phases: readonly PhaseDePiste[];
  /** Ce que le joueur a sous le pouce pour répondre. */
  readonly sousLePouce: 'etiquetteVierge' | 'etiquettesAToucher';
  /** Ce qu'il y a à trouver d'une piste : chaque partie trouvée vaut sa pastille. Une piste avec un feat a une partie de plus. */
  aTrouver(piste: PisteDuMode): readonly string[];
  juger(proposition: Proposition, piste: PisteDuMode, dejaTrouve: readonly string[]): Jugement;
  /**
   * Le barème : ce que rapporte ce qu'on vient de trouver.
   * @param premierATout vrai si, avec cela, le joueur est le premier de la piste à avoir tout trouvé.
   */
  points(trouve: readonly string[], premierATout: boolean): number;
  /** Ce que montrent l'étiquette du disque et le bras pendant la piste. */
  readonly etiquette: 'arcsPuisReponse';
  readonly bras: 'chrono';
  /** La durée de l'extrait qu'il impose, en secondes ; sans elle, c'est celle que l'hôte a réglée sur le bouton « Extrait ». */
  readonly extrait?: number;
  /**
   * Ce que rapporte la piste, à la révélation, quand une réponse ne vaut qu'au regard des autres : le plus proche marque.
   * Le serveur seul départage (il a les propositions) ; il publie les points avec la révélation.
   * @param propositions la dernière proposition de chaque joueur qui a répondu, avec son instant.
   * @returns les points de plus, par joueur.
   */
  departager?(piste: PisteDuMode, propositions: readonly PropositionDeLaPiste[]): Readonly<Record<string, number>>;
  /** Combien de secondes de l'extrait s'entendent, au plus : le reste de la piste, on cherche dans le silence. */
  readonly son?: number;
  /** Vrai si la piste s'arrête dès qu'un joueur a tout trouvé : la réponse se révèle aussitôt. */
  readonly finitAuPremier?: boolean;
  /** Combien de joueurs il faut pour lancer une piste, et combien la room en accueille au plus ; sans cela, ceux de toute partie. */
  readonly joueurs?: { readonly auMoins: number; readonly auPlus: number };
  /** En combien d'équipes il range les joueurs, s'il en fait : leurs points se mettent en commun, et la tablée se range en autant de piles. */
  readonly equipes?: number;
}
