/**
 * Le tournoi, en règles pures : les titres qu'une playlist met au tableau, le duel qui vient, les votes, la clôture d'un duel (la
 * majorité, l'égalité jouée à pile ou face, le forfait), le disque d'or, et l'oreille de la room. Le journal de la room porte les
 * duels (voir partie.ts) ; ce module dit ce qu'ils deviennent, sans écran ni réseau, le hasard donné.
 *
 * Le tableau : n titres (8, 16 ou 32), chacun à sa place, de 0 à n - 1. Au premier tour, la place 0 rencontre la 1, la 2 la 3… ;
 * au tour suivant, le gagnant du premier duel rencontre celui du deuxième, et ainsi de suite jusqu'à la finale. Les duels se jouent
 * tour après tour, de gauche à droite : un tableau de n titres en compte n - 1.
 */

import { TOURNOI } from '../ressources/reglages';
import { normaliser } from './jugement';
import type { PisteDuMode } from './modes';
import type { Reponse } from './piste';
import type { Tirage } from './pochette';

/** Les deux faces du disque d'un duel : un titre sur chacune. Chaque duel commence sur la face A. */
export type FaceDuDuel = 'A' | 'B';
export const FACES_DU_DUEL: readonly FaceDuDuel[] = ['A', 'B'];

/** Un titre au tableau : sa place, et ce qu'on en montre. Rien n'y est à deviner : on vote en sachant ce qu'on garde. */
export interface Engage {
  readonly place: number;
  readonly reponse: Reponse;
}

/** Comment une face l'emporte : aux voix ; à pile ou face, quand les voix sont à égalité ; par forfait de l'autre, qui ne se joue plus. */
export type ParQuoi = 'voix' | 'pileOuFace' | 'forfait';

/** Ce qu'un duel devient à sa clôture : le vote de chacun, la face qui passe, et comment. */
export interface Issue {
  readonly votes: Readonly<Record<string, FaceDuDuel>>;
  readonly gagnante: FaceDuDuel;
  readonly par: ParQuoi;
}

/** Un duel, ouvert à l'instant `a` : ses deux faces. */
export interface Duel {
  readonly a: number;
  readonly faces: Readonly<Record<FaceDuDuel, Engage>>;
}

/** Un duel en cours : qui a voté, dans l'ordre ; et pour quelle face, ce que le serveur seul sait jusqu'à la clôture. */
export interface DuelEnCours extends Duel {
  readonly votants: readonly string[];
  readonly votes: Readonly<Record<string, FaceDuDuel>>;
}

/** Un duel clos, à l'instant `closA`. */
export interface DuelClos extends Duel, Issue {
  readonly closA: number;
}

export interface EtatDuTournoi {
  /** Combien de titres entrent au tableau. */
  readonly titres: number;
  /** Le tableau entier, publié au premier lancer : chaque titre à sa place. Rien avant : on ne le connaît qu'au premier duel. */
  readonly tableau?: readonly Reponse[];
  /** Les duels clos, dans l'ordre où ils se sont joués. */
  readonly clos: readonly DuelClos[];
  readonly enCours?: DuelEnCours;
}

/** Un tournoi qui commence : rien de joué. */
export const tournoiDe = (titres: number): EtatDuTournoi => ({ titres, clos: [] });

/** Combien de duels compte un tableau de n titres : un de moins que de titres, chaque duel en sortant un. */
export const duelsDuTableau = (titres: number): number => Math.max(0, titres - 1);

/** Vrai quand la finale est close. */
export const tournoiFini = (t: Pick<EtatDuTournoi, 'titres' | 'clos'>): boolean => t.clos.length >= duelsDuTableau(t.titres);

/**
 * Où se place un duel dans le tableau, d'après son rang dans l'ordre de jeu (de 0 à n - 2) : son tour (0 pour le premier), son
 * rang dans ce tour, et combien de duels compte ce tour (1 pour la finale, 2 pour les demies…). Rien au-delà de la finale.
 */
export function placeDuDuel(titres: number, numero: number): { readonly tour: number; readonly rang: number; readonly duels: number } | undefined {
  let debut = 0;
  for (let tour = 0, duels = Math.floor(titres / 2); duels >= 1; tour++, duels = Math.floor(duels / 2)) {
    if (numero >= debut && numero < debut + duels) return { tour, rang: numero - debut, duels };
    debut += duels;
  }
  return undefined;
}

/** La place du titre qui a gagné ce duel. */
const placeGagnante = (d: DuelClos): number => d.faces[d.gagnante].place;

/**
 * Le duel qui vient : son rang dans l'ordre de jeu, et les places des deux titres qui s'y rencontrent, celui de la face A d'abord
 * (le gagnant du duel d'en haut du tableau) ; rien quand le tournoi est fini.
 */
export function prochainDuel(
  t: Pick<EtatDuTournoi, 'titres' | 'clos'>,
): { readonly numero: number; readonly places: readonly [number, number] } | undefined {
  const numero = t.clos.length;
  const ou = placeDuDuel(t.titres, numero);
  if (ou === undefined) return undefined;
  if (ou.tour === 0) return { numero, places: [2 * ou.rang, 2 * ou.rang + 1] };
  // Les deux duels du tour d'avant, qui comptait deux fois plus de duels : leurs gagnants se rencontrent ici.
  const debutDuTourDAvant = numero - ou.rang - 2 * ou.duels;
  const haut = t.clos[debutDuTourDAvant + 2 * ou.rang];
  const bas = t.clos[debutDuTourDAvant + 2 * ou.rang + 1];
  return haut !== undefined && bas !== undefined ? { numero, places: [placeGagnante(haut), placeGagnante(bas)] } : undefined;
}

/**
 * Ce qui fait qu'un titre est le même qu'un autre, quelle que soit sa version : son artiste et son titre, sans accents ni casse,
 * sans ce qui dit son édition ou son invité (« (Live) », « feat. … »).
 */
export const memeTitre = ({ reponse }: Pick<PisteDuMode, 'reponse'>): string => `${normaliser(reponse.artiste)}|${normaliser(reponse.titre)}`;

/** Les titres d'une playlist qui peuvent aller au tableau, dans son ordre : chacun une fois (le même titre deux fois se battrait contre lui-même). */
export function titresDifferents(pistes: readonly PisteDuMode[]): PisteDuMode[] {
  const vus = new Set<string>();
  return pistes.filter((p) => {
    const cle = memeTitre(p);
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/**
 * La taille du tableau qu'une playlist remplit : celle qu'on a réglée si elle a assez de titres différents, sinon la plus grande
 * qu'elle remplit ; rien si elle n'en remplit aucune (moins de huit titres différents).
 */
export function tailleDuTableau(pistes: readonly PisteDuMode[], voulue: number): number | undefined {
  const differents = titresDifferents(pistes).length;
  return [...TOURNOI.titres.choix].filter((t) => t <= voulue && t <= differents).sort((a, b) => b - a)[0];
}

/**
 * Les titres d'un tableau, pris dans la playlist dans son ordre : ceux qui n'ont pas encore été au tableau dans la room d'abord (une
 * revanche prend d'autres titres, tant qu'il y en a), puis les autres. Leurs places se tirent ensuite au sort (le serveur).
 * @param deja ce qui a déjà été au tableau dans la room, par `memeTitre`.
 */
export function titresDuTableau(pistes: readonly PisteDuMode[], titres: number, deja: ReadonlySet<string>): PisteDuMode[] {
  const differents = titresDifferents(pistes);
  return [...differents.filter((p) => !deja.has(memeTitre(p))), ...differents.filter((p) => deja.has(memeTitre(p)))].slice(0, titres);
}

/** Le duel qui s'ouvre : personne n'a encore voté. */
export const ouvrirLeDuel = (t: EtatDuTournoi, duel: Duel): EtatDuTournoi => ({ ...t, enCours: { ...duel, votants: [], votes: {} } });

/**
 * Un vote : pour une face, quand on la sait (au serveur) ; sinon, on sait seulement qu'il a voté (au téléphone, avant la clôture).
 * Changer d'avis ne fait pas un votant de plus.
 */
export function voter(t: EtatDuTournoi, id: string, face?: FaceDuDuel): EtatDuTournoi {
  const d = t.enCours;
  if (d === undefined) return t;
  const votants = d.votants.includes(id) ? d.votants : [...d.votants, id];
  return { ...t, enCours: { ...d, votants, votes: face !== undefined ? { ...d.votes, [id]: face } : d.votes } };
}

/** Celui qui s'en va pour de bon ne compte plus : son vote s'efface du duel en cours. */
export function oublierLeVote(t: EtatDuTournoi, id: string): EtatDuTournoi {
  const d = t.enCours;
  if (d === undefined || !d.votants.includes(id)) return t;
  const votes = Object.fromEntries(Object.entries(d.votes).filter(([qui]) => qui !== id));
  return { ...t, enCours: { ...d, votants: d.votants.filter((qui) => qui !== id), votes } };
}

/** Ceux dont un duel attend le vote : les joueurs branchés qui jouent (qui arrive pendant un duel regarde jusqu'au suivant). */
export const quiVotent = (joueurs: readonly { readonly id: string; readonly connecte: boolean; readonly spectateur: boolean }[]): string[] =>
  joueurs.filter((j) => j.connecte && !j.spectateur).map((j) => j.id);

/** Vrai quand tous ceux qu'on attend ont voté, et quelqu'un au moins : le duel se clôt, sans attendre personne de plus. */
export const toutLeMondeAVote = (d: Pick<DuelEnCours, 'votants'>, attendus: readonly string[]): boolean =>
  d.votants.length > 0 && attendus.every((id) => d.votants.includes(id));

/** Les voix de chaque face. */
export function voix(votes: Readonly<Record<string, FaceDuDuel>>): Readonly<Record<FaceDuDuel, number>> {
  const faces = Object.keys(votes).map((id) => votes[id]);
  return { A: faces.filter((f) => f === 'A').length, B: faces.filter((f) => f === 'B').length };
}

/**
 * L'issue d'un duel, aux voix : la face qui en a le plus passe. À égalité, on lance le disque comme une pièce, et la face qui
 * retombe dessus passe : le hasard donné en décide.
 */
export function issueAuxVoix(votes: Readonly<Record<string, FaceDuDuel>>, tirage: Tirage): Issue {
  const { A, B } = voix(votes);
  if (A !== B) return { votes, gagnante: A > B ? 'A' : 'B', par: 'voix' };
  return { votes, gagnante: tirage() < 1 / 2 ? 'A' : 'B', par: 'pileOuFace' };
}

/** Le duel clos, à l'instant `a`, sur son issue. */
export function clore(t: EtatDuTournoi, a: number, issue: Issue): EtatDuTournoi {
  const d = t.enCours;
  if (d === undefined) return t;
  const duel: DuelClos = { a: d.a, faces: d.faces, votes: issue.votes, gagnante: issue.gagnante, par: issue.par, closA: a };
  const { enCours: _clos, ...reste } = t;
  return { ...reste, clos: [...t.clos, duel] };
}

/** Le disque d'or : le titre qui a gagné la finale ; rien tant qu'elle n'est pas close. */
export function disqueDOr(t: Pick<EtatDuTournoi, 'titres' | 'clos'>): Engage | undefined {
  const finale = tournoiFini(t) ? t.clos[t.clos.length - 1] : undefined;
  return finale?.faces[finale.gagnante];
}

/** L'oreille d'un joueur : combien de fois il a voté pour la face qui est passée, sur combien de duels tranchés aux voix où il a voté. */
export interface Oreille {
  readonly id: string;
  readonly justes: number;
  readonly votes: number;
  readonly rang: number;
}

/**
 * L'oreille de la room : qui a le plus souvent voté comme la majorité. Seuls comptent les duels tranchés aux voix (une égalité n'a
 * pas de majorité, un forfait n'a pas de vote). Du meilleur au moins bon ; les ex æquo partagent leur rang, dans l'ordre donné.
 * C'est pour rire : rien ne compte au compte d'un joueur.
 */
export function oreillesDeLaRoom(clos: readonly DuelClos[], ids: readonly string[]): Oreille[] {
  const comptes = ids.map((id) => {
    const tranches = clos.filter((d) => d.par === 'voix' && d.votes[id] !== undefined);
    return { id, justes: tranches.filter((d) => d.votes[id] === d.gagnante).length, votes: tranches.length };
  });
  return comptes.map((o) => ({ ...o, rang: 1 + comptes.filter((autre) => autre.justes > o.justes).length })).sort((x, y) => x.rang - y.rang);
}
