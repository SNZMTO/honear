/**
 * Une room, vue du serveur : qui est autour du meuble, qui tient la platine, ce que chacun a trouvé et marqué, la tête qu'il fait,
 * et où en est la partie (le salon, les pistes, la fin). Des règles pures : le journal de la room, rejoué jusqu'à un instant,
 * donne son état à cet instant. Le serveur tient le journal ; chaque téléphone le rejoue, et tous voient la même chose.
 * Ce que vaut une réponse, c'est le mode qui le dit : ce module ne connaît aucun mode par son nom. Au tournoi, pas de pistes mais
 * des duels : ce qu'ils deviennent, c'est `tournoi.ts` qui le dit.
 *
 * Les expressions changent toutes seules, d'un coup :
 * - content à l'arrivée, et à chaque bonne réponse ;
 * - concentré pendant l'extrait, et pendant un duel ;
 * - dépité à chaque mauvaise réponse, quand on se fait doubler, et quand personne n'a trouvé la piste ;
 * - endormi après une piste entière sans répondre, et après un duel sans voter ;
 * - au tournoi, à la clôture d'un duel : content si sa face passe, dépité sinon.
 */

import type { NomDExpression } from '../ressources/avatar';
import type { Pochette } from '../ressources/pochettes';
import { PARTIE } from '../ressources/reglages';
import type { Verdict } from './jugement';
import { enDuels, MODES, modeADeviner, type CleDeMode, type ModeDeJeu, type PisteDuMode, type Proposition, type PropositionDeLaPiste } from './modes';
import type { Reponse } from './piste';
import type { Tirage } from './pochette';
import {
  clore,
  oublierLeVote,
  ouvrirLeDuel,
  tournoiDe,
  tournoiFini,
  voter,
  type Engage,
  type EtatDuTournoi,
  type FaceDuDuel,
  type Issue,
} from './tournoi';

/** Ce qui arrive dans une room, à un instant de l'horloge du serveur (en secondes). */
export type EvenementDePartie =
  /**
   * L'hôte ouvre la room : le mode et le nombre de pistes réglés sur la platine, et qui joue le son (tous les téléphones, ou le sien).
   * Il en est le premier joueur.
   */
  | {
      readonly genre: 'ouverture';
      readonly a: number;
      readonly mode: CleDeMode;
      readonly pistes: number;
      readonly son?: SonDeLaRoom;
      /** La face qu'on joue : la A d'abord ; « Rejouer la face B » rouvre la room sur la B. */
      readonly face?: Face;
    }
  /** Un joueur arrive avec sa pochette. Au-delà de douze, il reste à la porte ; pendant une piste, il regarde jusqu'à la suivante. */
  | { readonly genre: 'arrivee'; readonly a: number; readonly id: string; readonly pochette: Pochette }
  /** Il a refait sa pochette : on la voit changer partout où elle est posée. */
  | { readonly genre: 'nouvellePochette'; readonly a: number; readonly id: string; readonly pochette: Pochette }
  /** Sa connexion tombe, ou revient : sa pochette se retourne côté dos, puis se remet à l'endroit. Sa place est gardée. */
  | { readonly genre: 'deconnexion' | 'retour'; readonly a: number; readonly id: string }
  /** Il s'en va pour de bon. Si c'était l'hôte, la platine passe au suivant. */
  | { readonly genre: 'depart'; readonly a: number; readonly id: string }
  /** L'extrait d'une piste part : le serveur seul sait ce qu'il faut trouver. */
  | { readonly genre: 'extrait'; readonly a: number; readonly piste: PisteDuMode }
  /** Un joueur propose une réponse. */
  | { readonly genre: 'reponse'; readonly a: number; readonly id: string; readonly proposition: Proposition }
  /**
   * Une réponse déjà jugée par le serveur : ce qu'elle trouve, son verdict, ce qu'elle rapporte, et si le joueur a tout trouvé.
   * C'est ainsi qu'un téléphone l'apprend, sans savoir ce qu'il fallait trouver ni ce que l'autre a tapé (voir messages.ts).
   */
  | {
      readonly genre: 'jugee';
      readonly a: number;
      readonly id: string;
      readonly trouve: readonly string[];
      readonly verdict: Verdict;
      readonly points: number;
      readonly complet: boolean;
    }
  /**
   * La réponse est révélée : la piste est finie. Le serveur la publie avec ce qu'il fallait trouver, et, si le mode départage
   * les réponses les unes par rapport aux autres, les points que cela rapporte à chacun.
   */
  | { readonly genre: 'revelation'; readonly a: number; readonly reponse?: Reponse; readonly departage?: Readonly<Record<string, number>> }
  /** Au tournoi, un duel s'ouvre : ses deux faces, chacune un titre du tableau, à sa place. */
  | { readonly genre: 'duel'; readonly a: number; readonly faces: Readonly<Record<FaceDuDuel, Engage>> }
  /**
   * Un joueur vote pour une face, et peut en changer tant que le duel n'est pas clos. Le serveur seul sait laquelle jusqu'à la
   * clôture : publié, le vote dit seulement qu'il a voté (voir messages.ts).
   */
  | { readonly genre: 'vote'; readonly a: number; readonly id: string; readonly face?: FaceDuDuel }
  /** Le duel se clôt : le vote de chacun, révélé à tous, la face qui passe, et comment (aux voix, à pile ou face, par forfait). */
  | ({ readonly genre: 'cloture'; readonly a: number } & Issue);

export interface Joueur {
  readonly id: string;
  readonly pochette: Pochette;
  readonly points: number;
  readonly expression: NomDExpression;
  /** Faux tant que sa connexion est tombée : sa pochette est côté dos. */
  readonly connecte: boolean;
  /** Vrai s'il est arrivé pendant une piste : il regarde jusqu'à la suivante. */
  readonly spectateur: boolean;
}

/** Ce qu'une piste en cours sait de chacun : ce qu'il a trouvé, s'il a répondu, et sa dernière réponse. */
export interface PisteEnCours {
  readonly attendue: PisteDuMode;
  readonly trouve: Readonly<Record<string, readonly string[]>>;
  /** Ceux qui ont tout trouvé, dans l'ordre. */
  readonly complets: readonly string[];
  readonly repondu: readonly string[];
  readonly dernierVerdict: Readonly<Record<string, Verdict>>;
  /** La dernière proposition de chacun : le serveur seul la connaît, un téléphone n'apprend que ce qu'elle vaut. */
  readonly propositions: readonly PropositionDeLaPiste[];
}

export type PhaseDeLaPartie = 'salon' | 'pistes' | 'fin';

/** Qui joue le son d'une room : tous les téléphones, ou celui de l'hôte seulement. */
export type SonDeLaRoom = 'tous' | 'hote';

/** La face du disque qu'on joue : une partie, puis, si on la rejoue, la suivante. */
export type Face = 'A' | 'B';

export interface EtatDeLaPartie {
  readonly mode: CleDeMode;
  readonly pistes: number;
  readonly son: SonDeLaRoom;
  readonly face: Face;
  readonly phase: PhaseDeLaPartie;
  readonly hote: string | undefined;
  /** Les joueurs, dans l'ordre où ils sont arrivés. */
  readonly joueurs: readonly Joueur[];
  /** Ceux qui sont restés à la porte : la room était pleine. */
  readonly refuses: readonly string[];
  readonly piste?: PisteEnCours;
  /** Combien de pistes ont été révélées ; au tournoi, combien de duels sont clos. */
  readonly pistesJouees: number;
  /** Ce qui a été trouvé à chaque piste révélée : vrai si quelqu'un a trouvé quelque chose. */
  readonly trouvees: readonly boolean[];
  /** Le tournoi, quand la room en joue un (son mode se joue en duels) : son tableau, ses duels clos, le duel en cours. */
  readonly tournoi?: EtatDuTournoi;
}

/** Une room qu'on vient de créer : personne, rien de réglé. */
export const ROOM_VIDE: EtatDeLaPartie = {
  mode: 'libre',
  pistes: 0,
  son: 'tous',
  face: 'A',
  phase: 'salon',
  hote: undefined,
  joueurs: [],
  refuses: [],
  pistesJouees: 0,
  trouvees: [],
};

/** Le rang de chacun : un de plus que le nombre de joueurs qui ont strictement plus de points. Les ex æquo partagent leur rang. */
export function rangs(joueurs: readonly Pick<Joueur, 'id' | 'points'>[]): Readonly<Record<string, number>> {
  return Object.fromEntries(joueurs.map((j) => [j.id, 1 + joueurs.filter((autre) => autre.points > j.points).length]));
}

const poser = (joueurs: readonly Joueur[], id: string, change: Partial<Joueur>): Joueur[] =>
  joueurs.map((j) => (j.id === id ? { ...j, ...change } : j));

/** Ce que vaut une réponse, une fois jugée : ce qu'elle trouve, son verdict, ce qu'elle rapporte, et si le joueur a tout trouvé. */
export interface ReponseJugee {
  readonly trouve: readonly string[];
  readonly verdict: Verdict;
  readonly points: number;
  readonly complet: boolean;
}

/** Vrai si ce joueur peut encore répondre à la piste en cours : il est là, il joue, et il n'a pas déjà tout trouvé. */
function peutRepondre(etat: EtatDeLaPartie, id: string): boolean {
  const joueur = etat.joueurs.find((j) => j.id === id);
  return etat.piste !== undefined && joueur !== undefined && !joueur.spectateur && !etat.piste.complets.includes(id);
}

/**
 * Une réponse jugée par le mode de la room : c'est ce que fait le serveur, qui seul sait ce qu'il faut trouver.
 * @returns rien si le joueur ne peut pas répondre.
 */
export function jugerUneReponse(etat: EtatDeLaPartie, id: string, proposition: Proposition): ReponseJugee | undefined {
  const piste = etat.piste;
  const mode = modeADeviner(etat.mode);
  if (piste === undefined || mode === undefined || !peutRepondre(etat, id)) return undefined;
  const deja = piste.trouve[id] ?? [];
  const { trouve, verdict } = mode.juger(proposition, piste.attendue, deja);
  const complet = trouve.length > 0 && mode.aTrouver(piste.attendue).every((p) => [...deja, ...trouve].includes(p));
  return { trouve, verdict, points: trouve.length > 0 ? mode.points(trouve, complet && piste.complets.length === 0) : 0, complet };
}

/** Une réponse jugée, appliquée à la room : les points, les têtes, et ce que la piste sait de chacun. Le serveur et les téléphones la partagent. */
function appliquer(etat: EtatDeLaPartie, id: string, jugee: ReponseJugee): EtatDeLaPartie {
  const piste = etat.piste;
  const joueur = etat.joueurs.find((j) => j.id === id);
  if (piste === undefined || joueur === undefined || !peutRepondre(etat, id)) return etat;
  const { trouve, verdict, points: gain, complet } = jugee;
  const deja = piste.trouve[id] ?? [];
  const repondu = piste.repondu.includes(id) ? piste.repondu : [...piste.repondu, id];
  const dernierVerdict = { ...piste.dernierVerdict, [id]: verdict };
  if (trouve.length === 0)
    return { ...etat, piste: { ...piste, repondu, dernierVerdict }, joueurs: poser(etat.joueurs, id, { expression: 'depite' }) };

  const tout = [...deja, ...trouve];
  const avant = joueur.points;
  // Ceux que ce point fait passer de devant à derrière lui se sont fait doubler ; ceux qu'il rejoint, non.
  const joueurs = etat.joueurs.map((j): Joueur => {
    if (j.id === id) return { ...j, points: j.points + gain, expression: 'content' };
    return avant < j.points && avant + gain > j.points ? { ...j, expression: 'depite' } : j;
  });
  return {
    ...etat,
    joueurs,
    piste: {
      ...piste,
      repondu,
      dernierVerdict,
      trouve: { ...piste.trouve, [id]: tout },
      complets: complet ? [...piste.complets, id] : piste.complets,
    },
  };
}

/** Un événement de plus. Ce qui n'a pas de sens (répondre hors d'un extrait, arriver deux fois) ne change rien. */
export function suivre(etat: EtatDeLaPartie, e: EvenementDePartie): EtatDeLaPartie {
  switch (e.genre) {
    case 'ouverture': {
      if (etat.phase !== 'salon') return etat;
      const { tournoi: _ancien, ...reste } = etat;
      const ouverte: EtatDeLaPartie = { ...reste, mode: e.mode, pistes: e.pistes, son: e.son ?? etat.son, face: e.face ?? etat.face };
      // Un mode en duels : le tournoi commence, son tableau de la taille réglée.
      return enDuels(e.mode) ? { ...ouverte, tournoi: tournoiDe(e.pistes) } : ouverte;
    }
    case 'arrivee': {
      if (etat.joueurs.some((j) => j.id === e.id)) return etat;
      if (etat.joueurs.length >= (MODES[etat.mode].joueurs ?? PARTIE.joueurs).auPlus) return { ...etat, refuses: [...etat.refuses, e.id] };
      const joueur: Joueur = {
        id: e.id,
        pochette: e.pochette,
        points: 0,
        expression: 'content',
        connecte: true,
        // Qui arrive pendant une piste, ou pendant un duel, regarde jusqu'à la suivante.
        spectateur: etat.piste !== undefined || etat.tournoi?.enCours !== undefined,
      };
      return { ...etat, hote: etat.hote ?? e.id, joueurs: [...etat.joueurs, joueur] };
    }
    case 'nouvellePochette':
      return { ...etat, joueurs: poser(etat.joueurs, e.id, { pochette: e.pochette }) };
    case 'deconnexion':
    case 'retour':
      return { ...etat, joueurs: poser(etat.joueurs, e.id, { connecte: e.genre === 'retour' }) };
    case 'depart': {
      const joueurs = etat.joueurs.filter((j) => j.id !== e.id);
      // La platine passe au suivant, dans l'ordre d'arrivée, parmi ceux qui sont là.
      const hote = etat.hote === e.id ? (joueurs.find((j) => j.connecte) ?? joueurs[0])?.id : etat.hote;
      // Au tournoi, qui s'en va ne compte plus : son vote s'efface du duel en cours.
      return { ...etat, joueurs, hote, ...(etat.tournoi !== undefined ? { tournoi: oublierLeVote(etat.tournoi, e.id) } : {}) };
    }
    case 'extrait':
      if (etat.phase === 'fin') return etat;
      return {
        ...etat,
        phase: 'pistes',
        piste: { attendue: e.piste, trouve: {}, complets: [], repondu: [], dernierVerdict: {}, propositions: [] },
        // Les spectateurs entrent dans la partie à la piste suivante : celle-ci.
        joueurs: etat.joueurs.map((j) => ({ ...j, spectateur: false, expression: 'concentre' })),
      };
    case 'reponse': {
      const jugee = jugerUneReponse(etat, e.id, e.proposition);
      if (jugee === undefined) return etat;
      const apres = appliquer(etat, e.id, jugee);
      const piste = apres.piste;
      if (piste === undefined) return apres;
      const propositions = [...piste.propositions.filter((p) => p.id !== e.id), { id: e.id, proposition: e.proposition, a: e.a }];
      return { ...apres, piste: { ...piste, propositions } };
    }
    case 'jugee':
      return appliquer(etat, e.id, e);
    case 'revelation': {
      const piste = etat.piste;
      if (piste === undefined) return etat;
      // Le départage : publié par le serveur avec la révélation ; le serveur, lui, le fait d'après les propositions.
      const mode = modeADeviner(etat.mode);
      const departage = e.departage ?? (mode !== undefined ? departageDeLaPiste(mode, piste) : {});
      const marque = Object.values(departage).some((points) => points > 0);
      const personne = Object.keys(piste.trouve).length === 0 && !marque;
      const joueurs = etat.joueurs.map((j): Joueur => {
        const bonus = departage[j.id] ?? 0;
        if (bonus > 0) return { ...j, points: j.points + bonus, expression: 'content' };
        if (!piste.repondu.includes(j.id)) return { ...j, expression: 'endormi' };
        return personne ? { ...j, expression: 'depite' } : j;
      });
      const pistesJouees = etat.pistesJouees + 1;
      const { piste: _finie, ...reste } = etat;
      return {
        ...reste,
        joueurs,
        pistesJouees,
        trouvees: [...etat.trouvees, !personne],
        phase: pistesJouees >= etat.pistes && etat.pistes > 0 ? 'fin' : 'pistes',
      };
    }
    case 'duel': {
      const tournoi = etat.tournoi;
      if (tournoi === undefined || tournoi.enCours !== undefined || tournoiFini(tournoi)) return etat;
      return {
        ...etat,
        phase: 'pistes',
        tournoi: ouvrirLeDuel(tournoi, { a: e.a, faces: e.faces }),
        // Les spectateurs entrent au tournoi au duel suivant : celui-ci. Chacun écoute.
        joueurs: etat.joueurs.map((j) => ({ ...j, spectateur: false, expression: 'concentre' })),
      };
    }
    case 'vote': {
      const tournoi = etat.tournoi;
      const votant = etat.joueurs.find((j) => j.id === e.id);
      if (tournoi?.enCours === undefined || votant === undefined || votant.spectateur) return etat;
      return { ...etat, tournoi: voter(tournoi, e.id, e.face) };
    }
    case 'cloture': {
      const tournoi = etat.tournoi;
      if (tournoi?.enCours === undefined) return etat;
      const apres = clore(tournoi, e.a, { votes: e.votes, gagnante: e.gagnante, par: e.par });
      // Content si sa face passe, dépité sinon ; endormi sans avoir voté. Un forfait ne change la tête de personne.
      const joueurs = etat.joueurs.map((j): Joueur => {
        const sienne = e.votes[j.id];
        if (e.par === 'forfait' || j.spectateur) return j;
        if (sienne === undefined) return { ...j, expression: 'endormi' };
        return { ...j, expression: sienne === e.gagnante ? 'content' : 'depite' };
      });
      return { ...etat, joueurs, tournoi: apres, pistesJouees: etat.pistesJouees + 1, phase: tournoiFini(apres) ? 'fin' : 'pistes' };
    }
  }
}

/** Ce que le mode de la room fait gagner à la révélation, au regard des réponses des uns et des autres : rien, s'il ne départage pas. */
export function departageDeLaPiste(mode: ModeDeJeu, piste: PisteEnCours): Readonly<Record<string, number>> {
  return mode.departager?.(piste.attendue, piste.propositions) ?? {};
}

/** La durée de l'extrait d'une piste, en secondes : celle que le mode impose, sinon celle que l'hôte a réglée. */
export const dureeDeLExtrait = (mode: ModeDeJeu, reglee: number): number => mode.extrait ?? reglee;

/** Une équipe : ses joueurs, leurs points mis en commun, et son rang. */
export interface Equipe {
  readonly joueurs: readonly Joueur[];
  readonly points: number;
  readonly rang: number;
}

/**
 * Les équipes d'une partie dont le mode en fait : les joueurs, dans l'ordre d'arrivée, répartis à tour de rôle ; leurs points mis
 * en commun ; les ex æquo partagent leur rang. Aucune, si le mode n'en fait pas.
 */
export function equipesDeLaPartie(mode: ModeDeJeu, etat: Pick<EtatDeLaPartie, 'joueurs'>): Equipe[] {
  const combien = mode.equipes ?? 0;
  if (combien < 2) return [];
  const equipes = Array.from({ length: combien }, (_, k) => etat.joueurs.filter((_, rang) => rang % combien === k));
  const points = equipes.map((joueurs) => joueurs.reduce((somme, j) => somme + j.points, 0));
  return equipes.map((joueurs, k) => {
    const siens = points[k] ?? 0;
    return { joueurs, points: siens, rang: 1 + points.filter((p) => p > siens).length };
  });
}

/**
 * La piste dont parle l'écran, et combien la partie en compte : celle qu'on joue, son décompte compris, sinon la dernière révélée ;
 * au salon, la première. C'est le journal qui la donne : « Piste 3 sur 15 » n'est écrit nulle part ailleurs.
 * @param decompte vrai pendant le décompte d'une piste : l'hôte l'a lancée, son extrait n'est pas encore parti.
 */
export function numeroDeLaPiste(etat: EtatDeLaPartie, decompte = false): { readonly numero: number; readonly sur: number } {
  const enCours = etat.piste !== undefined || decompte;
  const numero = enCours ? etat.pistesJouees + 1 : Math.max(1, etat.pistesJouees);
  return { numero: Math.min(numero, Math.max(1, etat.pistes)), sur: etat.pistes };
}

/** Un état rejoué, et les événements du journal tels qu'ils étaient quand on l'a rejoué. */
interface Rejoue {
  readonly evenements: readonly EvenementDePartie[];
  readonly etat: EtatDeLaPartie;
}

/** Vrai si le journal a encore exactement ces événements : ni rallongé, ni changé en place (le serveur, lui, le rallonge en place). */
const memesEvenements = (gardes: readonly EvenementDePartie[], journal: readonly EvenementDePartie[]): boolean =>
  gardes.length === journal.length && gardes.every((e, rang) => e === journal[rang]);

/**
 * Le dernier état de chaque journal rejoué jusqu'au bout, et celui d'avant le dernier instant qu'on a demandé. L'écran les demande
 * à chaque image ; rejoués à chaque fois, ils pesaient de plus en plus lourd vers la fin d'une partie. On ne les reprend que si le
 * journal a toujours les mêmes événements.
 */
const AU_BOUT = new WeakMap<readonly EvenementDePartie[], Rejoue>();
const AVANT = new WeakMap<readonly EvenementDePartie[], Rejoue & { readonly a: number }>();

const rejouer = (journal: readonly EvenementDePartie[], garde: (e: EvenementDePartie) => boolean): EtatDeLaPartie =>
  journal
    .filter(garde)
    .sort((x, y) => x.a - y.a)
    .reduce(suivre, ROOM_VIDE);

/** L'état de la room à l'instant t : le journal rejoué, dans l'ordre de ses instants, jusqu'à t compris. */
export function partieA(journal: readonly EvenementDePartie[], t: number): EtatDeLaPartie {
  const deja = t === Infinity ? AU_BOUT.get(journal) : undefined;
  if (deja !== undefined && memesEvenements(deja.evenements, journal)) return deja.etat;
  const etat = rejouer(journal, (e) => e.a <= t);
  if (t === Infinity) AU_BOUT.set(journal, { evenements: [...journal], etat });
  return etat;
}

/** L'état de la room juste avant l'instant a : le journal rejoué, sans ce qui arrive à cet instant ni après. */
export function partieAvant(journal: readonly EvenementDePartie[], a: number): EtatDeLaPartie {
  const deja = AVANT.get(journal);
  if (deja !== undefined && deja.a === a && memesEvenements(deja.evenements, journal)) return deja.etat;
  const etat = rejouer(journal, (e) => e.a < a);
  AVANT.set(journal, { a, evenements: [...journal], etat });
  return etat;
}

/** Le hit-parade : les joueurs du premier au dernier, ex æquo dans l'ordre d'arrivée, chacun avec son rang. */
export function hitParade(etat: Pick<EtatDeLaPartie, 'joueurs'>): { readonly joueur: Joueur; readonly rang: number }[] {
  const r = rangs(etat.joueurs);
  return [...etat.joueurs].sort((a, b) => b.points - a.points).map((joueur) => ({ joueur, rang: r[joueur.id] ?? 0 }));
}

/** Ce que la révélation fait au classement de chacun : il y entre, il y monte ou il y descend de quelques places. */
export type MouvementDuClassement = { readonly genre: 'entree' } | { readonly genre: 'monte' | 'descend'; readonly places: number };

/**
 * Les mouvements du classement d'une piste à l'autre, comme au hit-parade : qui marque ses premiers points y entre ;
 * les autres montent ou descendent d'autant de places que leur rang a changé. Qui ne bouge pas n'a rien.
 */
export function mouvementsDuClassement(avant: EtatDeLaPartie, apres: EtatDeLaPartie): Readonly<Record<string, MouvementDuClassement>> {
  const rangsAvant = rangs(avant.joueurs);
  const rangsApres = rangs(apres.joueurs);
  const mouvements: Record<string, MouvementDuClassement> = {};
  for (const j of apres.joueurs) {
    const precedent = avant.joueurs.find((p) => p.id === j.id);
    const de = rangsAvant[j.id];
    const a = rangsApres[j.id];
    if (precedent === undefined || de === undefined || a === undefined) continue;
    // Toujours à zéro : il n'est pas encore entré au classement, il n'en descend pas (au départ, tous sont premiers ex æquo).
    if (precedent.points === 0 && j.points === 0) continue;
    if (precedent.points === 0 && j.points > 0) mouvements[j.id] = { genre: 'entree' };
    else if (a < de) mouvements[j.id] = { genre: 'monte', places: de - a };
    else if (a > de) mouvements[j.id] = { genre: 'descend', places: a - de };
  }
  return mouvements;
}

/** Les disques de la finale : diamant pour le premier, platine pour le deuxième, or pour le troisième. Les ex æquo ont le même. */
export const DISQUES = ['diamant', 'platine', 'or'] as const;
export type Disque = (typeof DISQUES)[number];

export function disquesDeLaFinale(etat: Pick<EtatDeLaPartie, 'joueurs'>): Readonly<Record<string, Disque>> {
  const r = rangs(etat.joueurs);
  return Object.fromEntries(
    etat.joueurs.flatMap((j) => (DISQUES[(r[j.id] ?? 0) - 1] !== undefined ? [[j.id, DISQUES[(r[j.id] ?? 0) - 1] as Disque]] : [])),
  );
}

/** Le code d'une room : des lettres qu'on ne confond pas, tirées au sort. */
export function codeDePartie(tirage: Tirage): string {
  const { longueur, lettres } = PARTIE.code;
  return Array.from({ length: longueur }, () => lettres[Math.min(lettres.length - 1, Math.floor(tirage() * lettres.length))] ?? '').join('');
}

/** Ce que l'invité tape, ou ce que porte le lien : un code est valide s'il a ses quatre lettres, sans celles qu'on confond. */
export const codeValide = (code: string): boolean =>
  code.length === PARTIE.code.longueur && [...code.toUpperCase()].every((l) => PARTIE.code.lettres.includes(l));

/** Vrai si une playlist a assez de titres jouables pour le nombre de pistes réglé : sinon, elle est trop courte pour une face. */
export const assezLongue = (jouables: number, pistes: number): boolean => jouables >= pistes;
