/**
 * Le déroulé d'une piste : le décompte, l'extrait, la révélation. Des règles pures, sans écran ni réseau :
 * un état et une action donnent un nouvel état, et l'état se lit à n'importe quel instant de l'horloge du serveur.
 * Tous les instants sont en secondes sur cette horloge : un téléphone en retard lit la même piste, plus loin.
 */

import { DEROULE } from '../ressources/reglages';
import type { Vignette } from '../ressources/vignettes';

/**
 * Ce qu'on apprend à la révélation. Une vignette tient lieu de pochette (dans les maquettes, et tant que la vraie n'est pas là) ;
 * en vrai, la source donne aussi l'adresse de son image.
 */
export interface Reponse {
  readonly titre: string;
  readonly artiste: string;
  /** L'artiste invité, s'il y en a un (« Roméo Elvis » dans « Angèle feat. Roméo Elvis ») : en saisie libre, il vaut son point. */
  readonly feat?: string;
  /** L'année de sortie, quand la source de musique la donne. */
  readonly annee?: number;
  readonly pochette: { readonly vignette: Vignette; readonly image?: string } | { readonly adresse: string };
  /** L'anecdote de la piste, quand sa source en donne une : seule la réponse révélée la porte, sur un papier sous la platine. */
  readonly anecdote?: string;
}

/** Vrai si deux réponses disent la même chose : le même titre, le même artiste, la même pochette. */
export function memeReponse(une: Reponse, autre: Reponse): boolean {
  const pochette = ({ pochette: p }: Reponse): string =>
    'adresse' in p ? `adresse ${p.adresse}` : `vignette ${p.vignette.fond} ${p.vignette.motif}`;
  return (
    une === autre || (une.titre === autre.titre && une.artiste === autre.artiste && une.feat === autre.feat && pochette(une) === pochette(autre))
  );
}

export interface Piste {
  /** Durée de l'extrait, en secondes. */
  readonly duree: number;
  /** L'instant du premier chiffre du décompte. */
  readonly decompteA: number;
  /** L'instant où l'extrait part sur tous les appareils : il n'est fixé que lorsqu'ils sont tous prêts. */
  readonly extraitA?: number;
  /** L'instant de la révélation, et ce qu'elle révèle : personne ne le sait avant. */
  readonly revelation?: { readonly a: number; readonly reponse: Reponse };
}

export type ActionDePiste =
  /** Le serveur lance une piste : le décompte commence. */
  | { readonly genre: 'lancer'; readonly a: number; readonly duree: number }
  /** Tous les appareils ont chargé l'extrait. */
  | { readonly genre: 'prets'; readonly a: number }
  /** Le serveur révèle la réponse. */
  | { readonly genre: 'reveler'; readonly a: number; readonly reponse: Reponse };

/** La durée du décompte, de son premier chiffre à zéro, en secondes. */
export const DUREE_DU_DECOMPTE: number = DEROULE.decompte.de * DEROULE.decompte.pas;

/**
 * Une action sur une piste. Une action qui n'a pas de sens (des appareils prêts sans piste lancée, une révélation
 * avant l'extrait, un extrait sans durée) ne change rien : le serveur est le seul à décider, et il ne se répète pas.
 */
export function jouer(piste: Piste | undefined, action: ActionDePiste): Piste | undefined {
  switch (action.genre) {
    case 'lancer':
      // Un extrait sans durée ne se joue pas : la piste d'avant, s'il y en a une, reste ce qu'elle était.
      if (!(action.duree > 0)) return piste;
      return { duree: action.duree, decompteA: action.a };
    case 'prets': {
      if (piste === undefined || piste.extraitA !== undefined) return piste;
      // L'extrait part à la fin du décompte, ou plus tard si les appareils ont tardé : jamais sans préavis.
      return { ...piste, extraitA: Math.max(piste.decompteA + DUREE_DU_DECOMPTE, action.a + DEROULE.preavis) };
    }
    case 'reveler':
      if (piste?.extraitA === undefined || piste.revelation !== undefined || action.a < piste.extraitA) return piste;
      return { ...piste, revelation: { a: action.a, reponse: action.reponse } };
  }
}

/** Les phases du déroulé d'une piste, dans l'ordre. */
export const PHASES_DE_PISTE = ['decompte', 'extrait', 'revelation'] as const;
export type PhaseDePiste = (typeof PHASES_DE_PISTE)[number];

/** Où en est la piste à l'instant t. Tant que l'extrait n'est pas parti, c'est le décompte, même s'il s'attarde à zéro. */
export function phaseDeLaPiste(piste: Piste, t: number): PhaseDePiste {
  if (piste.revelation !== undefined && t >= piste.revelation.a) return 'revelation';
  return piste.extraitA !== undefined && t >= piste.extraitA ? 'extrait' : 'decompte';
}

/** Le chiffre que montre le décompte à l'instant t : 3, 2, 1, puis plus rien. Rien non plus avant qu'il commence. */
export function chiffreDuDecompte(piste: Piste, t: number): number | undefined {
  const ecoule = t - piste.decompteA;
  if (ecoule < 0 || ecoule >= DUREE_DU_DECOMPTE) return undefined;
  return DEROULE.decompte.de - Math.floor(ecoule / DEROULE.decompte.pas);
}

/** L'instant où un chiffre du décompte apparaît. */
export const instantDuChiffre = (piste: Piste, chiffre: number): number => piste.decompteA + (DEROULE.decompte.de - chiffre) * DEROULE.decompte.pas;

/**
 * Vrai si une mauvaise réponse donnée à l'instant `a` raye le disque : il faut que l'extrait joue. Avant qu'il parte,
 * ou une fois la réponse révélée, elle ne raye rien.
 */
export const rayeLeDisque = (piste: Piste, a: number): boolean =>
  piste.extraitA !== undefined && a >= piste.extraitA && (piste.revelation === undefined || a < piste.revelation.a);

/** L'instant où l'extrait s'achève de lui-même : le bras arrive à l'étiquette. Inconnu tant que l'extrait n'a pas d'heure de départ. */
export const finDeLExtrait = (piste: Piste): number | undefined => (piste.extraitA === undefined ? undefined : piste.extraitA + piste.duree);

/**
 * La part de l'extrait déjà jouée à l'instant t, de 0 à 1 : c'est le chrono, donc la place du bras.
 * Elle s'arrête où elle en est à la révélation, si celle-ci vient avant la fin.
 */
export function avancementDeLExtrait(piste: Piste, t: number): number {
  if (piste.extraitA === undefined) return 0;
  const jusqua = piste.revelation === undefined ? t : Math.min(t, piste.revelation.a);
  return Math.min(1, Math.max(0, (jusqua - piste.extraitA) / piste.duree));
}
