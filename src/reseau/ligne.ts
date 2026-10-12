/**
 * La ligne : un WebSocket par téléphone, branché au serveur du jeu par la même connexion que le prototype. Ce qui arrive est lu
 * (`lireUneAction`) avant d'aller plus loin ; ce qui part est écrit en JSON, une nouvelle par message. La ligne vérifie qu'un téléphone
 * est encore là, ne le laisse pas noyer le serveur, et coupe celui qui insiste avec des messages mal formés ou des codes inventés.
 * Quand un téléphone s'en va, le serveur l'apprend : sa pochette se retourne, sa place est gardée.
 * C'est elle aussi qui parle à la musique : elle répond à ce que l'hôte cherche dans le bac, et fait lire les pistes de sa playlist
 * avant que le serveur du jeu en ait besoin (quand la room s'ouvre, avant chaque piste lancée). Les actions d'un téléphone vont au
 * serveur du jeu dans l'ordre où elles sont arrivées ; seule la question de l'heure n'attend jamais.
 */

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { lireUneAction, type Action, type Nouvelle, type PlaylistTrouvee } from '../regles/messages';
import { RESEAU } from '../ressources/reseau';
import type { Serveur } from '../serveur/serveur';
import type { Comptes } from './comptes';
import type { Musique } from './musique';

/** Le chemin où les téléphones se branchent. */
export const CHEMIN_DE_LA_LIGNE = '/ligne';

/** Le code de fermeture d'un WebSocket qui n'a pas respecté les règles : le téléphone ne se rebranche pas tout seul. */
const HORS_DES_REGLES = 1008;
/** Le code de fermeture d'un serveur qui s'arrête (une mise en ligne) : le téléphone se rebranchera. */
const PARTI = 1001;

export interface Ligne {
  /** Un navigateur demande à passer en WebSocket : on vérifie d'où il vient, puis on le branche. */
  accueillir(requete: IncomingMessage, prise: Duplex, debut: Buffer): void;
  /** Combien de téléphones sont branchés. */
  readonly branches: number;
  fermer(): void;
}

export interface OptionsDeLaLigne {
  readonly serveur: Serveur;
  /** L'heure du serveur, en secondes. */
  readonly maintenant: () => number;
  /** Les adresses d'où une page peut se brancher (« https://honear.fr ») ; aucune : on ne vérifie pas (en local). */
  readonly origines: readonly string[];
  /** Appelé après chaque action reçue : le serveur a peut-être un rendez-vous plus proche. */
  readonly aChaqueAction: () => void;
  /** L'adresse d'un navigateur, telle que le relais devant le serveur la donne. */
  readonly adresseDe: (requete: IncomingMessage) => string;
  /** Où chercher des playlists et lire leurs pistes. Sans elle, le bac ne trouve rien, et seule la playlist d'essai se joue. */
  readonly musique?: Musique;
  /** Les comptes des joueurs. Sans eux, on ne peut pas entrer dans un compte : le site le dit. */
  readonly comptes?: Comptes;
}

/** Ce que l'hôte demande dans le bac. */
type Demande = Extract<Action, { readonly genre: 'chercher' | 'importer' }>;

/** Ce qu'un téléphone fait de son compte. */
type DuCompte = Extract<Action, { readonly genre: 'demanderUnLien' | 'ouvrirLeCompte' | 'reprendreLeCompte' | 'sortirDuCompte' | 'effacerLeCompte' }>;
const DU_COMPTE: ReadonlySet<Action['genre']> = new Set([
  'demanderUnLien',
  'ouvrirLeCompte',
  'reprendreLeCompte',
  'sortirDuCompte',
  'effacerLeCompte',
]);
const estDuCompte = (action: Action): action is DuCompte => DU_COMPTE.has(action.genre);

/** Ce qu'un téléphone peut encore envoyer : un seau qui se remplit à son rythme, et qu'un message vide d'une goutte. */
function unSeau(maintenant: () => number): () => boolean {
  let gouttes: number = RESEAU.debit.rafale;
  let depuis = maintenant();
  return () => {
    const t = maintenant();
    gouttes = Math.min(RESEAU.debit.rafale, gouttes + (t - depuis) * RESEAU.debit.parSeconde);
    depuis = t;
    if (gouttes < 1) return false;
    gouttes -= 1;
    return true;
  };
}

export function ouvrirLaLigne(o: OptionsDeLaLigne): Ligne {
  const ws = new WebSocketServer({ noServer: true, maxPayload: RESEAU.messageAuPlus, perMessageDeflate: false });
  const parAdresse = new Map<string, number>();
  const vivants = new Set<WebSocket>();
  const repondu = new WeakSet<WebSocket>();

  function brancher(socket: WebSocket, adresse: string): void {
    vivants.add(socket);
    repondu.add(socket);
    parAdresse.set(adresse, (parAdresse.get(adresse) ?? 0) + 1);
    const peutEnvoyer = unSeau(o.maintenant);
    const fautes = { malFormes: 0, codesInconnus: 0 };
    const ecrire = (nouvelle: Nouvelle): void => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(nouvelle));
    };
    /** La room où joue ce téléphone, d'après l'état complet que le serveur lui a envoyé : la playlist à faire lire est la sienne. */
    let code: string | undefined;
    let coupee = false;
    /** Le compte où joue ce téléphone, et sa session ; sa place dans la room, d'après l'état complet : de quoi compter ses scores. */
    let compte: { readonly id: string; readonly session: string } | undefined;
    let place: { readonly code: string; readonly toi: string } | undefined;
    const attacher = (): void => {
      if (compte !== undefined && place !== undefined) o.comptes?.attacher(place.code, place.toi, compte.id);
    };
    const connexion = o.serveur.connecter((nouvelle: Nouvelle) => {
      if (nouvelle.genre === 'refus' && nouvelle.raison === 'codeInconnu' && ++fautes.codesInconnus > RESEAU.tolerance.codesInconnus) {
        socket.close(HORS_DES_REGLES);
        return;
      }
      if (nouvelle.genre === 'etat') {
        code = nouvelle.code;
        place = { code: nouvelle.code, toi: nouvelle.toi };
        attacher();
      }
      ecrire(nouvelle);
    });
    const transmettre = (action: Action): void => {
      if (coupee) return;
      connexion.envoyer(action);
      o.aChaqueAction();
    };

    /** Les actions pour le serveur du jeu, en file : une room qui s'ouvre, une piste lancée attendent que les pistes soient lues. */
    let file: Promise<void> = Promise.resolve();
    const enFile = (action: Action, avant: Promise<void> | undefined): void => {
      // Si la musique ne répond pas, la room fait avec ce qu'elle a : la playlist d'essai, ou les pistes déjà lues.
      const lue = avant?.catch(() => undefined);
      // Une action que le serveur du jeu n'a pas su prendre ne bloque pas celles d'après : on le dit, et la file continue.
      file = file
        .then(() => lue)
        .then(() => transmettre(action))
        .catch((erreur: unknown) => console.error(`Une action « ${action.genre} » n’est pas passée : ${String(erreur)}`));
    };
    /** La playlist à faire lire avant de passer cette action au serveur du jeu, s'il y en a une. */
    const aLire = (action: Action): string | undefined => {
      if (action.genre === 'creer') return code === undefined ? action.playlist : undefined;
      if (action.genre === 'lancer' || action.genre === 'rejouer') return code !== undefined ? o.serveur.room(code)?.playlist : undefined;
      return undefined;
    };

    /** Ce que l'hôte demande au bac : une demande à la fois ; s'il en fait une autre entre-temps, c'est la dernière qui compte. */
    let demande: Promise<void> | undefined;
    let ensuite: Demande | undefined;
    const demander = (d: Demande): void => {
      if (demande !== undefined) {
        ensuite = d;
        return;
      }
      demande = repondre(d).finally(() => {
        demande = undefined;
        const suivante = ensuite;
        ensuite = undefined;
        if (suivante !== undefined && !coupee) demander(suivante);
      });
    };
    async function repondre(d: Demande): Promise<void> {
      const musique = o.musique;
      if (d.genre === 'chercher') {
        let playlists: PlaylistTrouvee[] = [];
        try {
          if (musique !== undefined) playlists = await musique.chercher(d.recherche, d.theme);
        } catch {
          // Deezer ne répond pas, ou on lui demande trop : rien dans le bac, pour cette fois.
        }
        ecrire({ genre: 'playlists', heure: o.maintenant(), recherche: d.recherche, playlists });
        return;
      }
      let lue: Awaited<ReturnType<Musique['importer']>> = 'introuvable';
      try {
        if (musique !== undefined) lue = await musique.importer(d.lien);
      } catch {
        // Deezer ne répond pas : la playlist est introuvable, pour cette fois.
      }
      // L'hôte a collé un autre lien entre-temps : c'est à celui-là qu'on répondra, le téléphone n'attend plus que lui.
      if (ensuite?.genre === 'importer') return;
      ecrire(
        typeof lue === 'string'
          ? { genre: 'refus', heure: o.maintenant(), raison: lue }
          : { genre: 'importee', heure: o.maintenant(), playlist: lue },
      );
    }

    /** Ce qu'un téléphone fait de son compte : demander un lien, entrer, revenir, sortir, tout effacer. */
    async function compter(action: DuCompte): Promise<void> {
      const comptes = o.comptes;
      const heure = (): number => o.maintenant();
      const horsCompte = (): void => {
        compte = undefined;
        ecrire({ genre: 'horsCompte', heure: heure() });
      };
      switch (action.genre) {
        case 'demanderUnLien': {
          const envoi = comptes !== undefined ? await comptes.demanderUnLien(action.email, adresse) : 'comptesFermes';
          if (envoi === 'envoye') ecrire({ genre: 'lienEnvoye', heure: heure(), email: action.email.trim().toLowerCase() });
          else ecrire({ genre: 'refus', heure: heure(), raison: envoi });
          return;
        }
        case 'ouvrirLeCompte': {
          const ouvert = comptes?.ouvrir(action.lien);
          if (ouvert === undefined) {
            ecrire({ genre: 'refus', heure: heure(), raison: comptes !== undefined ? 'lienPerime' : 'comptesFermes' });
            return;
          }
          compte = { id: ouvert.id, session: ouvert.session };
          attacher();
          ecrire({ genre: 'compte', heure: heure(), compte: ouvert.compte, session: ouvert.session });
          return;
        }
        case 'reprendreLeCompte': {
          const repris = comptes?.reprendre(action.session);
          if (repris === undefined) return horsCompte();
          compte = { id: repris.id, session: action.session };
          attacher();
          ecrire({ genre: 'compte', heure: heure(), compte: repris.compte });
          return;
        }
        case 'sortirDuCompte':
          if (compte !== undefined) comptes?.sortir(compte.session);
          return horsCompte();
        case 'effacerLeCompte':
          if (compte !== undefined) comptes?.effacer(compte.id);
          return horsCompte();
      }
    }

    socket.on('pong', () => repondu.add(socket));
    socket.on('message', (donnees, binaire) => {
      if (!peutEnvoyer()) return;
      let action;
      try {
        action = binaire ? undefined : lireUneAction(JSON.parse(String(donnees)));
      } catch {
        action = undefined;
      }
      if (action === undefined) {
        if (++fautes.malFormes > RESEAU.tolerance.malFormes) socket.close(HORS_DES_REGLES);
        return;
      }
      // L'heure n'attend pas : sa réponse doit partir aussitôt, pour que l'horloge du téléphone se règle juste.
      if (action.genre === 'quelleHeure') return transmettre(action);
      if (estDuCompte(action)) return void compter(action).catch(() => undefined);
      // Qui joue sous un compte y garde la pochette avec laquelle il arrive, et celle qu'il refait.
      if (compte !== undefined && (action.genre === 'creer' || action.genre === 'rejoindre' || action.genre === 'changerDePochette'))
        o.comptes?.garderLaPochette(compte.id, action.pochette);
      // Le bac ne s'ouvre qu'avant la room.
      if (action.genre === 'chercher' || action.genre === 'importer') return code === undefined ? demander(action) : undefined;
      const lien = aLire(action);
      enFile(action, lien !== undefined ? o.musique?.preparer(lien) : undefined);
    });
    socket.on('close', () => {
      coupee = true;
      vivants.delete(socket);
      const restants = (parAdresse.get(adresse) ?? 1) - 1;
      if (restants > 0) parAdresse.set(adresse, restants);
      else parAdresse.delete(adresse);
      connexion.couper();
      o.aChaqueAction();
    });
    socket.on('error', () => socket.terminate());
  }

  // À chaque battement, chaque téléphone doit avoir répondu au précédent ; sinon sa ligne est tombée sans le dire.
  const battre = (): void => {
    for (const socket of vivants) {
      if (!repondu.has(socket)) {
        socket.terminate();
        continue;
      }
      repondu.delete(socket);
      socket.ping();
    }
  };
  const battement = RESEAU.battement * 1000;
  const adieu = RESEAU.adieu * 1000;
  const minuterie = setInterval(battre, battement);

  return {
    get branches() {
      return vivants.size;
    },
    accueillir(requete, prise, debut) {
      const origine = requete.headers.origin ?? '';
      const adresse = o.adresseDe(requete);
      const refuser = (statut: string): void => {
        prise.end(`HTTP/1.1 ${statut}\r\nConnection: close\r\n\r\n`);
      };
      if ((requete.url ?? '').split('?')[0] !== CHEMIN_DE_LA_LIGNE) return refuser('404 Not Found');
      if (o.origines.length > 0 && !o.origines.includes(origine)) return refuser('403 Forbidden');
      if ((parAdresse.get(adresse) ?? 0) >= RESEAU.parAdresse) return refuser('429 Too Many Requests');
      ws.handleUpgrade(requete, prise, debut, (socket) => brancher(socket, adresse));
    },
    fermer() {
      clearInterval(minuterie);
      // On s'en va : chaque téléphone l'apprend, et se rebranchera quand le serveur sera revenu. Qui ne répond pas est coupé net.
      for (const socket of vivants) {
        socket.close(PARTI);
        const terminer = (): void => socket.terminate();
        setTimeout(terminer, adieu).unref();
      }
      ws.close();
    },
  };
}
