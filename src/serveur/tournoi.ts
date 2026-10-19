/**
 * Le tournoi d'une room, côté serveur : le tableau tiré dans sa playlist au premier lancer, le duel que l'hôte lance, ses deux
 * extraits (relus tant qu'il dure, leurs liens expirant : chacun écoute à son rythme), les votes, et la clôture, dès que tous ceux
 * qu'on attend ont voté, ou quand l'hôte la demande. Une piste qui ne se joue plus perd par forfait. La room lui prête de quoi lire
 * son état, écrire au journal et parler aux téléphones ; il ne touche ni au réseau ni à l'heure, qu'on lui donne.
 */

import type { ExtraitsDuDuel, Nouvelle } from '../regles/messages';
import type { PisteDuMode } from '../regles/modes';
import type { EtatDeLaPartie, EvenementDePartie } from '../regles/partie';
import type { Reponse } from '../regles/piste';
import type { Tirage } from '../regles/pochette';
import {
  issueAuxVoix,
  memeTitre,
  prochainDuel,
  quiVotent,
  titresDuTableau,
  toutLeMondeAVote,
  type Engage,
  type FaceDuDuel,
  type Issue,
} from '../regles/tournoi';
import { TOURNOI } from '../ressources/reglages';
import type { FaitSansLaRoom } from './faits';
import { dansLOrdre, unOrdreAuHasard } from './ordre';

/** Ce que la room prête à son tournoi. */
export interface CeQueLaRoomPrete {
  /** L'état de la room, son journal rejoué jusqu'au bout. */
  readonly etat: () => EtatDeLaPartie;
  /** Écrit un événement au journal, et publie ce qu'il a de nouveau à ceux qui sont branchés. */
  readonly ajouter: (e: EvenementDePartie) => void;
  /** Écrit à tous ceux qui sont branchés. */
  readonly diffuser: (nouvelle: Nouvelle) => void;
  /** Les pistes de la playlist, telles qu'elles sont maintenant (leurs liens frais), dans l'ordre de la room. */
  readonly pistes: () => readonly PisteDuMode[];
  /** Le hasard du serveur : les places au tableau, et le disque qu'on lance comme une pièce. */
  readonly tirage: Tirage;
  readonly raconter: (fait: FaitSansLaRoom) => void;
  /** La finale vient de se clore, à cet instant. */
  readonly quandFini: (heure: number) => void;
}

export interface TournoiDeLaRoom {
  /**
   * L'hôte lance le duel suivant ; le premier tire le tableau. Rien tant qu'un duel est en cours, ni une fois la finale jouée.
   * @returns « tropCourt » si la playlist n'a plus de quoi remplir le tableau : l'hôte en choisira une autre.
   */
  lancer(heure: number): 'tropCourt' | undefined;
  /** Un vote, ou un changement d'avis : le duel se clôt dès que tous ceux qu'on attend ont voté. */
  voter(id: string, face: FaceDuDuel, heure: number): void;
  /** L'hôte clôt le duel sans attendre ceux qui n'ont pas voté : il faut qu'au moins un ait voté. */
  clore(heure: number): void;
  /** Quelqu'un ne compte plus (sa ligne est tombée, il est parti) : le duel se clôt si tous ceux qui restent ont voté. */
  recompter(heure: number): void;
  /** L'heure passe : un duel qui dure relit ses extraits. Rend l'heure de la prochaine relecture, s'il y a un duel en cours. */
  avancer(heure: number): number | undefined;
  /** Les extraits du duel en cours, pour qui arrive ou revient. */
  readonly extraits: ExtraitsDuDuel | undefined;
  /** Combien de duels se sont clos dans la room, tournois enchaînés compris. */
  readonly duelsClos: number;
  /** Une nouvelle partie dans la room (une revanche, une autre playlist) : le prochain lancer tirera un autre tableau. */
  recommencer(): void;
}

/** Le duel en cours, tel que le serveur le tient : ses deux pistes (leurs liens les plus frais), et l'heure de leur prochaine relecture. */
interface DuelDuServeur {
  readonly a: number;
  pistes: Readonly<Record<FaceDuDuel, PisteDuMode>>;
  relireA: number;
}

/** Ce qu'on montre d'un titre au tableau : sa réponse, avec son anecdote s'il en a une (rien n'y est à deviner). */
const reponseMontree = ({ reponse, anecdote }: PisteDuMode): Reponse => (anecdote !== undefined ? { ...reponse, anecdote } : reponse);

/** La piste telle que la playlist la donne maintenant, retrouvée par son identifiant chez Deezer, sinon par son titre ; rien si elle n'y est plus. */
function fraiche(piste: PisteDuMode, pistes: readonly PisteDuMode[]): PisteDuMode | undefined {
  const parDeezer = piste.deezer !== undefined ? pistes.find((p) => p.deezer === piste.deezer) : undefined;
  return parDeezer ?? pistes.find((p) => memeTitre(p) === memeTitre(piste));
}

const extraitsDu = (d: DuelDuServeur): ExtraitsDuDuel => ({
  duel: d.a,
  faces: {
    ...(d.pistes.A.extrait !== undefined ? { A: d.pistes.A.extrait } : {}),
    ...(d.pistes.B.extrait !== undefined ? { B: d.pistes.B.extrait } : {}),
  },
});

export function preparerLeTournoi(r: CeQueLaRoomPrete): TournoiDeLaRoom {
  /** Les titres du tableau, à leur place ; vide tant qu'on ne l'a pas tiré. */
  let tableau: PisteDuMode[] = [];
  /** Ce qui a déjà été au tableau dans la room, par `memeTitre` : une revanche prend d'autres titres, tant qu'il y en a. */
  const deja = new Set<string>();
  let duel: DuelDuServeur | undefined;
  let duelsClos = 0;

  /** Le tableau du tournoi : ses titres, pris dans la playlist, puis leurs places tirées au sort. Faux s'il n'y en a pas assez. */
  function tirer(titres: number): boolean {
    const pris = titresDuTableau(r.pistes(), titres, deja);
    if (pris.length < titres) return false;
    tableau = dansLOrdre(pris, unOrdreAuHasard(pris.length, r.tirage));
    for (const p of tableau) deja.add(memeTitre(p));
    return true;
  }

  function cloturer(issue: Issue, heure: number): void {
    const avant = r.etat();
    r.ajouter({ genre: 'cloture', a: heure, ...issue });
    duel = undefined;
    duelsClos++;
    r.raconter({ genre: 'cloture', par: issue.par, votants: Object.keys(issue.votes).length, joueurs: quiVotent(avant.joueurs).length });
    if (r.etat().phase === 'fin') r.quandFini(heure);
  }

  function recompter(heure: number): void {
    const e = r.etat();
    const enCours = e.tournoi?.enCours;
    if (enCours !== undefined && toutLeMondeAVote(enCours, quiVotent(e.joueurs))) cloturer(issueAuxVoix(enCours.votes, r.tirage), heure);
  }

  return {
    lancer(heure) {
      const e = r.etat();
      const t = e.tournoi;
      if (t === undefined || t.enCours !== undefined || e.phase === 'fin') return undefined;
      if (t.clos.length === 0 && !tirer(t.titres)) return 'tropCourt';
      const prochain = prochainDuel(t);
      const [haut, bas] = prochain?.places ?? [];
      const auTableau = { A: haut !== undefined ? tableau[haut] : undefined, B: bas !== undefined ? tableau[bas] : undefined };
      if (prochain === undefined || haut === undefined || bas === undefined || auTableau.A === undefined || auTableau.B === undefined)
        return undefined;
      // Les liens les plus frais ; une piste que la playlist ne donne plus ne se jouera pas.
      const maintenant = r.pistes();
      const A = fraiche(auTableau.A, maintenant);
      const B = fraiche(auTableau.B, maintenant);
      const engage = (place: number, piste: PisteDuMode): Engage => ({ place, reponse: reponseMontree(piste) });
      r.ajouter({ genre: 'duel', a: heure, faces: { A: engage(haut, A ?? auTableau.A), B: engage(bas, B ?? auTableau.B) } });
      r.raconter({ genre: 'duel', numero: prochain.numero + 1 });
      if (A === undefined || B === undefined) {
        // Forfait : l'autre passe ; et si aucune des deux ne se joue plus, le disque, lancé comme une pièce, en décide.
        const gagnante: FaceDuDuel = A !== undefined ? 'A' : B !== undefined ? 'B' : r.tirage() < 1 / 2 ? 'A' : 'B';
        cloturer({ votes: {}, gagnante, par: 'forfait' }, heure);
        return undefined;
      }
      duel = { a: heure, pistes: { A, B }, relireA: heure + TOURNOI.relecture };
      r.diffuser({ genre: 'extraits', heure, ...extraitsDu(duel) });
      return undefined;
    },
    voter(id, face, heure) {
      const e = r.etat();
      const enCours = e.tournoi?.enCours;
      const votant = e.joueurs.find((j) => j.id === id);
      if (enCours === undefined || votant === undefined || votant.spectateur || enCours.votes[id] === face) return;
      r.ajouter({ genre: 'vote', a: heure, id, face });
      recompter(heure);
    },
    clore(heure) {
      const enCours = r.etat().tournoi?.enCours;
      if (enCours !== undefined && enCours.votants.length > 0) cloturer(issueAuxVoix(enCours.votes, r.tirage), heure);
    },
    recompter,
    avancer(heure) {
      if (duel === undefined) return undefined;
      if (heure >= duel.relireA) {
        const maintenant = r.pistes();
        const pistes = { A: fraiche(duel.pistes.A, maintenant) ?? duel.pistes.A, B: fraiche(duel.pistes.B, maintenant) ?? duel.pistes.B };
        const changes = pistes.A.extrait !== duel.pistes.A.extrait || pistes.B.extrait !== duel.pistes.B.extrait;
        duel.pistes = pistes;
        duel.relireA = heure + TOURNOI.relecture;
        if (changes) r.diffuser({ genre: 'extraits', heure, ...extraitsDu(duel) });
      }
      return duel.relireA;
    },
    get extraits() {
      return duel !== undefined ? extraitsDu(duel) : undefined;
    },
    get duelsClos() {
      return duelsClos;
    },
    recommencer() {
      tableau = [];
      duel = undefined;
    },
  };
}
