/**
 * La musique, côté serveur : les appels à Deezer. Ils partent du serveur, jamais des téléphones ; ils sont étalés pour rester sous
 * sa limite de débit, et leurs réponses gardées un moment, pour ne pas redemander ce qu'on vient de savoir. Les liens des extraits
 * expirent : les pistes d'une playlist ne se gardent que quelques minutes, jamais jusqu'à l'expiration de leurs liens ; elles se
 * relisent en coulisses avant, et au plus tard avant qu'on lance une piste. Une liste sur mesure se lit chez le MCP de Honear, et
 * chacune de ses pistes se relit chez Deezer par son identifiant. Un lien Spotify ne se lit pas : il est refusé, sans qu'on
 * demande rien à Spotify. Le serveur du jeu ne voit que le résultat, déjà là quand il en a besoin (`pistes`).
 */

import type { PlaylistTrouvee, RaisonDeRefus } from '../regles/messages';
import type { PisteDuMode } from '../regles/modes';
import { PLAYLISTS_EPINGLEES, type CleDeTheme } from '../ressources/bac';
import { RESEAU } from '../ressources/reseau';
import {
  adresseDeLaPiste,
  adresseDeLaPlaylist,
  adresseDeRecherche,
  adresseDesPistes,
  erreurDeDeezer,
  expirationDe,
  idDeezer,
  avecSesInvites,
  lienDeezer,
  lireDesPistes,
  lireLesInvites,
  lireDesPlaylists,
  lireLaPlaylist,
  lireUnePiste,
  PAGES_AU_PLUS,
} from '../serveur/sources/deezer';
import { lireUnLien } from '../serveur/sources/liens';
import { adresseDeLaListe, idListe, lienListe, lireLaListe } from '../serveur/sources/liste';
import { motifDe } from './journal';

export interface OptionsDeLaMusique {
  /** Demande une adresse et rend sa réponse lue en JSON ; échoue si le réseau ne répond pas. */
  readonly lire: (adresse: string) => Promise<unknown>;
  /** Suit un lien court jusqu'où il mène, et rend l'adresse d'arrivée. */
  readonly suivre: (adresse: string) => Promise<string>;
  /** L'heure du serveur, en secondes. */
  readonly maintenant: () => number;
  /** L'heure du monde, en secondes depuis 1970 : celle des liens signés. */
  readonly monde: () => number;
  /** Attendre tant de secondes. */
  readonly attendre: (secondes: number) => Promise<void>;
  /** L'adresse du MCP qui sert les listes sur mesure, sur le réseau du jeu (« http://honear-mcp:8791 ») ; rien : pas de listes. */
  readonly listes?: string;
}

export interface Musique {
  /**
   * Les playlists publiques que Deezer trouve pour une recherche ; pour un thème du bac, celles qu'il épingle d'abord. Échoue si
   * Deezer ne répond pas, ou qu'on lui demande trop.
   */
  chercher(recherche: string, theme?: CleDeTheme): Promise<PlaylistTrouvee[]>;
  /**
   * Un lien collé, de Deezer ou d'une liste sur mesure : la playlist qu'il désigne, lue, avec ce qu'on peut en jouer ; ou pourquoi
   * on ne peut pas (un lien Spotify, que le jeu ne lit pas ; un lien qui ne mène à rien).
   */
  importer(colle: string): Promise<PlaylistTrouvee | Extract<RaisonDeRefus, 'spotify' | 'introuvable'>>;
  /** Lit les pistes d'une playlist si on ne les a pas, ou plus assez fraîches : le serveur du jeu les trouvera dans `pistes`. */
  preparer(lien: string): Promise<void>;
  /**
   * Les pistes jouables d'une playlist, si on les a lues ; bientôt plus fraîches, elles se relisent en coulisses. Celles dont on
   * connaît les invités ont leur feat.
   */
  pistes(lien: string): readonly PisteDuMode[] | undefined;
  /** Vrai si une playlist lue se joue dans son ordre à elle : une liste sur mesure dont la difficulté monte. */
  gardeSonOrdre(lien: string): boolean;
  /**
   * Les pistes qu'une room va jouer, dans l'ordre : on lit en coulisses les invités des prochaines (la liste d'une playlist ne les
   * donne pas), pour qu'elles aient leur feat quand on les lancera.
   */
  preciser(pistes: readonly PisteDuMode[]): void;
}

/** Une réponse gardée, et jusqu'à quand. */
interface Gardee<T> {
  readonly valeur: T;
  readonly jusqua: number;
}

/** Une playlist lue : son titre, combien on en a regardé de titres, ce qu'on peut en jouer, et s'il faut garder son ordre. */
interface PlaylistLue {
  readonly titre: string;
  readonly total: number;
  readonly pistes: readonly PisteDuMode[];
  readonly dansLOrdre?: boolean;
  /** Une liste sur mesure faite pour un tournoi : la taille de son tableau. */
  readonly tournoi?: number;
}

/** Une limite de débit : jamais plus de tant d'appels dans une fenêtre de tant de secondes ; les instants des derniers. */
interface Limite {
  readonly fenetre: number;
  readonly parFenetre: number;
  readonly appels: number[];
}

/** Ce qu'on garde, une fois plein : on oublie d'abord ce qui n'est plus frais, puis le plus ancien. */
function garder<T>(dans: Map<string, Gardee<T>>, cle: string, gardee: Gardee<T>, heure: number, auPlus: number): void {
  dans.delete(cle);
  dans.set(cle, gardee);
  if (dans.size <= auPlus) return;
  for (const [c, g] of dans) if (g.jusqua <= heure) dans.delete(c);
  for (const c of dans.keys()) {
    if (dans.size <= auPlus) break;
    dans.delete(c);
  }
}

export function brancherLaMusique(o: OptionsDeLaMusique): Musique {
  const D = RESEAU.deezer;
  const deezer: Limite = { fenetre: D.fenetre, parFenetre: D.parFenetre, appels: [] };
  /** Combien d'appels à Deezer attendent leur tour. */
  let enFile = 0;
  const recherches = new Map<string, Gardee<PlaylistTrouvee[]>>();
  const playlists = new Map<string, Gardee<PlaylistLue>>();
  /** Les lectures en cours : deux téléphones qui demandent la même playlist ne la font lire qu'une fois. */
  const enCours = new Map<string, Promise<void>>();
  /** Les invités de chaque piste de Deezer, par son identifiant ; et celles dont on les lit en ce moment. */
  const invites = new Map<string, Gardee<readonly string[]>>();
  const invitesEnCours = new Set<number>();

  /** Attend que la limite laisse passer un appel, et le compte. */
  async function sonTour(limite: Limite): Promise<void> {
    for (;;) {
      const t = o.maintenant();
      while (limite.appels.length > 0 && (limite.appels[0] ?? t) <= t - limite.fenetre) limite.appels.shift();
      if (limite.appels.length < limite.parFenetre) break;
      await o.attendre((limite.appels[0] ?? t) + limite.fenetre - t);
    }
    limite.appels.push(o.maintenant());
  }

  /** Un appel qui prend sa place dans la file ; au-delà de tant qui attendent, on n'en prend plus. */
  async function enSonTour<T>(appel: () => Promise<T>): Promise<T> {
    if (enFile >= D.fileAuPlus) throw new Error('Trop d’appels en attente');
    enFile++;
    try {
      return await appel();
    } finally {
      enFile--;
    }
  }

  /**
   * Appelle Deezer quand la fenêtre le permet ; si Deezer dit qu'on va trop vite, on attend et on réessaie, quelques fois.
   * Rend sa réponse, ou ce qu'il dit quand il n'y a rien à cette adresse ; échoue sur tout autre refus : ce qu'on avait lu reste bon.
   */
  const appeler = (adresse: string): Promise<unknown> =>
    enSonTour(async () => {
      for (let essai = 0; ; essai++) {
        await sonTour(deezer);
        const reponse = await o.lire(adresse);
        const erreur = erreurDeDeezer(reponse);
        if (erreur === undefined || erreur === 'introuvable') return reponse;
        if (erreur !== 'quota' || essai >= D.essais) throw new Error(`Deezer refuse : ${erreur}`);
        await o.attendre(D.fenetre);
      }
    });

  /** Vrai si ce qu'on a gardé l'est encore dans `avance` secondes. */
  const frais = (g: Gardee<unknown> | undefined, avance = 0): boolean => g !== undefined && g.jusqua - avance > o.maintenant();

  /** Jusqu'à quand des pistes restent bonnes à jouer : quelques minutes, et jamais jusqu'à l'expiration du premier de leurs liens. */
  function jusquaQuand(pistes: readonly PisteDuMode[]): number {
    const t = o.maintenant();
    const expirations = pistes.flatMap((p) => {
      const exp = p.extrait !== undefined ? expirationDe(p.extrait) : undefined;
      return exp !== undefined ? [exp] : [];
    });
    const avantLExpiration = expirations.length > 0 ? Math.min(...expirations) - o.monde() - D.marge : Infinity;
    return t + Math.max(0, Math.min(D.fraicheur, avantLExpiration));
  }

  async function lireDeezer(lien: string, id: string): Promise<void> {
    const decrite = lireLaPlaylist(await appeler(adresseDeLaPlaylist(id)));
    if (decrite === undefined) {
      playlists.delete(lien);
      return;
    }
    const pistes: PisteDuMode[] = [];
    let vues = 0;
    for (let page = 0; page < PAGES_AU_PLUS; page++) {
      const lue = lireDesPistes(await appeler(adresseDesPistes(id, page)));
      pistes.push(...lue.pistes);
      vues += lue.lues;
      if (lue.lues === 0 || vues >= (lue.total ?? decrite.total)) break;
    }
    garder(playlists, lien, { valeur: { ...decrite, pistes }, jusqua: jusquaQuand(pistes) }, o.maintenant(), D.gardeesAuPlus);
  }

  /**
   * Une liste sur mesure : ce que le MCP en dit (son nom, ses pistes par leur identifiant Deezer, leurs surnoms et anecdotes), puis chaque piste
   * relue chez Deezer, toutes à la fois (la limite de débit les étale), pour des extraits frais. Une piste que Deezer ne donne plus
   * est passée ; une liste que le MCP ne connaît pas, ou plus, n'a rien à jouer. La lire, pour le MCP, c'est la jouer : elle vit
   * de nouveau un mois.
   */
  async function lireListe(lien: string, id: string): Promise<void> {
    const mcp = o.listes;
    const decrite =
      mcp !== undefined
        ? lireLaListe(
            await o
              .lire(adresseDeLaListe(mcp, id))
              .catch((erreur: unknown) => void console.error(`Une liste sur mesure ne s’est pas lue chez le MCP : ${motifDe(erreur)}`)),
          )
        : undefined;
    if (decrite === undefined) {
      playlists.delete(lien);
      return;
    }
    // Les pistes que Deezer ne donne pas : le journal le dit une fois pour la liste, avec ce qu'il a dit de la première.
    const ratees: unknown[] = [];
    const lues = await Promise.all(
      decrite.pistes.map(async ({ deezer, surnoms, anecdote }) => {
        const piste = lireUnePiste(await appeler(adresseDeLaPiste(deezer)).catch((erreur: unknown) => void ratees.push(erreur)));
        return piste !== undefined ? [{ ...piste, surnoms, ...(anecdote !== undefined ? { anecdote } : {}) }] : [];
      }),
    );
    if (ratees.length > 0)
      console.error(
        `Une liste sur mesure : ${ratees.length} piste(s) sur ${decrite.pistes.length} ne se sont pas lues chez Deezer : ${motifDe(ratees[0])}`,
      );
    const pistes = lues.flat();
    const lue: PlaylistLue = {
      titre: decrite.titre,
      total: decrite.pistes.length,
      pistes,
      dansLOrdre: decrite.dansLOrdre,
      ...(decrite.tournoi !== undefined ? { tournoi: decrite.tournoi } : {}),
    };
    garder(playlists, lien, { valeur: lue, jusqua: jusquaQuand(pistes) }, o.maintenant(), D.gardeesAuPlus);
  }

  /** Lit une playlist si on ne l'a pas, ou si elle n'est plus fraîche (dans `avance` secondes, pour une lecture en coulisses). */
  function preparer(lien: string, avance = 0): Promise<void> {
    const deDeezer = idDeezer(lien);
    const deListe = idListe(lien);
    if ((deDeezer === undefined && deListe === undefined) || frais(playlists.get(lien), avance)) return Promise.resolve();
    const deja = enCours.get(lien);
    if (deja !== undefined) return deja;
    const lecture = (deDeezer !== undefined ? lireDeezer(lien, deDeezer) : lireListe(lien, deListe ?? '')).finally(() => enCours.delete(lien));
    enCours.set(lien, lecture);
    return lecture;
  }

  /** La piste avec son feat, si l'on connaît ses invités. */
  const avecLeFeat = (p: PisteDuMode): PisteDuMode => {
    const connus = p.deezer !== undefined ? invites.get(String(p.deezer))?.valeur : undefined;
    return connus !== undefined && connus.length > 0 ? avecSesInvites(p, connus) : p;
  };

  return {
    async chercher(recherche, theme) {
      const cle = `${theme ?? ''}:${recherche.trim().toLowerCase()}`;
      const gardee = recherches.get(cle);
      if (gardee !== undefined && frais(gardee)) return gardee.valeur;
      // Les épinglées d'abord ; une qui ne se lit plus chez Deezer est passée.
      const epinglees: PlaylistTrouvee[] = [];
      for (const id of theme !== undefined ? (PLAYLISTS_EPINGLEES[theme] ?? []) : []) {
        const decrite = lireLaPlaylist(
          await appeler(adresseDeLaPlaylist(id)).catch(
            (erreur: unknown) => void console.error(`Une playlist épinglée du bac ne s’est pas lue chez Deezer : ${motifDe(erreur)}`),
          ),
        );
        if (decrite !== undefined) epinglees.push({ lien: lienDeezer(id), ...decrite });
      }
      const cherchees = lireDesPlaylists(await appeler(adresseDeRecherche(recherche.trim().toLowerCase(), D.resultats * 2)));
      const trouvees = [...epinglees, ...cherchees.filter((p) => !epinglees.some((e) => e.lien === p.lien))].slice(0, D.resultats);
      garder(recherches, cle, { valeur: trouvees, jusqua: o.maintenant() + D.rechercheGardee }, o.maintenant(), D.gardeesAuPlus);
      return trouvees;
    },
    async importer(colle) {
      let lu = lireUnLien(colle);
      if (lu.genre === 'court') {
        try {
          lu = lireUnLien(await o.suivre(lu.adresse));
        } catch {
          return 'introuvable';
        }
      }
      if (lu.genre === 'spotify') return 'spotify';
      if (lu.genre !== 'deezer' && lu.genre !== 'liste') return 'introuvable';
      const lien = lu.genre === 'deezer' ? lienDeezer(lu.id) : lienListe(lu.id);
      await preparer(lien);
      const lue = playlists.get(lien)?.valeur;
      if (lue === undefined) return 'introuvable';
      return {
        lien,
        titre: lue.titre,
        total: lue.total,
        jouables: lue.pistes.length,
        ...(lue.tournoi !== undefined ? { tournoi: lue.tournoi } : {}),
      };
    },
    preparer: (lien) => preparer(lien),
    pistes(lien) {
      const gardee = playlists.get(lien);
      // Bientôt plus fraîche : on la relit en coulisses, et la piste d'après aura des liens neufs sans qu'on l'attende.
      if (gardee !== undefined && !frais(gardee, D.avance))
        void preparer(lien, D.avance).catch((erreur: unknown) => console.error(`Une playlist ne s’est pas relue en coulisses : ${motifDe(erreur)}`));
      return gardee?.valeur.pistes.map(avecLeFeat);
    },
    gardeSonOrdre: (lien) => playlists.get(lien)?.valeur.dansLOrdre === true,
    preciser(pistes) {
      // Les premières qu'on ne connaît pas encore (la room joue dans l'ordre, celles d'avant sont déjà lues), sauf celles qu'on lit déjà.
      const aLire = pistes
        .flatMap((p) => (p.deezer !== undefined && !frais(invites.get(String(p.deezer))) ? [p] : []))
        .slice(0, D.aVenir)
        .filter((p) => !invitesEnCours.has(p.deezer ?? 0));
      for (const p of aLire) {
        const id = p.deezer ?? 0;
        invitesEnCours.add(id);
        const noter = (lus: readonly string[], pendant: number): void =>
          garder(invites, String(id), { valeur: lus, jusqua: o.maintenant() + pendant }, o.maintenant(), D.invitesAuPlus);
        // Une fiche qui ne se lit pas : la piste se joue sans feat, et l'on réessaiera plus tard.
        void appeler(adresseDeLaPiste(id))
          .then(
            (fiche) => noter(lireLesInvites(fiche, p.reponse.artiste), D.invitesGardes),
            () => noter([], D.invitesRates),
          )
          .finally(() => invitesEnCours.delete(id));
      }
    },
  };
}
