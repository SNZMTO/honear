/**
 * La musique, côté serveur : les appels à Deezer, et la lecture des playlists Spotify. Ils partent du serveur, jamais des
 * téléphones ; ils sont étalés pour rester sous la limite de débit de chacun, et leurs réponses gardées un moment, pour ne pas
 * redemander ce qu'on vient de savoir. Une playlist Spotify se lit sur sa page publique, et chacun de ses titres se retrouve chez
 * Deezer : c'est son extrait qui s'entend. Les liens des extraits expirent : les pistes d'une playlist ne se gardent que quelques
 * minutes, jamais jusqu'à l'expiration de leurs liens ; elles se relisent en coulisses avant, et au plus tard avant qu'on lance une
 * piste. Le serveur du jeu ne voit que le résultat, déjà là quand il en a besoin (`pistes`).
 */

import type { PlaylistTrouvee, RaisonDeRefus } from '../regles/messages';
import type { PisteDuMode } from '../regles/modes';
import { memeReponse } from '../regles/piste';
import { PLAYLISTS_EPINGLEES, type CleDeTheme } from '../ressources/bac';
import { RESEAU } from '../ressources/reseau';
import {
  adresseDeLaPiste,
  adresseDeLaPlaylist,
  adresseDeRecherche,
  adresseDeRechercheDeTitre,
  adresseDesPistes,
  erreurDeDeezer,
  expirationDe,
  idDeezer,
  avecSesInvites,
  laBonnePiste,
  lienDeezer,
  lireDesPistes,
  lireLesInvites,
  lireDesPlaylists,
  lireLaPlaylist,
  lireUnePiste,
  PAGES_AU_PLUS,
  type TitreACherche,
} from '../serveur/sources/deezer';
import { lireUnLien } from '../serveur/sources/liens';
import { adresseDeLaPage, idSpotify, lienSpotify, lireLaPage } from '../serveur/sources/spotify';

export interface OptionsDeLaMusique {
  /** Demande une adresse et rend sa réponse lue en JSON ; échoue si le réseau ne répond pas. */
  readonly lire: (adresse: string) => Promise<unknown>;
  /** Demande une page et rend son texte (celle d'une playlist Spotify) ; échoue si le réseau ne répond pas. */
  readonly page: (adresse: string) => Promise<string>;
  /** Suit un lien court jusqu'où il mène, et rend l'adresse d'arrivée. */
  readonly suivre: (adresse: string) => Promise<string>;
  /** L'heure du serveur, en secondes. */
  readonly maintenant: () => number;
  /** L'heure du monde, en secondes depuis 1970 : celle des liens signés. */
  readonly monde: () => number;
  /** Attendre tant de secondes. */
  readonly attendre: (secondes: number) => Promise<void>;
}

export interface Musique {
  /**
   * Les playlists publiques que Deezer trouve pour une recherche ; pour un thème du bac, celles qu'il épingle d'abord. Échoue si
   * Deezer ne répond pas, ou qu'on lui demande trop.
   */
  chercher(recherche: string, theme?: CleDeTheme): Promise<PlaylistTrouvee[]>;
  /**
   * Un lien collé, de Deezer ou de Spotify : la playlist qu'il désigne, lue, avec ce qu'on peut en jouer ; ou pourquoi on ne peut
   * pas (une playlist Spotify qui ne se laisse pas lire, un lien qui ne mène à rien).
   */
  importer(colle: string): Promise<PlaylistTrouvee | Extract<RaisonDeRefus, 'spotify' | 'introuvable'>>;
  /** Lit les pistes d'une playlist si on ne les a pas, ou plus assez fraîches : le serveur du jeu les trouvera dans `pistes`. */
  preparer(lien: string): Promise<void>;
  /**
   * Les pistes jouables d'une playlist, si on les a lues ; bientôt plus fraîches, elles se relisent en coulisses. Celles dont on
   * connaît les invités ont leur feat.
   */
  pistes(lien: string): readonly PisteDuMode[] | undefined;
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

/** Une playlist lue : son titre, combien on en a regardé de titres, et ce qu'on peut en jouer. */
interface PlaylistLue {
  readonly titre: string;
  readonly total: number;
  readonly pistes: readonly PisteDuMode[];
}

/** Une piste que Deezer a pour un titre d'ailleurs : son identifiant (de quoi relire son extrait), et la piste. */
interface Correspondance {
  readonly id: number;
  readonly piste: PisteDuMode;
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
  const S = RESEAU.spotify;
  const deezer: Limite = { fenetre: D.fenetre, parFenetre: D.parFenetre, appels: [] };
  const spotify: Limite = { fenetre: S.fenetre, parFenetre: S.parFenetre, appels: [] };
  /** Combien d'appels attendent leur tour, à Deezer comme à Spotify. */
  let enFile = 0;
  const recherches = new Map<string, Gardee<PlaylistTrouvee[]>>();
  const playlists = new Map<string, Gardee<PlaylistLue>>();
  /** Ce que Deezer a pour chaque titre d'une playlist Spotify : sa piste, ou rien (on ne le recherche pas avant un moment). */
  const correspondances = new Map<string, Gardee<Correspondance | null>>();
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

  /** Lit une page de Spotify, sans le presser. */
  const lirePage = (adresse: string): Promise<string> =>
    enSonTour(async () => {
      await sonTour(spotify);
      return o.page(adresse);
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

  /** La piste que Deezer a pour un titre : celle qu'on connaît (son extrait relu s'il a expiré), sinon celle qu'on trouve en cherchant. */
  async function chezDeezer(t: TitreACherche): Promise<PisteDuMode | undefined> {
    const cle = `${t.artiste}\u0000${t.titre}`.toLowerCase();
    const connue = correspondances.get(cle);
    if (connue !== undefined && frais(connue)) return connue.valeur?.piste;
    let trouvee: Correspondance | undefined;
    const avant = connue?.valeur ?? undefined;
    if (avant !== undefined) {
      const piste = lireUnePiste(await appeler(adresseDeLaPiste(avant.id)));
      if (piste !== undefined) trouvee = { id: avant.id, piste };
    }
    trouvee ??= laBonnePiste(await appeler(adresseDeRechercheDeTitre(t, true)), t);
    trouvee ??= laBonnePiste(await appeler(adresseDeRechercheDeTitre(t, false)), t);
    const jusqua = trouvee !== undefined ? jusquaQuand([trouvee.piste]) : o.maintenant() + S.sansDeezer;
    garder(correspondances, cle, { valeur: trouvee ?? null, jusqua }, o.maintenant(), D.gardeesAuPlus * S.pistesAuPlus);
    return trouvee?.piste;
  }

  /**
   * Une playlist Spotify : sa page publique, puis ses premiers titres retrouvés chez Deezer, par vagues (autant de titres qu'il
   * manque de pistes, tous à la fois : la limite de débit les étale), jusqu'à en avoir assez. Une page qui ne se lit pas ne change
   * rien à ce qu'on avait.
   */
  async function lireSpotify(lien: string, id: string): Promise<void> {
    const page = lireLaPage(await lirePage(adresseDeLaPage(id)));
    if (page === undefined) return;
    const titres = page.titres.slice(0, S.titresAuPlus);
    const pistes: PisteDuMode[] = [];
    let essayes = 0;
    while (pistes.length < S.pistesAuPlus && essayes < titres.length) {
      const vague = titres.slice(essayes, essayes + S.pistesAuPlus - pistes.length);
      essayes += vague.length;
      const trouvees = await Promise.all(vague.map((t) => chezDeezer(t).catch(() => undefined)));
      for (const p of trouvees) if (p !== undefined && !pistes.some((q) => memeReponse(q.reponse, p.reponse))) pistes.push(p);
    }
    garder(playlists, lien, { valeur: { titre: page.titre, total: essayes, pistes }, jusqua: jusquaQuand(pistes) }, o.maintenant(), D.gardeesAuPlus);
  }

  /** Lit une playlist si on ne l'a pas, ou si elle n'est plus fraîche (dans `avance` secondes, pour une lecture en coulisses). */
  function preparer(lien: string, avance = 0): Promise<void> {
    const deDeezer = idDeezer(lien);
    const deSpotify = idSpotify(lien);
    if ((deDeezer === undefined && deSpotify === undefined) || frais(playlists.get(lien), avance)) return Promise.resolve();
    const deja = enCours.get(lien);
    if (deja !== undefined) return deja;
    const lecture = (deDeezer !== undefined ? lireDeezer(lien, deDeezer) : lireSpotify(lien, deSpotify ?? '')).finally(() => enCours.delete(lien));
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
        const decrite = lireLaPlaylist(await appeler(adresseDeLaPlaylist(id)).catch(() => undefined));
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
      if (lu.genre !== 'deezer' && lu.genre !== 'spotify') return 'introuvable';
      const lien = lu.genre === 'deezer' ? lienDeezer(lu.id) : lienSpotify(lu.id);
      // Une page de Spotify qu'on n'a pas pu lire, ou qui ne dit rien : la playlist ne se laisse pas lire.
      const illisible = lu.genre === 'spotify' ? 'spotify' : 'introuvable';
      try {
        await preparer(lien);
      } catch (erreur) {
        if (lu.genre === 'spotify') return illisible;
        throw erreur;
      }
      const lue = playlists.get(lien)?.valeur;
      return lue === undefined ? illisible : { lien, titre: lue.titre, total: lue.total, jouables: lue.pistes.length };
    },
    preparer: (lien) => preparer(lien),
    pistes(lien) {
      const gardee = playlists.get(lien);
      // Bientôt plus fraîche : on la relit en coulisses, et la piste d'après aura des liens neufs sans qu'on l'attende.
      if (gardee !== undefined && !frais(gardee, D.avance)) void preparer(lien, D.avance).catch(() => undefined);
      return gardee?.valeur.pistes.map(avecLeFeat);
    },
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
