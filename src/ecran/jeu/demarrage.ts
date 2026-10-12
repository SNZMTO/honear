/**
 * Le jeu, en ligne, dans la page : le téléphone, branché au serveur par WebSocket, avec ce que le navigateur a gardé de la visite
 * d'avant : la room où il jouait, s'il a été rechargé (dans cet onglet) ; la pochette qu'il a faite (sur cet appareil). Arrivé par
 * l'adresse d'une room (le QR code, le lien copié), il va droit à sa pochette ; une fois dans une room, l'adresse de la page devient
 * la sienne, de quoi la recharger ou la partager.
 */

import type { PlaylistTrouvee } from '../../regles/messages';
import { MODES_PAR_CRAN, type CleDeMode } from '../../regles/modes';
import { estUnePochette } from '../../regles/pochette';
import { PLAYLIST_D_ESSAI } from '../../ressources/bac';
import { GRAND_ECRAN } from '../../ressources/ecran';
import { META_DE_LA_VERSION, PARTIE, REGLAGES } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import { CARACTERES } from '../../ressources/typo';
import { VERSO_DU_JEU } from '../../scene/disque/verso';
import { remplir } from '../../scene/phrases';
import { PROPORTION_DU_TELEPHONE } from '../../scene/telephone/grand';
import { encrier as creerLEncrier } from '../../scene/rendu/texte';
import { SCENE_ENTIERE } from '../allegements';
import { horlogeDuNavigateur } from '../horloge';
import { animationsReduites, ceQuiManqueAuNavigateur, densiteDeLEcran } from '../navigateur';
import { policesEmbarquees } from '../polices';
import { ouvrirLeTelephone, type AGarder } from '../telephone/client';
import { memoireDeDepart, type Preparatifs, type Reprise } from '../telephone/memoire';
import { brancherEnLigne } from '../telephone/websocket';
import { creerLeVibreur } from '../vibreur';

/** Les noms sous lesquels le navigateur garde la room de cet onglet, la pochette de cet appareil, et la session de son compte. */
const GARDE = {
  room: 'honear.room',
  pochette: 'honear.pochette',
  session: 'honear.session',
  tuto: 'honear.tuto',
  rechargee: 'honear.rechargee',
  playlists: 'honear.playlists',
  diagnostic: 'honear.diagnostic',
} as const;

/** Un secret de compte, tel que le serveur les donne (voir `regles/messages.ts`). */
const SECRET = /^[A-Za-z0-9_-]{20,64}$/;

/** Le secret d'un lien de connexion, dans l'ancre de l'adresse (« …/#connexion=… ») ; on l'efface de l'adresse aussitôt lu. */
function lienDeConnexion(): string | undefined {
  const lien = /^#connexion=([A-Za-z0-9_-]{20,64})$/.exec(window.location.hash)?.[1];
  if (window.location.hash !== '') window.history.replaceState(null, '', window.location.pathname);
  return lien;
}

/** Lire ce que le navigateur a gardé : rien, s'il n'a rien gardé, s'il refuse qu'on y lise, ou si ce n'est plus lisible. */
function lire(ou: () => Storage, cle: string): unknown {
  try {
    const ecrit = ou().getItem(cle);
    return ecrit === null ? undefined : (JSON.parse(ecrit) as unknown);
  } catch {
    return undefined;
  }
}

function ecrire(ou: () => Storage, cle: string, valeur: unknown): void {
  try {
    if (valeur === undefined) ou().removeItem(cle);
    else ou().setItem(cle, JSON.stringify(valeur));
  } catch {
    // Un navigateur qui ne garde rien (une fenêtre privée) : on jouera sans, et l'on ne reviendra pas d'un rechargement.
  }
}

const enSession = (): Storage => window.sessionStorage;
const surLAppareil = (): Storage => window.localStorage;

/** Le code d'une room dans l'adresse de la page (« /AENV »), s'il y en a un. */
function codeDeLAdresse(): string | undefined {
  const code = window.location.pathname.slice(1).toUpperCase();
  return code.length === PARTIE.code.longueur && [...code].every((l) => PARTIE.code.lettres.includes(l)) ? code : undefined;
}

/**
 * La fenêtre : le jeu la remplit toujours, bord à bord, quelle que soit sa taille, jusque sous l'encoche et sous la barre de Safari.
 * Le cadre prend l'écran entier ; ce que ses bords cachent (l'encoche, la Dynamic Island, la barre de Safari, le trait de l'iPhone),
 * le jeu y dessine sans rien y poser à toucher. Le regard a la proportion de ce qui reste (voir `regardPourLaFenetre`). Sur une
 * fenêtre bien plus large que haute (un ordinateur), les liens des pages légales restent en vue.
 * @returns la proportion de ce qu'on voit sans rien de caché, et ce que cachent les bords, en part de la largeur : à lire à chaque image.
 */
const CENTIEMES = 100;
function suivreLaFenetre(cadre: HTMLElement): {
  readonly proportion: () => number;
  readonly bords: () => { readonly sur: number; readonly sous: number };
} {
  let proportion = PROPORTION_DU_TELEPHONE;
  let bords = { sur: 0, sous: 0 };
  const sonde = document.querySelector<HTMLElement>('.bords');
  const mesurer = (): void => {
    const { innerWidth: l, innerHeight: h } = window;
    const { clientWidth: lc, clientHeight: hc } = cadre;
    // Ce que cachent les bords : les marges de sûreté de l'écran ; en bas, aussi ce que le cadre a de plus que la fenêtre (la barre
    // de Safari, qui flotte par-dessus).
    const style = sonde !== null ? window.getComputedStyle(sonde) : undefined;
    const sur = Number.parseFloat(style?.paddingTop ?? '') || 0;
    const sous = Math.max(Number.parseFloat(style?.paddingBottom ?? '') || 0, hc - Math.min(hc, h));
    const libre = hc - sous;
    bords = lc > 0 ? { sur: Math.round(sur) / lc, sous: Math.round(sous) / lc } : { sur: 0, sous: 0 };
    // Arrondie au centième : une fenêtre qu'on étire ne remonte pas la scène à chaque pixel.
    proportion = libre > 0 ? Math.round((lc / libre) * CENTIEMES) / CENTIEMES : PROPORTION_DU_TELEPHONE;
    document.body.classList.toggle('grand', l >= h * GRAND_ECRAN.plusLargeQueHaut && h >= GRAND_ECRAN.hauteurAuMoins);
  };
  mesurer();
  window.addEventListener('resize', mesurer);
  window.visualViewport?.addEventListener('resize', mesurer);
  return { proportion: () => proportion, bords: () => bords };
}

/**
 * Sur un écran tactile (un téléphone, une tablette), la première touche qu'on enfonce met le jeu en plein écran, là où le navigateur
 * le permet (Android) ; l'iPhone ne le permet qu'au jeu posé sur l'écran d'accueil, qui s'ouvre alors en plein écran de lui-même.
 * Jamais quand on touche une étiquette où l'on tape : la page qui change de taille fermait le clavier, et le champ ne tapait plus.
 */
function pleinEcranAuPremierToucher(): void {
  const page = document.documentElement;
  if (!window.matchMedia('(pointer: coarse)').matches || typeof page.requestFullscreen !== 'function') return;
  const aLaMain = (ev: PointerEvent): void => {
    const cible = ev.target instanceof Element ? ev.target : null;
    if (cible?.closest('button') === null || cible?.closest('input') !== null) return;
    window.removeEventListener('pointerup', aLaMain);
    if (document.fullscreenElement === null) void page.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
  };
  window.addEventListener('pointerup', aLaMain);
}

/**
 * Le petit tutoriel, en diapositives : il s'ouvre à la première visite sur cet appareil, et quand on touche « Comment on joue ? »
 * en bas de l'accueil. « Passer », la dernière diapositive ou Échap le ferment ; l'appareil se souvient qu'on l'a vu.
 */
function brancherLeTuto(textes: Textes): void {
  const T = textes.tuto;
  const tuto = document.querySelector<HTMLElement>('.tuto');
  const titre = tuto?.querySelector('h2');
  const texte = tuto?.querySelector('p');
  const points = tuto?.querySelector('.points');
  const [passer, precedent, suivant] = ['.passer', '.precedent', '.suivant'].map((s) => tuto?.querySelector<HTMLButtonElement>(s));
  if (!tuto || !titre || !texte || !points || !passer || !precedent || !suivant) return;
  passer.textContent = T.passer;
  precedent.textContent = T.precedent;
  let rang = 0;
  const montrer = (): void => {
    const diapo = T.diapos[rang];
    if (diapo === undefined) return;
    titre.textContent = diapo.titre;
    texte.textContent = diapo.texte;
    // Un point par diapositive, celui où l'on est en miel.
    while (points.firstChild !== null) points.firstChild.remove();
    for (const [r] of T.diapos.entries()) {
      const point = document.createElement('span');
      if (r === rang) point.className = 'ici';
      points.append(point);
    }
    precedent.hidden = rang === 0;
    suivant.textContent = rang === T.diapos.length - 1 ? T.commencer : T.suivant;
  };
  const ouvrir = (): void => {
    rang = 0;
    montrer();
    tuto.hidden = false;
    suivant.focus();
  };
  const fermer = (): void => {
    tuto.hidden = true;
    ecrire(surLAppareil, GARDE.tuto, true);
  };
  suivant.addEventListener('click', () => {
    if (rang >= T.diapos.length - 1) fermer();
    else {
      rang++;
      montrer();
    }
  });
  precedent.addEventListener('click', () => {
    rang = Math.max(0, rang - 1);
    montrer();
  });
  passer.addEventListener('click', fermer);
  tuto.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') fermer();
  });
  document.querySelector('[data-tuto]')?.addEventListener('click', ouvrir);
  if (lire(surLAppareil, GARDE.tuto) !== true) ouvrir();
}

/** Un nombre que personne d'autre n'a tiré : la graine des pochettes de ce téléphone. */
function graineDeLAppareil(): number {
  const tirage = new Uint32Array(1);
  window.crypto.getRandomValues(tirage);
  return tirage[0] ?? 0;
}

export function lancerLeJeu(polices: Readonly<Record<string, string>>, textes: Textes): void {
  const cadre = document.querySelector('[data-telephone]');
  if (!(cadre instanceof HTMLElement)) return;
  const manques = ceQuiManqueAuNavigateur();
  if (manques.length > 0) {
    const N = textes.navigateur;
    cadre.textContent = `${N.titre} ${N.conseil} ${remplir(N.detail, { manques: manques.map((m) => N.manques[m]).join(N.entreDeuxManques) })}`;
    return;
  }
  // Des titres, des noms d'artistes, ce qu'on tape : un signe que les polices n'ont pas se remplace, il n'arrête pas le jeu.
  const encrier = creerLEncrier(CARACTERES, policesEmbarquees(polices), textes.langue, true);
  const premierMode: CleDeMode = (MODES_PAR_CRAN[0]?.cle as CleDeMode | undefined) ?? 'libre';
  const preparatifs: Preparatifs = {
    mode: premierMode,
    pistes: REGLAGES.pistes.defaut,
    extrait: REGLAGES.extrait.defaut,
    son: 'tous',
    commandes: true,
    // Sans thème touché ni playlist trouvée, « Celle-là » prend la playlist d'essai du serveur.
    playlist: PLAYLIST_D_ESSAI,
    chercher: true,
    source: textes.playlists.source,
    listes: textes.pochette,
    graine: graineDeLAppareil(),
    comptes: true,
  };

  // Ce que le navigateur a gardé : la pochette de cet appareil ; la room de cet onglet, si l'adresse est toujours la sienne.
  const pochette = lire(surLAppareil, GARDE.pochette);
  const gardee = lire(enSession, GARDE.room) as Partial<Reprise> | undefined;
  const code = codeDeLAdresse();
  const mienne = estUnePochette(pochette) ? pochette : undefined;
  const reprise: Reprise | undefined =
    gardee !== undefined &&
    typeof gardee.code === 'string' &&
    typeof gardee.jeton === 'string' &&
    mienne !== undefined &&
    (code === undefined || code === gardee.code)
      ? { code: gardee.code, jeton: gardee.jeton, pochette: mienne, ampli: gardee.ampli === true }
      : undefined;
  const session = lire(surLAppareil, GARDE.session);
  // « Mes playlists » : ce qu'on a importé sur cet appareil, tel qu'on l'a gardé (ce qui n'en a plus la forme est oublié).
  const gardees = lire(surLAppareil, GARDE.playlists);
  const mesPlaylists = (Array.isArray(gardees) ? (gardees as unknown[]) : []).filter(
    (p): p is PlaylistTrouvee =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as PlaylistTrouvee).lien === 'string' &&
      /^(deezer|spotify):[\w-]+$/.test((p as PlaylistTrouvee).lien) &&
      typeof (p as PlaylistTrouvee).titre === 'string' &&
      typeof (p as PlaylistTrouvee).total === 'number',
  );
  const lien = lienDeConnexion();
  // Un lien de connexion touché alors que la page est déjà ouverte : seule l'ancre change ; la page repart, et le lit.
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#connexion=')) window.location.reload();
  });
  const depart = memoireDeDepart(preparatifs, {
    ...(code !== undefined ? { code } : {}),
    ...(reprise !== undefined ? { reprise } : {}),
    ...(mienne !== undefined ? { pochette: mienne } : {}),
    ...(typeof session === 'string' && SECRET.test(session) ? { session } : {}),
    ...(lien !== undefined ? { lien } : {}),
    mesPlaylists,
  });

  // Une room qu'on a quittée s'oublie, et l'adresse redevient celle du site.
  let dansUneRoom = false;
  const retenir = (aGarder: AGarder): void => {
    if (aGarder.pochette !== undefined) ecrire(surLAppareil, GARDE.pochette, aGarder.pochette);
    ecrire(surLAppareil, GARDE.session, aGarder.session);
    ecrire(surLAppareil, GARDE.playlists, aGarder.mesPlaylists.length > 0 ? aGarder.mesPlaylists : undefined);
    if (aGarder.room === undefined) {
      if (!dansUneRoom) return;
      dansUneRoom = false;
      ecrire(enSession, GARDE.room, undefined);
      window.history.replaceState(null, '', '/');
      return;
    }
    dansUneRoom = true;
    ecrire(enSession, GARDE.room, aGarder.room);
    // L'adresse de la page devient celle de la room : on la recharge, on la partage, on y revient.
    const ici = `/${aGarder.room.code}`;
    if (window.location.pathname !== ici) window.history.replaceState(null, '', ici);
  };

  // Le diagnostic, demandé par l'adresse (« ?diagnostic ») : il reste pour cet onglet, même quand l'adresse devient celle de la room.
  if (new URLSearchParams(window.location.search).has('diagnostic')) ecrire(enSession, GARDE.diagnostic, true);
  const diagnostic = lire(enSession, GARDE.diagnostic) === true;

  const vibreur = creerLeVibreur(window.navigator);
  // La page donne sa version en se branchant : si le site a changé depuis qu'elle est ouverte, le serveur lui demande de se recharger.
  // Une fois par version : une page que le navigateur rendrait encore ancienne ne se recharge pas en boucle.
  const version = document.querySelector<HTMLMetaElement>(`meta[name="${META_DE_LA_VERSION}"]`)?.content;
  const dejaRechargee = version !== undefined && lire(enSession, GARDE.rechargee) === version;
  const parametre = version !== undefined && !dejaRechargee ? `?v=${encodeURIComponent(version)}` : '';
  const ligne = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ligne${parametre}`;
  const recharger = (): void => {
    ecrire(enSession, GARDE.rechargee, version);
    window.location.reload();
  };
  const fenetre = suivreLaFenetre(cadre);
  ouvrirLeTelephone(cadre, {
    brancher: brancherEnLigne(ligne, recharger),
    horloge: horlogeDuNavigateur(),
    ecritoire: { textes, encrier, site: window.location.host },
    preparatifs,
    densiteDeLEcran,
    options: { allegements: SCENE_ENTIERE, verso: VERSO_DU_JEU, sobre: animationsReduites() },
    depart,
    retenir,
    vibrer: (cle) => vibreur.vibrer(cle),
    confirmer: (question) => window.confirm(question),
    son: true,
    fenetre: fenetre.proportion,
    bords: fenetre.bords,
    diagnostic,
    // Les liens des pages légales, en bas : à l'accueil et au compte, là où rien d'autre ne se touche en bas de l'écran.
    enChangeant: (genre) => document.body.classList.toggle('pied', genre === 'accueil' || genre === 'compte'),
  });
  brancherLeTuto(textes);
  pleinEcranAuPremierToucher();
}
