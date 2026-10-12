/**
 * Le site en ligne : le point d'entrée du serveur, sur le VPS. Il lit sa configuration dans l'environnement, sert la page du jeu,
 * branche les téléphones par WebSocket au serveur du jeu, et fait avancer celui-ci à ses rendez-vous (l'extrait qui part,
 * la révélation). Il écoute en local : c'est le relais devant lui (Caddy) qui parle HTTPS au monde. Il va chercher la musique chez
 * Deezer, et les titres d'une playlist sur sa page Spotify (DEEZER et SPOTIFY : d'autres adresses, celles de faux, pour essayer le site).
 * Il garde les comptes dans un fichier (COMPTES, sinon à côté de lui), et envoie leurs liens de connexion par
 * le serveur d'envoi d'une boîte e-mail (COURRIER_HOTE, COURRIER_PORT, COURRIER_UTILISATEUR, COURRIER_MOT_DE_PASSE, COURRIER_DE ;
 * COURRIER=journal les écrit dans le journal au lieu de les envoyer, pour essayer).
 *
 *   PORT=8080 ORIGINES=https://honear.fr node serveur.mjs
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hitParade } from '../regles/partie';
import { APPLICATION, META_DE_LA_VERSION, PAGES_LEGALES } from '../ressources/reglages';
import { RESEAU } from '../ressources/reseau';
import type { Textes } from '../ressources/textes';
import { demarrerLeServeur } from '../serveur/serveur';
import { API_DE_DEEZER } from '../serveur/sources/deezer';
import { PAGES_DE_SPOTIFY } from '../serveur/sources/spotify';
import { PISTES_D_ESSAI, PLAYLIST_D_ESSAI } from '../serveur/sources/essai';
import { adresseEmail, enHtml, lettreDAvertissement, lettreDuLien, ouvrirLesComptes, type Comptes } from './comptes';
import { posterParSmtp, type ConfigurationDuCourrier, type Poster } from './courrier';
import { dateDuCourrier, heureDuMonde, horlogeDuServeur } from './horloge';
import { ouvrirLaLigne } from './ligne';
import { brancherLaMusique, type Musique } from './musique';
import { ouvrirLaPorte } from './porte';

/** Un tirage de zéro à un, pris au hasard du système : celui des codes de room et des leurres. */
const tirage = (): number => randomBytes(4).readUInt32BE(0) / 2 ** 32;

/** Les textes du compte, pour les lettres : c'est la construction du serveur qui les y met (voir outils/construire.ts). */
declare const TEXTES_DU_COMPTE: Textes['compte'] | undefined;
/** Ce que les pages légales disent quand on ne connaît pas d'adresse où écrire : la construction du serveur l'y met aussi. */
declare const TEXTES_DU_CONTACT: string | undefined;

/** Ce que le site lit dans son environnement. */
export interface ConfigurationDuSite {
  readonly port: number;
  readonly hote: string;
  readonly origines: readonly string[];
  readonly page: string;
  /** L'API de Deezer ; rien : le site ne joue que sa playlist d'essai. */
  readonly deezer: string | undefined;
  /** Le site des pages publiques de Spotify. */
  readonly spotify?: string;
  /** L'adresse où écrire à l'éditeur, que disent les pages légales (CONTACT, sinon celle qui envoie les liens des comptes). */
  readonly contact?: string;
  /**
   * Les comptes : le fichier où ils se gardent, l'adresse publique du site (celle des liens), le serveur d'envoi des lettres (rien :
   * les comptes sont fermés ; « journal » : les liens s'écrivent dans le journal du serveur), et les textes des lettres. Rien : pas de comptes.
   */
  readonly comptes?: {
    readonly fichier: string;
    readonly site: string;
    readonly courrier: ConfigurationDuCourrier | 'journal' | undefined;
    readonly textes: Textes['compte'];
  };
}

function configuration(): ConfigurationDuSite {
  const ici = dirname(fileURLToPath(import.meta.url));
  const deezer = process.env['DEEZER'] ?? API_DE_DEEZER;
  const spotify = process.env['SPOTIFY'] ?? PAGES_DE_SPOTIFY;
  const origines = (process.env['ORIGINES'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');
  const courrier = courrierDeLEnvironnement();
  // L'adresse qui envoie les liens, sans le nom qui la précède.
  const contact = process.env['CONTACT'] ?? (typeof courrier === 'object' && courrier.de !== '' ? adresseEmailDe(courrier.de) : undefined);
  return {
    ...(contact !== undefined ? { contact } : {}),
    port: Number(process.env['PORT'] ?? 8080),
    hote: process.env['HOTE'] ?? '127.0.0.1',
    origines,
    page: process.env['PAGE'] ?? join(ici, 'index.html'),
    deezer: deezer === 'non' ? undefined : deezer.replace(/\/+$/, ''),
    spotify: spotify.replace(/\/+$/, ''),
    ...(typeof TEXTES_DU_COMPTE !== 'undefined' && TEXTES_DU_COMPTE !== undefined
      ? {
          comptes: {
            fichier: process.env['COMPTES'] ?? join(ici, 'comptes.json'),
            site: process.env['SITE'] ?? origines[0] ?? 'http://localhost:8080',
            courrier,
            textes: TEXTES_DU_COMPTE,
          },
        }
      : {}),
  };
}

/** L'adresse e-mail d'un expéditeur, qu'il s'écrive seul ou avec un nom (« Honear <bonjour@…> »). */
const adresseEmailDe = (de: string): string => /<([^<>]+)>/.exec(de)?.[1] ?? de;

/** L'expéditeur des lettres : le nom du site, que les textes donnent, devant l'adresse qui les envoie ; l'adresse seule sans eux. */
function expediteur(de: string): string {
  const nom = typeof TEXTES_DU_COMPTE !== 'undefined' && TEXTES_DU_COMPTE !== undefined ? TEXTES_DU_COMPTE.courrier.signature : undefined;
  return nom !== undefined ? `${nom} <${adresseEmailDe(de)}>` : de;
}

/** Le serveur d'envoi, d'après l'environnement : rien s'il n'est pas dit ; « journal » pour écrire les liens au lieu de les envoyer. */
function courrierDeLEnvironnement(): ConfigurationDuCourrier | 'journal' | undefined {
  const env = process.env;
  if (env['COURRIER'] === 'journal') return 'journal';
  const hote = env['COURRIER_HOTE'];
  if (hote === undefined || hote === '') return undefined;
  const utilisateur = env['COURRIER_UTILISATEUR'] ?? '';
  return {
    hote,
    port: Number(env['COURRIER_PORT'] ?? 465),
    utilisateur,
    motDePasse: env['COURRIER_MOT_DE_PASSE'] ?? '',
    de: expediteur(env['COURRIER_DE'] ?? utilisateur),
    patience: RESEAU.comptes.patience * 1000,
  };
}

/**
 * Les comptes, gardés dans leur fichier : relu au démarrage, réécrit en entier à chaque changement (dans un fichier à côté, puis mis
 * à sa place d'un coup : un arrêt en pleine écriture ne l'abîme pas). Si on ne peut pas l'écrire, les comptes vivent en mémoire, et
 * on le dit une fois.
 */
function comptesDansUnFichier(c: NonNullable<ConfigurationDuSite['comptes']>): Comptes {
  let dit = false;
  const poster: Poster | undefined =
    c.courrier === 'journal'
      ? async (lettre) => {
          console.log(`Lien de connexion pour ${lettre.a} : ${/https?:\/\/\S+#connexion=\S+/.exec(lettre.texte)?.[0] ?? ''}`);
        }
      : c.courrier !== undefined
        ? posterParSmtp(c.courrier, dateDuCourrier)
        : undefined;
  return ouvrirLesComptes({
    monde: heureDuMonde,
    secret: () => randomBytes(32).toString('base64url'),
    identifiant: () => randomBytes(9).toString('base64url'),
    empreinte: (secret) => createHash('sha256').update(secret).digest('hex'),
    lu: existsSync(c.fichier) ? readFileSync(c.fichier, 'utf8') : undefined,
    garder(texte) {
      try {
        mkdirSync(dirname(c.fichier), { recursive: true });
        writeFileSync(`${c.fichier}.neuf`, texte, { mode: 0o600 });
        renameSync(`${c.fichier}.neuf`, c.fichier);
      } catch (erreur) {
        if (!dit) console.error(`Les comptes ne s'écrivent pas dans ${c.fichier} : ${String(erreur)}`);
        dit = true;
      }
    },
    poster,
    lettre: lettreDuLien(c.textes.courrier, c.site),
    avertissement: lettreDAvertissement(c.textes.courrier, c.site),
  });
}

/**
 * Les pages légales, lues à côté de la page du jeu (« /confidentialite » dans confidentialite.html), l'adresse du site et celle où
 * écrire à l'éditeur écrites dedans. Celles qui manquent ne sont pas servies.
 */
function pagesLegales(c: ConfigurationDuSite): Record<string, string> {
  const site = (c.comptes?.site ?? c.origines[0] ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const contact = c.contact ?? (typeof TEXTES_DU_CONTACT !== 'undefined' ? TEXTES_DU_CONTACT : undefined) ?? '';
  const pages: Record<string, string> = {};
  for (const chemin of Object.values(PAGES_LEGALES)) {
    const fichier = join(dirname(c.page), `${chemin.slice(1)}.html`);
    if (!existsSync(fichier)) continue;
    pages[chemin] = readFileSync(fichier, 'utf8')
      .replace(/\{site\}/g, enHtml(site))
      .replace(/\{contact\}/g, enHtml(contact));
  }
  return pages;
}

/** Le manifeste et l'icône de l'application, fabriqués à côté de la page : par leur adresse, avec leur type. */
function fichiersDeLApplication(c: ConfigurationDuSite): Record<string, { readonly type: string; readonly contenu: string }> {
  const types = { [APPLICATION.manifeste]: 'application/manifest+json; charset=utf-8', [APPLICATION.icone]: 'image/svg+xml' };
  const fichiers: Record<string, { readonly type: string; readonly contenu: string }> = {};
  for (const [chemin, type] of Object.entries(types)) {
    const fichier = join(dirname(c.page), chemin.slice(1));
    if (existsSync(fichier)) fichiers[chemin] = { type, contenu: readFileSync(fichier, 'utf8') };
  }
  return fichiers;
}

/** Entre deux ménages des comptes, en millisecondes. */
const MENAGE = RESEAU.comptes.inactif.menage * 1000;

/** Ce qu'on laisse à Deezer, à Spotify, pour répondre, en millisecondes. */
const PATIENCE = RESEAU.deezer.attente * 1000;
const PATIENCE_DE_SPOTIFY = RESEAU.spotify.attente * 1000;

/** Une playlist Spotify nommée dans une page : ce qu'un lien court montre quand il ne redirige pas tout de suite. */
const PLAYLIST_SPOTIFY_DANS_UNE_PAGE = /https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/[A-Za-z0-9]{22}/;

/**
 * La musique, par le réseau : chaque appel à Deezer, chaque page de Spotify, est une requête HTTPS, abandonnée si elle tarde.
 * @param ailleurs d'autres adresses pour l'API de Deezer et le site de Spotify : de faux, pour essayer le site sans eux.
 */
function musiqueEnLigne(ailleurs: { readonly deezer: string; readonly spotify: string }, maintenant: () => number): Musique {
  const vers = (adresse: string): string =>
    adresse.startsWith(API_DE_DEEZER)
      ? ailleurs.deezer + adresse.slice(API_DE_DEEZER.length)
      : adresse.startsWith(PAGES_DE_SPOTIFY)
        ? ailleurs.spotify + adresse.slice(PAGES_DE_SPOTIFY.length)
        : adresse;
  return brancherLaMusique({
    async lire(adresse) {
      const reponse = await fetch(vers(adresse), { signal: AbortSignal.timeout(PATIENCE), headers: { accept: 'application/json' } });
      return (await reponse.json()) as unknown;
    },
    async page(adresse) {
      const reponse = await fetch(vers(adresse), {
        signal: AbortSignal.timeout(PATIENCE_DE_SPOTIFY),
        headers: { accept: 'text/html', 'accept-language': 'fr-FR,fr;q=0.9' },
      });
      return reponse.ok ? await reponse.text() : '';
    },
    async suivre(adresse) {
      const reponse = await fetch(adresse, { redirect: 'follow', signal: AbortSignal.timeout(PATIENCE) });
      // Certains liens courts ne redirigent pas : ils montrent une page qui nomme la playlist.
      const nommee = reponse.url === adresse ? PLAYLIST_SPOTIFY_DANS_UNE_PAGE.exec(await reponse.text())?.[0] : undefined;
      if (nommee === undefined) await reponse.body?.cancel();
      return nommee ?? reponse.url;
    },
    maintenant,
    monde: heureDuMonde,
    attendre: (secondes) =>
      new Promise<void>((fini) => {
        const duree = Math.max(0, secondes) * 1000;
        setTimeout(fini, duree);
      }),
  });
}

/** L'adresse d'un navigateur : celle que le relais a vue (le premier « X-Forwarded-For »), sinon celle de la prise. */
function adresseDe(requete: IncomingMessage): string {
  const relayee = requete.headers['x-forwarded-for'];
  const premiere = (Array.isArray(relayee) ? relayee[0] : relayee)?.split(',')[0]?.trim();
  return premiere !== undefined && premiere !== '' ? premiere : (requete.socket.remoteAddress ?? '');
}

/** Le site lancé : le port où il écoute, une fois qu'il écoute, et de quoi l'arrêter. */
export interface SiteLance {
  readonly pret: Promise<number>;
  readonly fermer: () => Promise<void>;
}

export function lancerLeSite(c: ConfigurationDuSite): SiteLance {
  const maintenant = horlogeDuServeur();
  const musique = c.deezer !== undefined ? musiqueEnLigne({ deezer: c.deezer, spotify: c.spotify ?? PAGES_DE_SPOTIFY }, maintenant) : undefined;
  const comptes = c.comptes !== undefined ? comptesDansUnFichier(c.comptes) : undefined;
  // Le ménage des comptes qui dorment : au démarrage, puis une fois par jour.
  const faireLeMenage = (): void => void comptes?.entretenir();
  faireLeMenage();
  const menage = comptes !== undefined ? setInterval(faireLeMenage, MENAGE) : undefined;
  menage?.unref();
  const serveur = demarrerLeServeur({
    maintenant,
    tirage,
    jeton: () => randomBytes(18).toString('base64url'),
    // La playlist d'essai est toujours là ; les autres, la musique les a lues avant que la room en ait besoin.
    playlist: (lien) => (lien === PLAYLIST_D_ESSAI ? PISTES_D_ESSAI : musique?.pistes(lien)),
    // Une face finie : ceux qui jouaient sous un compte y comptent une partie ; le premier (s'il a marqué), une victoire.
    quandUneFaceFinit: (code, etat) =>
      comptes?.faceFinie(
        code,
        hitParade(etat)
          .filter(({ joueur }) => !joueur.spectateur)
          .map(({ joueur, rang }) => ({ joueur: joueur.id, premier: rang === 1 && joueur.points > 0 })),
      ),
  });

  // La minuterie : le serveur dit l'heure de son prochain rendez-vous ; on dort jusque-là, jamais plus d'une seconde.
  let reveil: NodeJS.Timeout | undefined;
  let ferme = false;
  const avancer = (): void => {
    if (reveil !== undefined) clearTimeout(reveil);
    // Une ligne qui se ferme après l'arrêt du site ne relance pas la minuterie.
    if (ferme) return;
    const prochain = serveur.avancer();
    const attente = Math.max(0, Math.min(RESEAU.minuterieAuPlus, (prochain ?? Infinity) - maintenant())) * 1000;
    reveil = setTimeout(avancer, attente);
  };

  const page = readFileSync(c.page, 'utf8');
  // La version de la page, qu'elle porte dans son en-tête (voir la construction) : la ligne la compare à celle des pages qui se branchent.
  const version = new RegExp(`<meta name="${META_DE_LA_VERSION}" content="([^"]+)">`).exec(page)?.[1];
  const ligne = ouvrirLaLigne({
    serveur,
    ...(version !== undefined ? { version } : {}),
    maintenant,
    origines: c.origines,
    aChaqueAction: avancer,
    adresseDe,
    ...(musique !== undefined ? { musique } : {}),
    ...(comptes !== undefined ? { comptes } : {}),
  });
  const http = createServer(
    ouvrirLaPorte({
      page,
      legales: pagesLegales(c),
      fichiers: fichiersDeLApplication(c),
      // Ce que le site dit de lui-même : de quoi vérifier une mise en place d'un coup d'œil.
      sante: () => ({
        rooms: serveur.rooms,
        telephones: ligne.branches,
        musique: musique !== undefined,
        comptes: c.comptes === undefined ? 'absents' : c.comptes.courrier === undefined ? 'fermes' : 'ouverts',
      }),
    }),
  );
  http.on('upgrade', (requete, prise, debut) => ligne.accueillir(requete, prise, debut));
  const pret = new Promise<number>((ecoute) =>
    http.listen(c.port, c.hote, () => {
      const adresse = http.address();
      ecoute(typeof adresse === 'object' && adresse !== null ? adresse.port : c.port);
    }),
  );
  avancer();
  return {
    pret,
    fermer: () =>
      new Promise<void>((fini) => {
        ferme = true;
        if (reveil !== undefined) clearTimeout(reveil);
        if (menage !== undefined) clearInterval(menage);
        ligne.fermer();
        http.close(() => fini());
        // Les navigateurs gardent leurs connexions ouvertes pour la suite : on ne les attend pas.
        http.closeAllConnections();
      }),
  };
}

/**
 * Envoie un e-mail d'essai par le serveur d'envoi de la configuration : la mise en place s'assure ainsi que les liens partiront.
 * @returns le code de sortie : zéro s'il est parti.
 */
async function essayerLeCourrier(c: ConfigurationDuSite, a: string | undefined): Promise<number> {
  const courrier = c.comptes?.courrier;
  if (c.comptes === undefined || courrier === undefined) {
    console.error('Pas de serveur d’envoi : remplis /etc/honear/courrier.env (COURRIER_HOTE, COURRIER_UTILISATEUR…).');
    return 1;
  }
  if (courrier === 'journal') {
    console.log('COURRIER=journal : les liens s’écrivent dans le journal du serveur, aucun e-mail ne part.');
    return 0;
  }
  const email = adresseEmail(a ?? '');
  if (email === undefined) {
    console.error('Donne une adresse : node serveur.mjs --essai-courrier toi@exemple.fr');
    return 1;
  }
  const T = c.comptes.textes.courrier;
  try {
    await posterParSmtp(
      courrier,
      dateDuCourrier,
    )({
      a: email,
      sujet: T.essaiSujet,
      texte: `${T.essai}\n\n— ${T.signature}\n`,
      html: `<p>${enHtml(T.essai)}</p><p>— ${enHtml(T.signature)}</p>`,
    });
    console.log(`L’e-mail d’essai est parti à ${email}, par ${courrier.hote}.`);
    return 0;
  } catch (erreur) {
    console.error(`L’e-mail d’essai n’est pas parti : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    return 1;
  }
}

// Lancé tel quel (node serveur.mjs), il démarre ; importé (par les tests), il attend qu'on le lance.
// « node serveur.mjs --essai-courrier toi@exemple.fr [courrier.env] » envoie un e-mail d'essai, et s'arrête.
// Un troisième mot, s'il y en a un, est un fichier de réglages du courrier, lu comme Docker lit le sien ; sans lui, l'environnement.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === '--essai-courrier') {
  const reglages = process.argv[4];
  if (reglages !== undefined) process.loadEnvFile(reglages);
  void essayerLeCourrier(configuration(), process.argv[3]).then((code) => process.exit(code));
} else if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const c = configuration();
  const site = lancerLeSite(c);
  void site.pret.then((port) =>
    console.log(`Honear écoute sur http://${c.hote}:${port}${c.origines.length > 0 ? `, pour ${c.origines.join(', ')}` : ''}`),
  );
  // Arrêté par Docker (une mise en ligne, un redémarrage) : il ferme ses lignes proprement.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void site.fermer().then(() => process.exit(0)));
}

export { configuration };
