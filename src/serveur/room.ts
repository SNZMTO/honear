/**
 * Une room, côté serveur : son journal, le déroulé de sa piste en cours, sa playlist, et les téléphones qui y sont branchés.
 * Elle reçoit leurs actions, datées de l'horloge du serveur, décide de tout, et envoie à chacun ce qu'il peut savoir : l'état complet
 * quand il arrive ou revient, puis un événement publié à la fois, et le déroulé de la piste. Rien ici ne touche au réseau ni ne lit
 * l'heure : on la lui donne à chaque fois, et `avancer` fait arriver ce qui devait arriver (l'extrait qui part, la révélation).
 */

import { publier, type Action, type Nouvelle } from '../regles/messages';
import { MODES, type CleDeMode, type PisteDuMode } from '../regles/modes';
import { dureeDeLExtrait, partieA, type EtatDeLaPartie, type EvenementDePartie, type Face, type SonDeLaRoom } from '../regles/partie';
import { DUREE_DU_DECOMPTE, finDeLExtrait, jouer, type ActionDePiste, type Piste } from '../regles/piste';
import type { Pochette } from '../ressources/pochettes';
import { DEROULE, PARTIE } from '../ressources/reglages';

/** De quoi écrire à un téléphone branché. */
export type Envoyer = (nouvelle: Nouvelle) => void;

/** Ce que l'hôte a réglé sur la platine en ouvrant la room. */
export interface ReglagesDeLaRoom {
  readonly mode: CleDeMode;
  readonly pistes: number;
  /** La durée de l'extrait réglée sur le bouton « Extrait », en secondes ; le mode peut en imposer une autre. */
  readonly extrait: number;
  readonly son: SonDeLaRoom;
}

export interface Room {
  readonly code: string;
  /** Le lien de sa playlist : la source la relit à chaque partie, ses extraits expirant. */
  readonly playlist: string;
  /** L'heure où l'hôte l'a ouverte. */
  readonly ouverteA: number;
  /** Le journal tel que le serveur le tient : avec ce qu'il faut trouver et ce que chacun a tapé. Il ne sort jamais tel quel. */
  readonly journal: readonly EvenementDePartie[];
  readonly etat: EtatDeLaPartie;
  /** Combien de téléphones y sont branchés, et l'heure de la dernière chose qui s'y est passée : de quoi la laisser expirer. */
  readonly branches: number;
  readonly activite: number;
  /**
   * Un joueur arrive, avec sa pochette : il reçoit l'état complet, avec son jeton, les autres apprennent son arrivée.
   * @param jeton le secret qu'il redonnera pour revenir à sa place.
   */
  arriver(id: string, pochette: Pochette, envoyer: Envoyer, heure: number, jeton: string): void;
  /** Un joueur qui revient (la page rechargée, le réseau retrouvé) : il reçoit l'état complet ; sa pochette se remet à l'endroit. */
  revenir(id: string, envoyer: Envoyer, heure: number): void;
  /** Sa connexion tombe : sa place est gardée, sa pochette se retourne. */
  debrancher(id: string, heure: number): void;
  recevoir(id: string, action: Action, heure: number): void;
  /** L'heure passe : ce qui devait arriver arrive. Rend l'heure du prochain rendez-vous, s'il y en a un. */
  avancer(heure: number): number | undefined;
}

/** Ce que la room sait de la piste en cours : la piste de la playlist, son déroulé, qui est prêt, et si son extrait est parti. */
interface PisteDeLaRoom {
  readonly attendue: PisteDuMode;
  piste: Piste | undefined;
  readonly seance: ActionDePiste[];
  readonly prets: Set<string>;
  extraitParti: boolean;
}

/**
 * Ouvre une room : l'hôte la crée avec ses réglages et sa playlist ; il y arrivera comme les autres.
 * @param playlist le lien de la playlist choisie dans le bac.
 * @param pistes ses pistes, dans l'ordre où elles se jouent (la face A, puis la face B), telles qu'elles sont à l'instant où on les
 * demande : les liens des extraits expirent, la source les relit avant qu'on lance une piste.
 * @param quandFinie appelé une fois par face, à la révélation de sa dernière piste, avec l'état de la partie finie.
 */
export function ouvrirUneRoom(
  code: string,
  reglages: ReglagesDeLaRoom,
  playlist: string,
  pistes: () => readonly PisteDuMode[],
  heure: number,
  quandFinie?: (etat: EtatDeLaPartie) => void,
): Room {
  const ouverture = (a: number, face: Face = 'A'): EvenementDePartie => ({
    genre: 'ouverture',
    a,
    mode: reglages.mode,
    pistes: reglages.pistes,
    son: reglages.son,
    face,
  });
  let journal: EvenementDePartie[] = [ouverture(heure)];
  let enCours: PisteDeLaRoom | undefined;
  /** La prochaine piste de la playlist : la face B reprend où la face A s'est arrêtée. */
  let prochaine = 0;
  let publies = 0;
  let activite = heure;
  const branches = new Map<string, Envoyer>();
  /** Le jeton de chaque joueur : envoyé à lui seul, dans son état complet. */
  const jetons = new Map<string, string>();

  const etat = (): EtatDeLaPartie => partieA(journal, Infinity);
  const diffuser = (nouvelle: Nouvelle): void => {
    for (const envoyer of branches.values()) envoyer(nouvelle);
  };
  /** Ce que le journal publié a de nouveau, un événement à la fois, à tous ceux qui sont branchés. */
  function ajouter(e: EvenementDePartie): void {
    journal.push(e);
    const publie = publier(journal);
    for (const evenement of publie.slice(publies)) diffuser({ genre: 'evenement', heure: e.a, evenement });
    publies = publie.length;
  }
  const etatComplet = (toi: string, heure: number): Nouvelle => ({
    genre: 'etat',
    heure,
    code,
    toi,
    jeton: jetons.get(toi) ?? '',
    journal: publier(journal),
    seance: [...(enCours?.seance ?? [])],
    ...(enCours?.attendue.extrait !== undefined ? { extrait: enCours.attendue.extrait } : {}),
  });
  function jouerLaPiste(p: PisteDeLaRoom, action: ActionDePiste): void {
    p.piste = jouer(p.piste, action);
    p.seance.push(action);
    // Le lancer porte l'adresse de l'extrait : chaque téléphone le précharge pendant le décompte.
    const extrait = action.genre === 'lancer' ? p.attendue.extrait : undefined;
    diffuser({ genre: 'piste', heure: action.a, action, ...(extrait !== undefined ? { extrait } : {}) });
  }
  /** Ceux dont il faut attendre qu'ils soient prêts : l'hôte seul s'il joue le son pour tous, sinon chaque joueur branché. */
  const attendus = (): string[] => {
    const e = etat();
    if (reglages.son === 'hote') return e.hote !== undefined ? [e.hote] : [];
    return e.joueurs.filter((j) => j.connecte && branches.has(j.id)).map((j) => j.id);
  };
  const estLHote = (id: string): boolean => etat().hote === id;

  function lancer(id: string, heure: number): void {
    const e = etat();
    const toutes = pistes();
    const attendue = toutes[prochaine % Math.max(1, toutes.length)];
    const libre = enCours === undefined || enCours.piste?.revelation !== undefined;
    if (!estLHote(id) || !libre || attendue === undefined || e.phase === 'fin' || e.joueurs.length < PARTIE.joueurs.auMoins) return;
    prochaine++;
    const p: PisteDeLaRoom = { attendue, piste: undefined, seance: [], prets: new Set(), extraitParti: false };
    enCours = p;
    jouerLaPiste(p, { genre: 'lancer', a: heure, duree: dureeDeLExtrait(MODES[reglages.mode], reglages.extrait) });
  }

  function pret(id: string, heure: number): void {
    const p = enCours;
    if (p?.piste === undefined || p.piste.extraitA !== undefined) return;
    p.prets.add(id);
    if (attendus().every((attendu) => p.prets.has(attendu))) jouerLaPiste(p, { genre: 'prets', a: heure });
  }

  /** « Rejouer la face B » : une nouvelle partie, avec les mêmes, aux mêmes places ; la playlist reprend où elle s'est arrêtée. */
  function rejouer(id: string, heure: number): void {
    const e = etat();
    if (!estLHote(id) || e.phase !== 'fin') return;
    journal = [
      ouverture(heure, 'B'),
      ...e.joueurs.flatMap((j): EvenementDePartie[] => [
        { genre: 'arrivee', a: heure, id: j.id, pochette: j.pochette },
        ...(j.connecte ? [] : [{ genre: 'deconnexion' as const, a: heure, id: j.id }]),
      ]),
    ];
    enCours = undefined;
    publies = publier(journal).length;
    for (const [qui, envoyer] of branches) envoyer(etatComplet(qui, heure));
  }

  /** La réponse se révèle, à cet instant : à la fin de l'extrait, ou dès que le premier a tout trouvé. */
  function reveler(p: PisteDeLaRoom, a: number): void {
    if (p.piste === undefined || p.piste.revelation !== undefined) return;
    jouerLaPiste(p, { genre: 'reveler', a, reponse: p.attendue.reponse });
    ajouter({ genre: 'revelation', a });
    // La dernière piste de la face : la partie est finie, ses scores comptent.
    const apres = etat();
    if (apres.phase === 'fin') quandFinie?.(apres);
  }

  function avancer(heure: number): number | undefined {
    const p = enCours;
    if (p?.piste === undefined) return undefined;
    // Les retardataires ne retiennent pas la piste : l'extrait part sans eux, ils le rejoindront en route.
    const auPlusTard = p.piste.decompteA + DUREE_DU_DECOMPTE + DEROULE.attente;
    if (p.piste.extraitA === undefined && heure >= auPlusTard) jouerLaPiste(p, { genre: 'prets', a: auPlusTard });
    const { extraitA } = p.piste;
    if (extraitA === undefined) return auPlusTard;
    if (!p.extraitParti && heure >= extraitA) {
      p.extraitParti = true;
      ajouter({ genre: 'extrait', a: extraitA, piste: p.attendue });
    }
    const fin = finDeLExtrait(p.piste);
    if (fin === undefined) return undefined;
    if (p.piste.revelation === undefined && heure >= fin) reveler(p, fin);
    if (!p.extraitParti) return extraitA;
    return p.piste.revelation === undefined ? fin : undefined;
  }

  return {
    code,
    playlist,
    ouverteA: heure,
    get journal() {
      return journal;
    },
    get etat() {
      return etat();
    },
    get branches() {
      return branches.size;
    },
    get activite() {
      return activite;
    },
    arriver(id, pochette, envoyer, heure, jeton) {
      activite = heure;
      avancer(heure);
      if (etat().joueurs.length >= PARTIE.joueurs.auPlus) {
        envoyer({ genre: 'refus', heure, raison: 'complet' });
        return;
      }
      ajouter({ genre: 'arrivee', a: heure, id, pochette });
      jetons.set(id, jeton);
      branches.set(id, envoyer);
      envoyer(etatComplet(id, heure));
    },
    revenir(id, envoyer, heure) {
      activite = heure;
      avancer(heure);
      const joueur = etat().joueurs.find((j) => j.id === id);
      if (joueur === undefined) {
        envoyer({ genre: 'refus', heure, raison: 'codeInconnu' });
        return;
      }
      if (!joueur.connecte) ajouter({ genre: 'retour', a: heure, id });
      branches.set(id, envoyer);
      envoyer(etatComplet(id, heure));
    },
    debrancher(id, heure) {
      activite = heure;
      avancer(heure);
      if (!branches.delete(id)) return;
      if (etat().joueurs.some((j) => j.id === id && j.connecte)) ajouter({ genre: 'deconnexion', a: heure, id });
    },
    recevoir(id, action, heure) {
      activite = heure;
      avancer(heure);
      if (!branches.has(id)) return;
      switch (action.genre) {
        case 'lancer':
          return lancer(id, heure);
        case 'pret':
          return pret(id, heure);
        case 'repondre': {
          const fin = enCours?.piste !== undefined ? finDeLExtrait(enCours.piste) : undefined;
          if (enCours?.extraitParti === true && fin !== undefined && heure < fin) {
            ajouter({ genre: 'reponse', a: heure, id, proposition: action.proposition });
            // Un mode où le premier qui a tout trouvé arrête la piste : la réponse se révèle tout de suite.
            const trouve = etat().piste?.trouve[id] ?? [];
            const aTrouver = MODES[reglages.mode].aTrouver(enCours.attendue);
            if (MODES[reglages.mode].finitAuPremier === true && aTrouver.every((partie) => trouve.includes(partie))) reveler(enCours, heure);
          }
          return;
        }
        case 'changerDePochette': {
          const joueur = etat().joueurs.find((j) => j.id === id);
          const deja = journal.filter((e) => e.genre === 'nouvellePochette' && e.id === id).length;
          if (joueur === undefined || deja >= PARTIE.retouches || JSON.stringify(joueur.pochette) === JSON.stringify(action.pochette)) return;
          ajouter({ genre: 'nouvellePochette', a: heure, id, pochette: action.pochette });
          return;
        }
        case 'rejouer':
          return rejouer(id, heure);
        case 'quitter':
          branches.delete(id);
          ajouter({ genre: 'depart', a: heure, id });
          return;
        case 'creer':
        case 'rejoindre':
        case 'quelleHeure':
        case 'chercher':
        case 'importer':
        case 'demanderUnLien':
        case 'ouvrirLeCompte':
        case 'reprendreLeCompte':
        case 'sortirDuCompte':
        case 'effacerLeCompte':
          // On ne crée ni ne rejoint une room de l'intérieur d'une autre ; l'heure, la musique et les comptes ne sont pas l'affaire d'une room.
          return;
      }
    },
    avancer,
  };
}
