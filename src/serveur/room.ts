/**
 * Une room, côté serveur : son journal, le déroulé de sa piste en cours, sa playlist, et les téléphones qui y sont branchés.
 * Elle reçoit leurs actions, datées de l'horloge du serveur, décide de tout, et envoie à chacun ce qu'il peut savoir : l'état complet
 * quand il arrive ou revient, puis un événement publié à la fois, et le déroulé de la piste. Rien ici ne touche au réseau ni ne lit
 * l'heure : on la lui donne à chaque fois, et `avancer` fait arriver ce qui devait arriver (l'extrait qui part, la révélation).
 * Une room en tournoi n'a pas de pistes mais des duels : elle les confie à son tournoi (`tournoi.ts`), et garde le reste.
 */

import { publier, type Action, type Nouvelle } from '../regles/messages';
import { enDuels, MODES, modeADeviner, type CleDeMode, type PisteDuMode } from '../regles/modes';
import { dureeDeLExtrait, partieA, type EtatDeLaPartie, type EvenementDePartie, type Face, type SonDeLaRoom } from '../regles/partie';
import { DUREE_DU_DECOMPTE, finDeLExtrait, jouer, type ActionDePiste, type Piste } from '../regles/piste';
import type { Tirage } from '../regles/pochette';
import { tailleDuTableau } from '../regles/tournoi';
import type { Pochette } from '../ressources/pochettes';
import { DEROULE, PARTIE } from '../ressources/reglages';
import type { FaitDuJeu, FaitSansLaRoom, Raconter } from './faits';
import { preparerLeTournoi } from './tournoi';

/** De quoi écrire à un téléphone branché. */
export type Envoyer = (nouvelle: Nouvelle) => void;

/** Ce que l'hôte a réglé sur la platine en ouvrant la room. */
export interface ReglagesDeLaRoom {
  readonly mode: CleDeMode;
  /** Le nombre de pistes ; au tournoi, la taille du tableau qu'on veut (la playlist peut n'en remplir qu'une plus petite). */
  readonly pistes: number;
  /** La durée de l'extrait réglée sur le bouton « Extrait », en secondes ; le mode peut en imposer une autre. */
  readonly extrait: number;
  readonly son: SonDeLaRoom;
}

export interface Room {
  readonly code: string;
  /** Le lien de sa playlist : la source la relit à chaque partie, ses extraits expirant. L'hôte peut en changer. */
  readonly playlist: string;
  /** L'heure où l'hôte l'a ouverte. */
  readonly ouverteA: number;
  /** Le journal tel que le serveur le tient : avec ce qu'il faut trouver et ce que chacun a tapé. Il ne sort jamais tel quel. */
  readonly journal: readonly EvenementDePartie[];
  readonly etat: EtatDeLaPartie;
  /** Combien de téléphones y sont branchés, et l'heure de la dernière chose qui s'y est passée : de quoi la laisser expirer. */
  readonly branches: number;
  readonly activite: number;
  /** Vrai dès que l'hôte y a lancé une piste : une room qu'on a ouverte puis laissée, sans jamais jouer, s'en va plus tôt. */
  readonly lancee: boolean;
  /**
   * Un joueur arrive, avec sa pochette : il reçoit l'état complet, avec son jeton, les autres apprennent son arrivée.
   * @param jeton le secret qu'il redonnera pour revenir à sa place.
   */
  arriver(id: string, pochette: Pochette, envoyer: Envoyer, heure: number, jeton: string): void;
  /** Un joueur qui revient (la page rechargée, le réseau retrouvé) : il reçoit l'état complet ; sa pochette se remet à l'endroit. */
  revenir(id: string, envoyer: Envoyer, heure: number): void;
  /**
   * Sa connexion tombe : sa place est gardée, sa pochette se retourne.
   * @param envoyer la ligne qui tombe : s'il est déjà revenu par une autre (le serveur ne voit une ligne morte qu'au battement
   * d'après), il reste branché sur celle-là.
   */
  debrancher(id: string, heure: number, envoyer?: Envoyer): void;
  recevoir(id: string, action: Action, heure: number): void;
  /**
   * L'hôte change de playlist, quand il veut, même en pleine piste : celle-ci s'arrête là, et la partie repart sur la face A de la
   * nouvelle, avec les mêmes, aux mêmes places, leurs points remis à zéro (au tournoi, sur un nouveau tableau). Ce qui n'est pas
   * l'hôte ne change rien.
   * @param pistes ses pistes, dans l'ordre où elles se joueront, comme à l'ouverture.
   */
  changerDePlaylist(id: string, playlist: string, pistes: () => readonly PisteDuMode[], heure: number): void;
  /** L'heure passe : ce qui devait arriver arrive. Rend l'heure du prochain rendez-vous, s'il y en a un. */
  avancer(heure: number): number | undefined;
  /** La room s'en va (personne n'y est plus, ou elle a trop duré) : elle raconte ce qu'elle a été. */
  fermer(heure: number): void;
}

/** Ce que la room sait de la piste en cours : la piste de la playlist, son déroulé, qui est prêt, et si son extrait est parti. */
interface PisteDeLaRoom {
  readonly attendue: PisteDuMode;
  piste: Piste | undefined;
  readonly seance: ActionDePiste[];
  readonly prets: Set<string>;
  extraitParti: boolean;
  /** Vrai dès qu'une réponse y a trouvé quelque chose. */
  trouvee: boolean;
}

/**
 * Ouvre une room : l'hôte la crée avec ses réglages et sa playlist ; il y arrivera comme les autres.
 * @param playlist le lien de la playlist choisie dans le bac.
 * @param pistes ses pistes, dans l'ordre où elles se jouent (la face A, puis la face B), telles qu'elles sont à l'instant où on les
 * demande : les liens des extraits expirent, la source les relit avant qu'on lance une piste.
 * @param tirage le hasard du serveur : au tournoi, les places au tableau, et le disque qu'on lance comme une pièce.
 * @param quandFinie appelé une fois par face, à la révélation de sa dernière piste (au tournoi, à la clôture de sa finale), avec
 * l'état de la partie finie.
 * @param raconter ce qui se passe dans la room, pour qu'on le compte (voir faits.ts).
 */
export function ouvrirUneRoom(
  code: string,
  reglages: ReglagesDeLaRoom,
  playlistDeDepart: string,
  pistesDeDepart: () => readonly PisteDuMode[],
  heure: number,
  tirage: Tirage,
  quandFinie?: (etat: EtatDeLaPartie) => void,
  raconter?: Raconter,
): Room {
  let playlist = playlistDeDepart;
  let pistes = pistesDeDepart;
  const ouverteA = heure;
  /** Ce que la room raconte d'elle, avec son code, son mode, et la playlist qu'elle joue à cet instant. */
  const raconterDeLaRoom = (fait: FaitSansLaRoom): void => raconter?.({ room: code, mode: reglages.mode, playlist, ...fait } as FaitDuJeu);
  /** Ce qu'elle aura été : quand sa face a commencé, combien de pistes elle a jouées, de joueurs au plus, si on y a joué. */
  let debutDeLaFace: number | undefined;
  let pistesJouees = 0;
  let joueursAuPlus = 0;
  let lancee = false;
  const enTournoi = enDuels(reglages.mode);
  /** Le nombre de pistes de la partie ; au tournoi, la taille du tableau que la playlist remplit, au plus celle qu'on veut. */
  const pistesDeLaPartie = (): number => (enTournoi ? (tailleDuTableau(pistes(), reglages.pistes) ?? reglages.pistes) : reglages.pistes);
  const ouverture = (a: number, face: Face = 'A'): EvenementDePartie => ({
    genre: 'ouverture',
    a,
    mode: reglages.mode,
    pistes: pistesDeLaPartie(),
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
  /** Ce que le journal publié a de nouveau, un événement à la fois, à tous ceux qui sont branchés. Rend ce qui a été publié. */
  function ajouter(e: EvenementDePartie): EvenementDePartie[] {
    journal.push(e);
    const publie = publier(journal);
    const nouveaux = publie.slice(publies);
    for (const evenement of nouveaux) diffuser({ genre: 'evenement', heure: e.a, evenement });
    publies = publie.length;
    return nouveaux;
  }
  /** Les joueurs qui jouent, sans ceux qui regardent. */
  const quiJouent = (e: EtatDeLaPartie): number => e.joueurs.filter((j) => !j.spectateur).length;
  /** Au tournoi : le tableau, les duels, les votes, la clôture (voir tournoi.ts). */
  const tournoi = enTournoi
    ? preparerLeTournoi({
        etat: () => etat(),
        ajouter: (e) => void ajouter(e),
        diffuser: (nouvelle) => diffuser(nouvelle),
        pistes: () => pistes(),
        tirage,
        raconter: (fait) => raconterDeLaRoom(fait),
        quandFini: (a) => faceFinie(a),
      })
    : undefined;
  const etatComplet = (toi: string, heure: number): Nouvelle => ({
    genre: 'etat',
    heure,
    code,
    toi,
    jeton: jetons.get(toi) ?? '',
    journal: publier(journal),
    seance: [...(enCours?.seance ?? [])],
    ...(enCours?.attendue.extrait !== undefined ? { extrait: enCours.attendue.extrait } : {}),
    ...(tournoi?.extraits !== undefined ? { extraits: tournoi.extraits } : {}),
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
  /** Combien de joueurs il faut pour lancer, et combien la room en accueille : ceux du mode (le solo, un seul), sinon ceux d'une partie. */
  const joueursDuMode = MODES[reglages.mode].joueurs ?? PARTIE.joueurs;

  function lancer(id: string, heure: number): void {
    const e = etat();
    if (!estLHote(id) || e.phase === 'fin' || e.joueurs.length < joueursDuMode.auMoins) return;
    if (tournoi !== undefined) {
      if (e.pistesJouees === 0 && e.tournoi?.enCours === undefined) debutDeLaFace = heure;
      // La playlist n'a plus de quoi remplir le tableau : l'hôte en choisira une autre, comme pour une face trop courte.
      if (tournoi.lancer(heure) === 'tropCourt') {
        branches.get(id)?.({ genre: 'refus', heure, raison: 'tropCourt' });
        raconter?.({ genre: 'refus', raison: 'tropCourt' });
        return;
      }
      lancee = true;
      return;
    }
    const mode = modeADeviner(reglages.mode);
    const toutes = pistes();
    const attendue = toutes[prochaine % Math.max(1, toutes.length)];
    const libre = enCours === undefined || enCours.piste?.revelation !== undefined;
    if (mode === undefined || !libre || attendue === undefined) return;
    prochaine++;
    const p: PisteDeLaRoom = { attendue, piste: undefined, seance: [], prets: new Set(), extraitParti: false, trouvee: false };
    enCours = p;
    jouerLaPiste(p, { genre: 'lancer', a: heure, duree: dureeDeLExtrait(mode, reglages.extrait) });
    const numero = e.pistesJouees + 1;
    if (numero === 1) debutDeLaFace = heure;
    lancee = true;
    raconterDeLaRoom({ genre: 'lancer', numero, face: e.face });
  }

  function pret(id: string, heure: number): void {
    const p = enCours;
    if (p?.piste === undefined || p.piste.extraitA !== undefined) return;
    p.prets.add(id);
    if (attendus().every((attendu) => p.prets.has(attendu))) jouerLaPiste(p, { genre: 'prets', a: heure });
  }

  /** Une nouvelle partie, sur cette face, avec les mêmes, aux mêmes places : chacun reçoit l'état complet de la room qui repart. */
  function repartir(face: Face, heure: number): void {
    const e = etat();
    journal = [
      ouverture(heure, face),
      ...e.joueurs.flatMap((j): EvenementDePartie[] => [
        { genre: 'arrivee', a: heure, id: j.id, pochette: j.pochette },
        ...(j.connecte ? [] : [{ genre: 'deconnexion' as const, a: heure, id: j.id }]),
      ]),
    ];
    enCours = undefined;
    publies = publier(journal).length;
    for (const [qui, envoyer] of branches) envoyer(etatComplet(qui, heure));
  }

  /** « Rejouer la face B » : la playlist reprend où elle s'est arrêtée. Au tournoi, une revanche : un autre tableau, d'autres titres tant qu'il y en a. */
  function rejouer(id: string, heure: number): void {
    if (!estLHote(id) || etat().phase !== 'fin') return;
    tournoi?.recommencer();
    repartir(tournoi !== undefined ? 'A' : 'B', heure);
    raconterDeLaRoom({ genre: 'rejouer' });
  }

  /** La partie est finie, à cet instant : ses scores comptent, et la room raconte ce qu'elle a été. */
  function faceFinie(a: number): void {
    const apres = etat();
    quandFinie?.(apres);
    raconterDeLaRoom({
      genre: 'faceFinie',
      face: apres.face,
      joueurs: quiJouent(apres),
      duree: a - (debutDeLaFace ?? a),
      meilleur: Math.max(0, ...apres.joueurs.map((j) => j.points)),
    });
  }

  /** La réponse se révèle, à cet instant : à la fin de l'extrait, ou dès que le premier a tout trouvé. */
  function reveler(p: PisteDeLaRoom, a: number): void {
    if (p.piste === undefined || p.piste.revelation !== undefined) return;
    const avant = etat();
    jouerLaPiste(p, { genre: 'reveler', a, reponse: p.attendue.reponse });
    ajouter({ genre: 'revelation', a });
    // La dernière piste de la face : la partie est finie, ses scores comptent.
    const apres = etat();
    pistesJouees++;
    const { titre, artiste } = p.attendue.reponse;
    raconterDeLaRoom({
      genre: 'revelation',
      titre,
      artiste,
      trouvee: apres.trouvees[apres.trouvees.length - 1] === true,
      trouveurs: Object.keys(avant.piste?.trouve ?? {}).length,
      joueurs: quiJouent(avant),
    });
    if (apres.phase === 'fin') faceFinie(a);
  }

  function avancer(heure: number): number | undefined {
    if (tournoi !== undefined) return tournoi.avancer(heure);
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
      raconterDeLaRoom({ genre: 'extrait' });
    }
    const fin = finDeLExtrait(p.piste);
    if (fin === undefined) return undefined;
    if (p.piste.revelation === undefined && heure >= fin) reveler(p, fin);
    if (!p.extraitParti) return extraitA;
    return p.piste.revelation === undefined ? fin : undefined;
  }

  raconterDeLaRoom({ genre: 'ouverte', pistes: reglages.pistes, extrait: reglages.extrait, son: reglages.son });
  return {
    code,
    get playlist() {
      return playlist;
    },
    ouverteA,
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
    get lancee() {
      return lancee;
    },
    arriver(id, pochette, envoyer, heure, jeton) {
      activite = heure;
      avancer(heure);
      if (etat().joueurs.length >= joueursDuMode.auPlus) {
        // En solo, on le dit : ce n'est pas qu'il y a trop de monde.
        envoyer({ genre: 'refus', heure, raison: joueursDuMode.auPlus === 1 ? 'solo' : 'complet' });
        raconter?.({ genre: 'refus', raison: 'complet' });
        return;
      }
      ajouter({ genre: 'arrivee', a: heure, id, pochette });
      jetons.set(id, jeton);
      branches.set(id, envoyer);
      envoyer(etatComplet(id, heure));
      const apres = etat();
      joueursAuPlus = Math.max(joueursAuPlus, apres.joueurs.length);
      raconterDeLaRoom({ genre: 'arrivee', joueurs: apres.joueurs.length, spectateur: apres.joueurs.some((j) => j.id === id && j.spectateur) });
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
      raconterDeLaRoom({ genre: 'retour' });
    },
    debrancher(id, heure, envoyer) {
      activite = heure;
      avancer(heure);
      // Revenu entre-temps par une autre ligne : celle qui tombe n'était plus la sienne. Sans cela, le serveur, qui ne voit une ligne
      // morte qu'au battement d'après, débranchait la nouvelle : le téléphone ne recevait plus rien de la room, ni piste ni son.
      if (envoyer !== undefined && branches.get(id) !== envoyer) return;
      if (!branches.delete(id)) return;
      if (!etat().joueurs.some((j) => j.id === id && j.connecte)) return;
      ajouter({ genre: 'deconnexion', a: heure, id });
      raconterDeLaRoom({ genre: 'deconnexion' });
      // Au tournoi, on n'attend plus son vote : le duel se clôt peut-être.
      tournoi?.recompter(heure);
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
            const jugee = ajouter({ genre: 'reponse', a: heure, id, proposition: action.proposition }).find(
              (e): e is Extract<EvenementDePartie, { genre: 'jugee' }> => e.genre === 'jugee',
            );
            if (jugee !== undefined) {
              const premiere = jugee.trouve.length > 0 && !enCours.trouvee;
              if (jugee.trouve.length > 0) enCours.trouvee = true;
              const { verdict, trouve, points, complet } = jugee;
              raconterDeLaRoom({ genre: 'reponse', verdict, trouve, points, complet, delai: heure - (enCours.piste?.extraitA ?? heure), premiere });
            }
            // Un mode où le premier qui a tout trouvé arrête la piste : la réponse se révèle tout de suite.
            const trouve = etat().piste?.trouve[id] ?? [];
            const mode = modeADeviner(reglages.mode);
            const aTrouver = mode?.aTrouver(enCours.attendue) ?? [];
            if (mode?.finitAuPremier === true && aTrouver.every((partie) => trouve.includes(partie))) reveler(enCours, heure);
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
        case 'voter':
          return tournoi?.voter(id, action.face, heure);
        case 'clore':
          // Seul l'hôte clôt un duel sans attendre tout le monde.
          if (estLHote(id)) tournoi?.clore(heure);
          return;
        case 'rejouer':
          return rejouer(id, heure);
        case 'changerDePlaylist':
          // Il faut lire la nouvelle playlist d'abord : c'est le serveur qui la donne, par `changerDePlaylist`.
          return;
        case 'quitter':
          branches.delete(id);
          ajouter({ genre: 'depart', a: heure, id });
          raconterDeLaRoom({ genre: 'depart' });
          // Au tournoi, qui s'en va ne compte plus : son vote s'efface, et le duel se clôt peut-être.
          tournoi?.recompter(heure);
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
        case 'diagnostic':
        case 'statistique':
          // On ne crée ni ne rejoint une room de l'intérieur d'une autre ; l'heure, la musique, les comptes, le diagnostic et les
          // statistiques ne sont pas l'affaire d'une room.
          return;
      }
    },
    changerDePlaylist(id, lien, nouvelles, heure) {
      activite = heure;
      avancer(heure);
      if (!branches.has(id) || !estLHote(id)) return;
      playlist = lien;
      pistes = nouvelles;
      prochaine = 0;
      tournoi?.recommencer();
      repartir('A', heure);
      raconterDeLaRoom({ genre: 'autrePlaylist' });
    },
    avancer,
    fermer(heure) {
      raconterDeLaRoom({ genre: 'fermee', duree: heure - ouverteA, pistes: pistesJouees + (tournoi?.duelsClos ?? 0), joueursAuPlus, lancee });
    },
  };
}
